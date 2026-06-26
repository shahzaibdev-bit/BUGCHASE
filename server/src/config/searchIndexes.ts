/* -------------------------------------------------------------------------- */
/*               MongoDB Atlas Search index bootstrap                         */
/* -------------------------------------------------------------------------- */
/*  One-time, idempotent setup of the Atlas Search index used by the          */
/*  duplicate detection pipeline. Called from server/src/config/db.ts right   */
/*  after the mongoose connection opens.                                      */
/*                                                                            */
/*  Atlas Search is the BugChase duplicate-detection backend. The index is   */
/*  built and synced automatically by the Atlas cluster, so application code  */
/*  only needs one Mongo write per report — Atlas takes care of extracting    */
/*  the indexed fields.                                                       */
/* -------------------------------------------------------------------------- */

import mongoose from 'mongoose';

export const DUPLICATE_SEARCH_INDEX_NAME = 'duplicate_detection_index';
export const REPORTS_COLLECTION_NAME = 'reports';

/**
 * Conceptual → physical field mapping:
 *   spec name              actual Report schema field
 *   --------------------   ---------------------------
 *   vulnerable_endpoint  → vulnerableEndpoint
 *   bug_category         → vrtVariant (preferred) / vulnerabilityCategory (legacy)
 *   vrt_parent           → vrtParent
 *   vrt_category         → vrtCategory
 *   vrt_variant          → vrtVariant
 *   title                → title
 *
 * `dynamic: false` keeps the index small and predictable.
 *
 * `vulnerableEndpoint` is indexed with two analyzers using Atlas Search's
 * `multi` syntax:
 *   - default (lucene.keyword)              → strict exact-endpoint matching
 *   - vulnerableEndpoint.standard (tokens)  → broad fallback text matching
 * Atlas Search rejects the array-of-types form, hence the `multi` block.
 *
 * `vrtVariant` and `vulnerabilityCategory` are keyword-only for strict category match.
 * `vrtParent` / `vrtCategory` support hierarchical filtering when needed.
 * `title` uses the default analyzer for fuzzy fallback text matching.
 */
const DUPLICATE_SEARCH_INDEX_DEFINITION = {
  mappings: {
    dynamic: false,
    fields: {
      vulnerableEndpoint: {
        type: 'string',
        analyzer: 'lucene.keyword',
        searchAnalyzer: 'lucene.keyword',
        multi: {
          standard: {
            type: 'string',
            analyzer: 'lucene.standard',
            searchAnalyzer: 'lucene.standard',
          },
        },
      },
      vulnerabilityCategory: {
        type: 'string',
        analyzer: 'lucene.keyword',
        searchAnalyzer: 'lucene.keyword',
      },
      vrtParent: {
        type: 'string',
        analyzer: 'lucene.keyword',
        searchAnalyzer: 'lucene.keyword',
      },
      vrtCategory: {
        type: 'string',
        analyzer: 'lucene.keyword',
        searchAnalyzer: 'lucene.keyword',
      },
      vrtVariant: {
        type: 'string',
        analyzer: 'lucene.keyword',
        searchAnalyzer: 'lucene.keyword',
      },
      title: { type: 'string' },
      programId: {
        type: 'string',
        analyzer: 'lucene.keyword',
        searchAnalyzer: 'lucene.keyword',
      },
      status: {
        type: 'string',
        analyzer: 'lucene.keyword',
        searchAnalyzer: 'lucene.keyword',
      },
    },
  },
} as const;

let bootstrapPromise: Promise<void> | null = null;

/**
 * Create (or confirm) the Atlas Search index for the reports collection.
 * Safe to call repeatedly — work runs at most once per process.
 *
 * Failure modes are all non-fatal:
 *  - `IndexAlreadyExists`   → log and continue.
 *  - SrvSelector / unsupported (e.g. shared-tier cluster has no Atlas Search)
 *    → log a warning and continue. The pipeline falls back to plain Mongo
 *      reads in that case.
 */
export async function ensureDuplicateSearchIndex(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const conn = mongoose.connection;
    if (!conn?.db) {
      console.warn(
        '[atlas-search] mongoose connection has no .db handle — skipping index bootstrap.'
      );
      return;
    }

    const collection = conn.db.collection(REPORTS_COLLECTION_NAME);

    try {
      await collection.createSearchIndex({
        name: DUPLICATE_SEARCH_INDEX_NAME,
        definition: DUPLICATE_SEARCH_INDEX_DEFINITION,
      } as any);
      console.log(
        `[atlas-search] created search index "${DUPLICATE_SEARCH_INDEX_NAME}" on reports.`
      );
    } catch (error: any) {
      const codeName = error?.codeName || error?.cause?.codeName;
      const message = String(error?.message || error?.errmsg || '');

      if (
        codeName === 'IndexAlreadyExists' ||
        /index already exists/i.test(message)
      ) {
        console.log(
          `[atlas-search] index "${DUPLICATE_SEARCH_INDEX_NAME}" already exists — continuing.`
        );
        return;
      }

      if (
        codeName === 'SearchNotEnabled' ||
        /search.*not.*enabled|atlas search/i.test(message) ||
        /CommandNotSupported/i.test(codeName || '')
      ) {
        console.warn(
          `[atlas-search] Atlas Search is not enabled on this cluster. ` +
            `Duplicate detection will fall back to plain Mongo reads. (${message})`
        );
        return;
      }

      console.warn(
        `[atlas-search] could not create search index "${DUPLICATE_SEARCH_INDEX_NAME}": ${message}`
      );
    }
  })().catch((err) => {
    bootstrapPromise = null;
    console.error('[atlas-search] unexpected bootstrap failure:', err);
  });

  return bootstrapPromise;
}
