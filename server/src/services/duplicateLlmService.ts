import axios, { AxiosError } from 'axios';

/**
 * Output contract enforced by the duplicate_engine FastAPI service.
 * The engine validates and clamps every field, so anything we receive here
 * is already safe to persist directly into MongoDB / surface to triagers.
 */
export interface DuplicateLlmVerdict {
  is_duplicate: boolean;
  confidence_score: number;
  primary_duplicate_id: string | null;
  reasoning: string;
  researcher_communication: string;
  model_used?: string;
}

/* -------------------------------------------------------------------------- */
/*                              Configuration                                 */
/* -------------------------------------------------------------------------- */

const DEFAULT_ENGINE_URL = 'http://127.0.0.1:7870/analyze-duplicate';

function engineUrl(): string {
  return (process.env.DUPLICATE_ENGINE_URL || DEFAULT_ENGINE_URL).trim();
}

function engineApiKey(): string {
  return (process.env.DUPLICATE_ENGINE_API_KEY || '').trim();
}

function requestTimeoutMs(): number {
  return Number(process.env.DUPLICATE_LLM_TIMEOUT_MS || 300_000);
}

export function isDuplicateLlmEnabled(): boolean {
  const flag = (process.env.DUPLICATE_LLM_ENABLED || 'true').toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

/* -------------------------------------------------------------------------- */
/*                              Payload shaping                               */
/* -------------------------------------------------------------------------- */

/** Trim/normalize a single field so we never send `undefined` or absurdly long
 *  strings to the engine. The engine also caps lengths, but a clean payload
 *  keeps logs / network traces compact. */
function clean(value: any, maxLen = 8_000): string {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function shapeReport(report: any) {
  return {
    report_id: clean(report.report_id ?? report._id, 128),
    title: clean(report.title, 8_000),
    bug_category: clean(report.bug_category, 256),
    vulnerable_endpoint: clean(report.vulnerable_endpoint, 2_048),
    parameter: clean(report.parameter, 256),
    steps_to_reproduce: clean(report.steps_to_reproduce, 8_000),
    impact: clean(report.impact, 8_000),
    payload: clean(report.payload, 8_000),
  };
}

/* -------------------------------------------------------------------------- */
/*                                Main call                                   */
/* -------------------------------------------------------------------------- */

/**
 * Run the deep duplicate reasoning step by calling the duplicate_engine
 * FastAPI service. Throws on transport / parse failure so the caller can
 * fall back to raw keyword matches.
 */
export async function runDuplicateLlmAnalysis(
  newReport: any,
  candidates: any[]
): Promise<DuplicateLlmVerdict> {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('runDuplicateLlmAnalysis called with no candidates.');
  }

  const url = engineUrl();
  const apiKey = engineApiKey();

  const payload = {
    new_report: shapeReport(newReport),
    candidates: candidates.slice(0, 5).map(shapeReport),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) headers['X-API-Key'] = apiKey;

  try {
    const { data } = await axios.post<DuplicateLlmVerdict>(url, payload, {
      timeout: requestTimeoutMs(),
      headers,
      // The engine returns JSON; surface 4xx/5xx as throws so we hit fail-safe.
      validateStatus: (s) => s >= 200 && s < 300,
      maxContentLength: 5 * 1024 * 1024,
      maxBodyLength: 5 * 1024 * 1024,
    });

    if (!data || typeof data.is_duplicate !== 'boolean') {
      throw new Error('Duplicate engine returned an unexpected payload shape.');
    }

    return {
      is_duplicate: !!data.is_duplicate,
      confidence_score: Number.isFinite(data.confidence_score)
        ? Math.max(0, Math.min(1, data.confidence_score))
        : 0,
      primary_duplicate_id:
        typeof data.primary_duplicate_id === 'string' && data.primary_duplicate_id
          ? data.primary_duplicate_id
          : null,
      reasoning: String(data.reasoning ?? '').trim(),
      researcher_communication: String(data.researcher_communication ?? '').trim(),
      model_used: typeof data.model_used === 'string' ? data.model_used : undefined,
    };
  } catch (err) {
    const ax = err as AxiosError<any>;
    const detail =
      ax.response?.data?.detail ||
      ax.response?.data?.error ||
      ax.message ||
      'Unknown duplicate-engine transport error';
    const wrapped = new Error(`Duplicate engine call failed: ${detail}`);
    (wrapped as any).cause = err;
    throw wrapped;
  }
}
