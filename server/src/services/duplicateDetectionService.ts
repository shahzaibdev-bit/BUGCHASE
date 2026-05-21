import mongoose from 'mongoose';
import Report from '../models/Report';
import { getUpstashVectorIndex } from '../config/upstashVector';

/** Cosine similarity threshold for auto-flagging duplicate review (0–1). */
export const DUPLICATE_MATCH_THRESHOLD = Number(
  process.env.DUPLICATE_SIMILARITY_THRESHOLD || 0.55
);

const VECTOR_SEARCH_TOP_K = Number(process.env.UPSTASH_VECTOR_SEARCH_TOP_K || 32);
const VECTOR_MATCH_RETURN_LIMIT = Number(process.env.DUPLICATE_MATCH_RETURN_LIMIT || 15);
const BULK_UPSERT_BATCH = Number(process.env.UPSTASH_VECTOR_BULK_BATCH || 100);

/** Strip HTML so embeddings match on text, not tags (rich-text submissions). */
export const stripHtmlForEmbedding = (raw: unknown): string => {
  const s = String(raw ?? '');
  return normalize(s.replace(/<[^>]+>/g, ' '));
};

export interface DuplicateMatch {
  report_id: string;
  score: number;
  metadata?: Record<string, any>;
}

const normalize = (text: string) => String(text || '').replace(/\s+/g, ' ').trim();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Text encoded for similarity search — semantic fields only (no public reportId in text). */
export const buildEmbeddingText = (report: any) => {
  const lines: string[] = [];
  const add = (label: string, value: unknown, stripTags = false) => {
    const v = stripTags ? stripHtmlForEmbedding(value) : normalize(String(value ?? ''));
    if (v) lines.push(`${label}: ${v}`);
  };

  add('Title', report.title, false);
  add('Vulnerable endpoint', report.vulnerableEndpoint, false);
  add('Description', report.description, true);
  add('Steps to reproduce', report.pocSteps, true);

  const fallback =
    normalize(report.title || '') ||
    stripHtmlForEmbedding(report.description) ||
    stripHtmlForEmbedding(report.pocSteps);
  return lines.join('\n').trim() || fallback;
};

const buildVectorMetadata = (report: any) => ({
  report_id: String(report._id),
  reportId: report.reportId ?? null,
  title: report.title ?? '',
  vulnerableEndpoint: report.vulnerableEndpoint ?? '',
  description: report.description ?? '',
  pocSteps: report.pocSteps ?? '',
  status: report.status,
  severity: report.severity,
  vulnerabilityCategory: report.vulnerabilityCategory,
  submittedAt: report.createdAt
    ? new Date(report.createdAt).toISOString()
    : new Date().toISOString(),
  programId: String(report.programId ?? ''),
});

/** Upsert one report into Upstash Vector (Upstash embeds `data` server-side). */
export const embedAndStoreReportVector = async (report: any) => {
  const text = buildEmbeddingText(report);
  if (!text) {
    throw new Error('Report has no indexable text for duplicate detection');
  }

  const vectorIndex = getUpstashVectorIndex();
  await vectorIndex.upsert({
    id: String(report._id),
    data: text,
    metadata: buildVectorMetadata(report),
  });
};

export const embedAndStoreReportVectorWithRetry = async (report: any, retries = 2) => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await embedAndStoreReportVector(report);
      return;
    } catch (error: unknown) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  throw lastError;
};

/** Query Upstash Vector for similar reports (cosine score 0–1). */
export const searchDuplicateReportVectors = async (report: any) => {
  const text = buildEmbeddingText(report);
  if (!text) return [] as DuplicateMatch[];

  const vectorIndex = getUpstashVectorIndex();
  const results = await vectorIndex.query({
    data: text,
    topK: VECTOR_SEARCH_TOP_K,
    includeMetadata: true,
  });

  const selfId = String(report._id);
  const matches: DuplicateMatch[] = [];

  for (const row of results) {
    const meta = (row.metadata || {}) as Record<string, unknown>;
    const reportId = String(meta.report_id ?? row.id ?? '');
    if (!reportId || reportId === selfId) continue;

    matches.push({
      report_id: reportId,
      score: Number(row.score ?? 0),
      metadata: meta as Record<string, any>,
    });

    if (matches.length >= VECTOR_MATCH_RETURN_LIMIT) break;
  }

  return matches;
};

/** Back-fill index for many reports (admin/triager reindex). */
export const bulkIndexReports = async (reports: any[]): Promise<number> => {
  const vectorIndex = getUpstashVectorIndex();
  const points: { id: string; data: string; metadata: Record<string, unknown> }[] = [];

  for (const report of reports) {
    const text = buildEmbeddingText(report);
    if (!text.trim()) continue;
    points.push({
      id: String(report._id),
      data: text,
      metadata: buildVectorMetadata(report),
    });
  }

  for (let i = 0; i < points.length; i += BULK_UPSERT_BATCH) {
    await vectorIndex.upsert(points.slice(i, i + BULK_UPSERT_BATCH));
  }

  return points.length;
};

export const isDuplicateVectorUnavailable = (error: unknown) => {
  const err = error as {
    message?: string;
    code?: string;
    response?: { status?: number };
  };
  const msg = String(err?.message || '');
  return !!(
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ECONNABORTED' ||
    (err?.response?.status && err.response.status >= 500) ||
    msg.includes('connect') ||
    msg.includes('Upstash Vector is not configured') ||
    msg.includes('UPSTASH')
  );
};

/** @deprecated Use isDuplicateVectorUnavailable */
export const isAiServiceUnavailable = isDuplicateVectorUnavailable;

export type DuplicateCandidatePayload = {
  reportMongoId: mongoose.Types.ObjectId;
  similarityScore: number;
  candidateReportId?: string;
  candidateTitle?: string;
  candidateSubmittedAt?: Date;
  detectedAt: Date;
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

export const runInitialDuplicateScanForNewReport = async (
  newReport: any
): Promise<{ candidates: DuplicateCandidatePayload[]; reviewStatus: 'pending' | 'not_applicable' }> => {
  try {
    const matches = await searchDuplicateReportVectors(newReport);
    const seen = new Set<string>();
    const above = matches.filter((m) => Number(m.score || 0) >= DUPLICATE_MATCH_THRESHOLD);
    const ids = above
      .map((m) => String(m.report_id || ''))
      .filter((id) => id && id !== String(newReport._id));

    if (!ids.length) {
      return { candidates: [], reviewStatus: 'not_applicable' };
    }

    const objectIds = ids
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((id): id is mongoose.Types.ObjectId => !!id);

    if (!objectIds.length) {
      return { candidates: [], reviewStatus: 'not_applicable' };
    }

    const others = await Report.find({ _id: { $in: objectIds } })
      .select('_id reportId title createdAt programId status')
      .lean();

    const byId = new Map(others.map((o: any) => [String(o._id), o]));
    const candidates: DuplicateCandidatePayload[] = [];
    const thisSubmittedMs = reportSubmittedAtMs(newReport);

    for (const m of above) {
      const oid = String(m.report_id || '');
      if (!oid || oid === String(newReport._id) || seen.has(oid)) continue;
      const o: any = byId.get(oid);
      if (!o) continue;
      const sameProgram =
        String(o.programId ?? '').trim() === String(newReport.programId ?? '').trim();
      if (!sameProgram) continue;
      if (['Duplicate', 'Spam'].includes(o.status)) continue;

      const candidateSubmittedMs = reportSubmittedAtMs(o);
      if (candidateSubmittedMs >= thisSubmittedMs) continue;

      seen.add(oid);
      candidates.push({
        reportMongoId: o._id,
        similarityScore: Number(m.score || 0),
        candidateReportId: o.reportId || undefined,
        candidateTitle: o.title || undefined,
        candidateSubmittedAt: o.createdAt ? new Date(o.createdAt) : undefined,
        detectedAt: new Date(),
      });
    }

    candidates.sort(
      (a, b) =>
        (a.candidateSubmittedAt?.getTime() || 0) - (b.candidateSubmittedAt?.getTime() || 0)
    );

    const top = candidates.slice(0, 12);
    return {
      candidates: top,
      reviewStatus: top.length ? 'pending' : 'not_applicable',
    };
  } catch (err) {
    console.error('[duplicate-scan] initial scan failed:', err);
    return { candidates: [], reviewStatus: 'not_applicable' };
  }
};

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
