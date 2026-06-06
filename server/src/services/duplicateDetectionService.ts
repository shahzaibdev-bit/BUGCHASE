import mongoose from 'mongoose';
import Report from '../models/Report';
import { DUPLICATE_SEARCH_INDEX_NAME } from '../config/searchIndexes';
import {
  DuplicateLlmVerdict,
  isDuplicateLlmEnabled,
  runDuplicateLlmAnalysis,
} from './duplicateLlmService';

/* -------------------------------------------------------------------------- */
/*                                Tunables                                    */
/* -------------------------------------------------------------------------- */

const TOP_K = Math.max(1, Math.min(10, Number(process.env.DUPLICATE_SEARCH_TOP_K || 5)));
const OVERFETCH = Math.max(TOP_K * 4, 20); // Atlas Search pre-filter overshoot

const HYDRATE_FIELDS =
  '_id reportId title vulnerabilityCategory vulnerableEndpoint description pocSteps impact severity status programId createdAt';

/* -------------------------------------------------------------------------- */
/*                          Normalisation utilities                           */
/* -------------------------------------------------------------------------- */

const normalize = (text: string) => String(text || '').replace(/\s+/g, ' ').trim();

export const stripHtmlForEmbedding = (raw: unknown): string => {
  const s = String(raw ?? '');
  return normalize(s.replace(/<[^>]+>/g, ' '));
};

/**
 * Normalise a vulnerable-endpoint URL into a comparable shape:
 *  - strip protocol/host if present
 *  - lowercase
 *  - collapse common dynamic ID segments (UUID, ObjectId, numeric) to placeholders
 *  - extract distinct query-parameter names
 */
export function normalizeEndpoint(rawEndpoint: unknown): {
  raw: string;
  path: string;
  queryParams: string[];
} {
  const raw = String(rawEndpoint ?? '').trim();
  if (!raw) return { raw: '', path: '', queryParams: [] };

  let pathname = raw;
  let search = '';
  try {
    const probe = raw.match(/^https?:\/\//i)
      ? raw
      : `http://placeholder.local${raw.startsWith('/') ? '' : '/'}${raw}`;
    const url = new URL(probe);
    pathname = url.pathname || '/';
    search = url.search || '';
  } catch {
    const qIdx = raw.indexOf('?');
    if (qIdx >= 0) {
      pathname = raw.slice(0, qIdx);
      search = raw.slice(qIdx);
    }
  }

  const path =
    pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
      .replace(/\/[0-9a-f]{24}\b/gi, '/:objectid')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/+/g, '/')
      .replace(/\/+$/, '')
      .toLowerCase() || '/';

  const queryParams: string[] = [];
  if (search) {
    try {
      const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
      for (const [k] of params) {
        const key = k.toLowerCase();
        if (key && !queryParams.includes(key)) queryParams.push(key);
      }
    } catch {
      /* ignore malformed query strings */
    }
  }

  return { raw, path, queryParams };
}

function pickPrimaryParameter(report: any, endpointParams: string[]): string {
  if (endpointParams.length) return endpointParams[0];
  const candidates = [report?.parameter, report?.parameterName, report?.parameter_name];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim().toLowerCase();
  }
  return '';
}

function pickBugCategory(report: any): string {
  const candidates = [report?.vulnerabilityCategory, report?.bug_category, report?.bugCategory];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

/* -------------------------------------------------------------------------- */
/*                Atlas Search aggregation – step 3 of the spec               */
/* -------------------------------------------------------------------------- */

export interface DuplicateMatch {
  report_id: string;
  score: number;
  source: 'strict' | 'fallback';
  metadata?: Record<string, any>;
}

/** Detect transport-level / aggregation errors so callers can fall back safely. */
function isAtlasSearchUnavailableError(error: unknown): boolean {
  const err = error as { code?: number; codeName?: string; message?: string };
  if (!err) return false;
  const msg = String(err.message || '');
  if (err.codeName === 'SearchNotEnabled') return true;
  if (/atlas search|\$search.*not allowed|searchNotEnabled/i.test(msg)) return true;
  if (/index.*not.*found|no such index/i.test(msg)) return true;
  if (err.code === 13 /* Unauthorized */) return true;
  if (err.code === 31082 /* PlanExecutionError for missing index */) return true;
  return false;
}

/**
 * Run the Atlas Search compound query against the reports collection.
 *
 *   1. Strict: exact endpoint AND exact category
 *   2. Fallback: broad endpoint match OR (title text + endpoint prefix)
 *
 * Always filters out:
 *   - the report itself
 *   - reports from other programs
 *   - reports already marked Duplicate / Spam
 *   - reports submitted at or after the new report (the report can only
 *     duplicate something that was filed *before* it)
 */
export const searchDuplicateCandidates = async (
  report: any,
  options: { topK?: number } = {}
): Promise<DuplicateMatch[]> => {
  const topK = Math.max(1, Math.min(10, options.topK || TOP_K));
  const selfObjectId = (() => {
    try {
      return new mongoose.Types.ObjectId(String(report._id));
    } catch {
      return null;
    }
  })();

  const programIdRaw = report.programId ?? '';
  const programIdObj = (() => {
    if (programIdRaw instanceof mongoose.Types.ObjectId) return programIdRaw;
    try {
      return new mongoose.Types.ObjectId(String(programIdRaw));
    } catch {
      return null;
    }
  })();
  const programIdMatch: any[] = [];
  if (programIdRaw) programIdMatch.push(String(programIdRaw));
  if (programIdObj) programIdMatch.push(programIdObj);

  const { raw: rawEndpoint, path: normalizedPath } = normalizeEndpoint(
    report.vulnerableEndpoint
  );
  const bugCategory = pickBugCategory(report);
  const title = String(report.title || '').trim();
  const endpointPrefix = normalizedPath
    ? normalizedPath.split('/').slice(0, 3).filter(Boolean).join('/')
    : '';

  const selfSubmittedAt = report.createdAt ? new Date(report.createdAt) : new Date();

  const buildPostFilter = () => {
    const filter: any = {
      status: { $nin: ['Duplicate', 'Spam'] },
      createdAt: { $lt: selfSubmittedAt },
    };
    if (selfObjectId) filter._id = { $ne: selfObjectId };
    if (programIdMatch.length) filter.programId = { $in: programIdMatch };
    return filter;
  };

  const projectStage = {
    $project: {
      _id: 1,
      reportId: 1,
      title: 1,
      vulnerabilityCategory: 1,
      vulnerableEndpoint: 1,
      pocSteps: 1,
      impact: 1,
      programId: 1,
      status: 1,
      createdAt: 1,
      score: { $meta: 'searchScore' },
    },
  };

  /* ---- 1) Strict: endpoint + category --------------------------------- */
  if (rawEndpoint && bugCategory) {
    const strictPipeline: any[] = [
      {
        $search: {
          index: DUPLICATE_SEARCH_INDEX_NAME,
          compound: {
            must: [
              { text: { path: 'vulnerableEndpoint', query: rawEndpoint } },
              { text: { path: 'vulnerabilityCategory', query: bugCategory } },
            ],
          },
        },
      },
      { $limit: OVERFETCH },
      { $match: buildPostFilter() },
      { $limit: topK },
      projectStage,
    ];

    try {
      const strictResults = await Report.collection
        .aggregate(strictPipeline, { allowDiskUse: false })
        .toArray();
      if (strictResults.length > 0) {
        return strictResults.map((doc: any) => ({
          report_id: String(doc._id),
          score: Number(doc.score || 0),
          source: 'strict' as const,
          metadata: doc,
        }));
      }
    } catch (err) {
      if (!isAtlasSearchUnavailableError(err)) {
        console.error('[duplicate-detection] strict $search failed:', err);
      } else {
        console.warn(
          '[duplicate-detection] Atlas Search unavailable, skipping strict pass.'
        );
        return [];
      }
    }
  }

  /* ---- 2) Fallback: broad endpoint OR (title + endpoint prefix) --------
   * Uses the tokenized multi-analyzer field (`vulnerableEndpoint.standard`)
   * so partial paths / prefixes can match individual URL segments. */
  const should: any[] = [];
  if (rawEndpoint) {
    should.push({ text: { path: 'vulnerableEndpoint.standard', query: rawEndpoint } });
  }
  if (endpointPrefix) {
    should.push({ text: { path: 'vulnerableEndpoint.standard', query: endpointPrefix } });
  }
  if (title) {
    should.push({ text: { path: 'title', query: title } });
  }
  if (!should.length) return [];

  const fallbackPipeline: any[] = [
    {
      $search: {
        index: DUPLICATE_SEARCH_INDEX_NAME,
        compound: { should, minimumShouldMatch: 1 },
      },
    },
    { $limit: OVERFETCH },
    { $match: buildPostFilter() },
    { $limit: topK },
    projectStage,
  ];

  try {
    const fallbackResults = await Report.collection
      .aggregate(fallbackPipeline, { allowDiskUse: false })
      .toArray();
    return fallbackResults.map((doc: any) => ({
      report_id: String(doc._id),
      score: Number(doc.score || 0),
      source: 'fallback' as const,
      metadata: doc,
    }));
  } catch (err) {
    if (!isAtlasSearchUnavailableError(err)) {
      console.error('[duplicate-detection] fallback $search failed:', err);
    } else {
      console.warn(
        '[duplicate-detection] Atlas Search unavailable for fallback pass.'
      );
    }
    return [];
  }
};

/* -------------------------------------------------------------------------- */
/*                            Mongo hydration                                 */
/* -------------------------------------------------------------------------- */

interface HydratedCandidate {
  _id: mongoose.Types.ObjectId;
  report_id: string;
  reportId?: string | null;
  programId?: string;
  status?: string;
  title?: string;
  bug_category?: string;
  vulnerable_endpoint?: string;
  parameter?: string;
  steps_to_reproduce?: string;
  impact?: string;
  payload?: string;
  createdAt?: Date;
  searchScore: number;
  searchSource: 'strict' | 'fallback';
}

async function hydrateCandidatesFromMongo(
  matches: DuplicateMatch[],
  selfReport: any
): Promise<HydratedCandidate[]> {
  if (!matches.length) return [];

  // The $search pipeline already projected the contextual fields we need,
  // so most of the time we can build the hydrated payload directly from
  // `match.metadata`. Fall back to a re-fetch only if metadata is missing.
  const missingIds: mongoose.Types.ObjectId[] = [];
  for (const m of matches) {
    if (!m.metadata?.title) {
      try {
        missingIds.push(new mongoose.Types.ObjectId(m.report_id));
      } catch {
        /* skip */
      }
    }
  }

  let metaById = new Map<string, any>();
  if (missingIds.length) {
    const docs = await Report.find({ _id: { $in: missingIds } })
      .select(HYDRATE_FIELDS)
      .lean();
    metaById = new Map(docs.map((d: any) => [String(d._id), d]));
  }

  const selfMs = reportSubmittedAtMs(selfReport);
  const result: HydratedCandidate[] = [];

  for (const m of matches) {
    const doc: any = m.metadata?.title ? m.metadata : metaById.get(m.report_id);
    if (!doc) continue;
    if (['Duplicate', 'Spam'].includes(doc.status)) continue;
    if (
      String(doc.programId ?? '').trim() !==
      String(selfReport.programId ?? '').trim()
    ) {
      continue;
    }
    const candidateMs = reportSubmittedAtMs(doc);
    if (candidateMs >= selfMs) continue;

    const { queryParams } = normalizeEndpoint(doc.vulnerableEndpoint);

    result.push({
      _id: doc._id,
      report_id: String(doc._id),
      reportId: doc.reportId,
      programId: doc.programId ? String(doc.programId) : undefined,
      status: doc.status,
      title: doc.title,
      bug_category: doc.vulnerabilityCategory,
      vulnerable_endpoint: doc.vulnerableEndpoint,
      parameter: pickPrimaryParameter(doc, queryParams) || undefined,
      steps_to_reproduce: doc.pocSteps,
      impact: doc.impact,
      payload: undefined,
      createdAt: doc.createdAt,
      searchScore: m.score,
      searchSource: m.source,
    });
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/*                                Pipeline                                    */
/* -------------------------------------------------------------------------- */

export type DuplicateCandidatePayload = {
  reportMongoId: mongoose.Types.ObjectId;
  similarityScore: number;
  candidateReportId?: string;
  candidateTitle?: string;
  candidateSubmittedAt?: Date;
  detectedAt: Date;
  source: 'strict' | 'fallback' | 'llm';
};

export type DuplicateScanResult = {
  candidates: DuplicateCandidatePayload[];
  reviewStatus: 'pending' | 'not_applicable';
  aiAnalysis: {
    status: 'completed' | 'failed' | 'no_candidates' | 'skipped';
    isDuplicate: boolean;
    confidenceScore: number;
    primaryDuplicateId?: string | null;
    reasoning?: string;
    researcherCommunication?: string;
    error?: string;
    processedAt: Date;
  };
};

const reportSubmittedAtMs = (doc: any): number => {
  if (doc?.createdAt != null) {
    const t = new Date(doc.createdAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  try {
    const id = doc?._id;
    if (id instanceof mongoose.Types.ObjectId) return id.getTimestamp().getTime();
    return new mongoose.Types.ObjectId(String(id)).getTimestamp().getTime();
  } catch {
    return 0;
  }
};

function newReportForLlm(report: any): Record<string, any> {
  const { raw, queryParams } = normalizeEndpoint(report.vulnerableEndpoint);
  return {
    report_id: String(report._id),
    title: report.title,
    bug_category: pickBugCategory(report),
    vulnerable_endpoint: raw,
    parameter: pickPrimaryParameter(report, queryParams),
    steps_to_reproduce: stripHtmlForEmbedding(report.pocSteps),
    impact: stripHtmlForEmbedding(report.impact),
    payload: undefined,
  };
}

/**
 * The full 5-step duplicate-detection pipeline.
 *
 *   1. Atlas Search compound query (strict → fallback)
 *   2. Hydrate the small top-N from MongoDB
 *   3. Run local LLM deep reasoning via the duplicate_engine FastAPI service
 *   4. Map result → report metadata for the triager dashboard
 *   5. Fail-safe: any failure returns raw keyword matches instead of throwing
 */
export const runInitialDuplicateScanForNewReport = async (
  newReport: any
): Promise<DuplicateScanResult> => {
  const now = new Date();
  const failSafe = (extra?: Partial<DuplicateScanResult['aiAnalysis']>): DuplicateScanResult => ({
    candidates: [],
    reviewStatus: 'not_applicable',
    aiAnalysis: {
      status: 'failed',
      isDuplicate: false,
      confidenceScore: 0,
      primaryDuplicateId: null,
      processedAt: now,
      ...extra,
    },
  });

  let matches: DuplicateMatch[] = [];
  try {
    matches = await searchDuplicateCandidates(newReport, { topK: TOP_K });
  } catch (err) {
    console.error('[duplicate-detection] Atlas Search failed:', err);
    return failSafe({ error: 'Atlas Search unavailable' });
  }

  if (!matches.length) {
    return {
      candidates: [],
      reviewStatus: 'not_applicable',
      aiAnalysis: {
        status: 'no_candidates',
        isDuplicate: false,
        confidenceScore: 0,
        primaryDuplicateId: null,
        processedAt: now,
      },
    };
  }

  let hydrated: HydratedCandidate[] = [];
  try {
    hydrated = await hydrateCandidatesFromMongo(matches, newReport);
  } catch (err) {
    console.error('[duplicate-detection] mongo hydration failed:', err);
  }

  if (!hydrated.length) {
    return {
      candidates: [],
      reviewStatus: 'not_applicable',
      aiAnalysis: {
        status: 'no_candidates',
        isDuplicate: false,
        confidenceScore: 0,
        primaryDuplicateId: null,
        processedAt: now,
      },
    };
  }

  const rawCandidates: DuplicateCandidatePayload[] = hydrated.map((h) => ({
    reportMongoId: h._id,
    similarityScore: h.searchScore,
    candidateReportId: h.reportId || undefined,
    candidateTitle: h.title || undefined,
    candidateSubmittedAt: h.createdAt ? new Date(h.createdAt) : undefined,
    detectedAt: now,
    source: h.searchSource,
  }));

  if (!isDuplicateLlmEnabled()) {
    return {
      candidates: rawCandidates,
      reviewStatus: 'pending',
      aiAnalysis: {
        status: 'skipped',
        isDuplicate: false,
        confidenceScore: 0,
        primaryDuplicateId: null,
        processedAt: now,
      },
    };
  }

  let verdict: DuplicateLlmVerdict | null = null;
  let llmError: string | undefined;
  try {
    verdict = await runDuplicateLlmAnalysis(newReportForLlm(newReport), hydrated);
  } catch (err) {
    llmError = (err as Error)?.message || String(err);
    console.error(
      '[duplicate-detection] LLM failed, falling back to keyword matches:',
      llmError
    );
  }

  if (!verdict) {
    return {
      candidates: rawCandidates,
      reviewStatus: 'pending',
      aiAnalysis: {
        status: 'failed',
        isDuplicate: false,
        confidenceScore: 0,
        primaryDuplicateId: null,
        error: llmError || 'LLM unavailable',
        processedAt: now,
      },
    };
  }

  if (verdict.primary_duplicate_id) {
    const hasPrimary = rawCandidates.some(
      (c) => String(c.reportMongoId) === verdict!.primary_duplicate_id
    );
    if (hasPrimary) {
      rawCandidates.sort((a, b) => {
        if (String(a.reportMongoId) === verdict!.primary_duplicate_id) return -1;
        if (String(b.reportMongoId) === verdict!.primary_duplicate_id) return 1;
        return (b.similarityScore || 0) - (a.similarityScore || 0);
      });
    }
  }

  return {
    candidates: rawCandidates,
    reviewStatus: rawCandidates.length ? 'pending' : 'not_applicable',
    aiAnalysis: {
      status: 'completed',
      isDuplicate: !!verdict.is_duplicate,
      confidenceScore: verdict.confidence_score,
      primaryDuplicateId: verdict.primary_duplicate_id,
      reasoning: verdict.reasoning,
      researcherCommunication: verdict.researcher_communication,
      processedAt: now,
    },
  };
};

/**
 * Drop any duplicate candidates whose submitted_at is >= this report's
 * submitted_at. The new pipeline already enforces this, but the helper is
 * kept so historic rows persisted from the previous pipeline get cleaned
 * up the first time a triager opens the report.
 */
export const pruneDuplicateCandidatesNotOlderThanSelf = (report: any): boolean => {
  const raw = report?.duplicateCandidates;
  if (!Array.isArray(raw) || raw.length === 0) return false;
  const selfMs = reportSubmittedAtMs(report);
  const pruned = raw.filter((c: any) => {
    if (!c?.candidateSubmittedAt) return false;
    const t = new Date(c.candidateSubmittedAt).getTime();
    return !Number.isNaN(t) && t < selfMs;
  });
  if (pruned.length === raw.length) return false;
  report.duplicateCandidates = pruned;
  if (pruned.length === 0 && report.duplicateReviewStatus === 'pending') {
    report.duplicateReviewStatus = 'not_applicable';
  }
  return true;
};
