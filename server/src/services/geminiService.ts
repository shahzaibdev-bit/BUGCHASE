import { GoogleGenerativeAI } from '@google/generative-ai';
import AppError from '../utils/AppError';

const stripHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const resolveGeminiConfig = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(
      'Gemini is not configured. Set GEMINI_API_KEY in server/.env (create a key at https://aistudio.google.com/apikey).',
      503,
    );
  }
  return {
    apiKey,
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
  };
};

const formatGeminiError = (error: any): AppError => {
  const status = Number(error?.status ?? error?.statusCode ?? 500);
  const message = String(error?.message || error || 'Unknown Gemini error');

  if (status === 404 || message.includes('is not found')) {
    return new AppError(
      `Gemini model is unavailable (${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}). Update GEMINI_MODEL in server/.env (e.g. gemini-2.5-flash).`,
      502,
    );
  }
  if (status === 403 && message.toLowerCase().includes('leaked')) {
    return new AppError(
      'Your Gemini API key was reported as leaked. Create a new key at https://aistudio.google.com/apikey and update GEMINI_API_KEY in server/.env.',
      502,
    );
  }
  if (status === 403 || message.toLowerCase().includes('api key')) {
    return new AppError(
      'Gemini rejected the API key. Verify GEMINI_API_KEY in server/.env.',
      502,
    );
  }
  if (status === 429 || message.includes('quota') || message.includes('Too Many Requests')) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const hint =
      model.includes('2.0-flash') && message.includes('limit: 0')
        ? ' Your project has no free-tier quota for this model — set GEMINI_MODEL=gemini-2.5-flash in server/.env.'
        : '';
    return new AppError(
      `Gemini rate limit or quota exceeded.${hint} Wait a minute and retry, or enable billing on your Google AI project.`,
      429,
    );
  }

  return new AppError(`Failed to generate AI summary: ${message.split('\n')[0]}`, 502);
};

const getJsonModel = () => {
  const { apiKey, model } = resolveGeminiConfig();
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });
};

const generateWithRetry = async (model: any, prompt: string, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (error: any) {
      const status = Number(error?.status ?? 0);
      const retryable = status === 503 || status === 429;
      if (i === retries - 1 || !retryable) {
        throw error;
      }
      console.log(`Gemini ${status} — retrying in ${delay}ms (${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error('Gemini request failed after retries');
};

const parseJsonResponse = (text: string) => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Gemini returned non-JSON output');
  }
};

const mapTimeline = (timeline: any[]) =>
  (timeline || []).map((e) => ({
    author: e.sender?.username || e.sender?.name || e.author || 'System',
    role: e.sender?.role || e.role,
    content: stripHtml(e.content).slice(0, 2000),
    type: e.type,
    timestamp: e.createdAt || e.timestamp,
  }));

const reportContext = (report: any) => ({
  title: report.title,
  severity: report.severity,
  assetType: report.assetType,
  category: report.vulnerabilityCategory || report.vrtVariant,
  endpoint: report.vulnerableEndpoint,
  description: stripHtml(report.description).slice(0, 4000),
  impact: stripHtml(report.impact).slice(0, 2000),
  pocSteps: stripHtml(report.pocSteps).slice(0, 4000),
  cvssScore: report.cvssScore,
  cvssVector: report.cvssVector,
});

export const generateReportSummary = async (report: any, timeline: any[]) => {
  try {
    const model = getJsonModel();
    const ctx = reportContext(report);
    const relevantEvents = mapTimeline(timeline);

    const prompt = `
You are a professional security analyst. Generate an executive summary for a vulnerability report being promoted to "Triaged".

Report:
${JSON.stringify(ctx, null, 2)}

Communication history:
${JSON.stringify(relevantEvents, null, 2)}

Return JSON only:
{
  "title": "concise professional title",
  "technical_summary": "markdown — vulnerability, impact, validation",
  "remediation": "markdown — numbered remediation steps"
}
`;

    const result = await generateWithRetry(model, prompt);
    const text = result.response.text();
    return parseJsonResponse(text);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    console.error('Gemini Generation Error:', error);
    throw formatGeminiError(error);
  }
};

export const suggestBountyAmount = async (
  report: any,
  timeline: any[],
  rewardRange: { min: number; max: number },
) => {
  try {
    const model = getJsonModel();
    const ctx = reportContext(report);
    const relevantEvents = mapTimeline(timeline);

    const prompt = `
You are a Bug Bounty Program Manager determining the final reward payout.

Program constraints for severity (${report.severity}):
- Minimum: PKR ${rewardRange.min}
- Maximum: PKR ${rewardRange.max}

Report:
${JSON.stringify(ctx, null, 2)}

Communication history:
${JSON.stringify(relevantEvents, null, 2)}

Return JSON only:
{
  "suggestedAmount": <integer between min and max, or 0 if both are 0>,
  "reasoning": "1-2 sentences"
}
`;

    const result = await generateWithRetry(model, prompt);
    return parseJsonResponse(result.response.text());
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    console.error('Gemini Bounty Suggestion Error:', error);
    throw formatGeminiError(error);
  }
};

export const generateReportMessage = async (
  report: any,
  timeline: any[],
  type: 'resolve' | 'bounty',
  bountyAmount?: number,
) => {
  try {
    const model = getJsonModel();
    const ctx = reportContext(report);
    const relevantEvents = mapTimeline(timeline).slice(-10);

    const taskPrompt =
      type === 'resolve'
        ? `Write a friendly closing message: the issue was patched. Thank the researcher. 2-3 short paragraphs.`
        : `Write a friendly message awarding PKR ${bountyAmount} bounty. Thank the researcher. 2-3 short paragraphs.`;

    const prompt = `
You are a Bug Bounty Program Manager writing to a security researcher.

Report:
${JSON.stringify(ctx, null, 2)}

Recent thread:
${JSON.stringify(relevantEvents, null, 2)}

Task: ${taskPrompt}

Format the message as basic HTML only (<p>, <strong>, <ul>, <li>, <br/>). No Markdown.

Return JSON only:
{ "message": "..." }
`;

    const result = await generateWithRetry(model, prompt);
    return parseJsonResponse(result.response.text());
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    console.error('Gemini Message Generation Error:', error);
    throw formatGeminiError(error);
  }
};
