import axios from 'axios';
import mongoose from 'mongoose';
import Report from '../models/Report';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

/** Cosine similarity threshold for auto-flagging duplicate review (0–1). Paraphrases often score 0.55–0.65. */
export const DUPLICATE_MATCH_THRESHOLD = Number(
  process.env.DUPLICATE_SIMILARITY_THRESHOLD || 0.55
);

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

export const embedAndStoreReportVector = async (report: any) => {
  const text = buildEmbeddingText(report);
  await axios.post(
    `${AI_SERVICE_URL}/embed-and-store`,
    {
      report_id: String(report._id),
      text,
      metadata: {
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
      },
    },
    { timeout: 8000 }
  );
};

export const embedAndStoreReportVectorWithRetry = async (report: any, retries = 2) => {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await embedAndStoreReportVector(report);
      return;
    } catch (error: any) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  throw lastError;
};

export const searchDuplicateReportVectors = async (report: any) => {
  const text = buildEmbeddingText(report);
  const response = await axios.post(
    `${AI_SERVICE_URL}/search-duplicates`,
    {
      report_id: String(report._id),
      text,
    },
    { timeout: 10000 }
  );

  return (response.data?.matches || []) as DuplicateMatch[];
};

export const isAiServiceUnavailable = (error: any) =>
  !!(
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ECONNABORTED' ||
    error?.response?.status >= 500 ||
    error?.message?.includes('connect')
  );

export type DuplicateCandidatePayload = {
  reportMongoId: mongoose.Types.ObjectId;
  similarityScore: number;
  candidateReportId?: string;
  candidateTitle?: string;
  candidateSubmittedAt?: Date;
  detectedAt: Date;
};

/**
 * After a report is indexed, search for similar reports in the same program.
 * Returns candidates sorted by submission time (earliest first) for fair triage.
 */
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

    for (const m of above) {
      const oid = String(m.report_id || '');
      if (!oid || oid === String(newReport._id) || seen.has(oid)) continue;
      const o: any = byId.get(oid);
      if (!o) continue;
      const sameProgram =
        String(o.programId ?? '').trim() === String(newReport.programId ?? '').trim();
      if (!sameProgram) continue;
      if (['Duplicate', 'Spam'].includes(o.status)) continue;

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
