/* One-shot helper: drop the duplicate_detection_index Atlas Search index.
 *
 * Use when the existing index is in a FAILED state (e.g. after an invalid
 * mapping update) and needs to be recreated from scratch. The server's
 * `ensureDuplicateSearchIndex()` will rebuild it on the next start.
 *
 * Usage:
 *   cd server
 *   npx ts-node-dev --transpile-only scripts/dropDuplicateSearchIndex.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import {
  DUPLICATE_SEARCH_INDEX_NAME,
  REPORTS_COLLECTION_NAME,
} from '../src/config/searchIndexes';

async function main() {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) throw new Error('MONGO_URI is not set.');

  await mongoose.connect(uri);
  console.log(`[drop-search-index] connected to ${mongoose.connection.host}`);

  const collection = mongoose.connection.db!.collection(REPORTS_COLLECTION_NAME);

  try {
    await (collection as any).dropSearchIndex(DUPLICATE_SEARCH_INDEX_NAME);
    console.log(
      `[drop-search-index] dropped "${DUPLICATE_SEARCH_INDEX_NAME}" — bootstrap will recreate it on next server start.`
    );
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (/IndexNotFound|index not found|does not exist/i.test(msg)) {
      console.log(`[drop-search-index] index "${DUPLICATE_SEARCH_INDEX_NAME}" did not exist — nothing to drop.`);
    } else {
      console.error('[drop-search-index] drop failed:', msg);
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('[drop-search-index] fatal:', err);
  process.exit(1);
});
