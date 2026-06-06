import { Request, Response, NextFunction } from 'express';
// gibberish-detective ships no type definitions
// @ts-ignore
import gibberishDetective from 'gibberish-detective';

/* -------------------------------------------------------------------------- */
/*                                  Tunables                                  */
/* -------------------------------------------------------------------------- */

const MIN_COMBINED_LENGTH = 30;
const MAX_ENTROPY = 5.2;
const MIN_ENTROPY = 2.0;

const gibberish = gibberishDetective({ useCache: true });

/* -------------------------------------------------------------------------- */
/*                          Shannon entropy (Layer 2)                         */
/* -------------------------------------------------------------------------- */

export function calculateShannonEntropy(input: string): number {
  const text = (input || '').replace(/\s+/g, '');
  const length = text.length;
  if (length === 0) return 0;

  const frequency: Record<string, number> = {};
  for (const char of text) {
    frequency[char] = (frequency[char] || 0) + 1;
  }

  let entropy = 0;
  for (const char in frequency) {
    const probability = frequency[char] / length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

/* -------------------------------------------------------------------------- */
/*                              Helper utilities                              */
/* -------------------------------------------------------------------------- */

function rejectSpam(res: Response, error: string, message: string) {
  return res.status(400).json({
    status: 'fail',
    error,
    message,
  });
}

function pickReportFields(body: Record<string, any>) {
  const title = String(body.title ?? '').trim();

  const description = String(
    body.description ?? body.vulnerabilityDetails ?? ''
  ).trim();

  const stepsToReproduce = String(
    body.steps_to_reproduce ??
      body.stepsToReproduce ??
      body.pocSteps ??
      body.validationSteps ??
      ''
  ).trim();

  return { title, description, stepsToReproduce };
}

/* -------------------------------------------------------------------------- */
/*                            spamGuardMiddleware                             */
/* -------------------------------------------------------------------------- */

export const spamGuardMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body = (req.body ?? {}) as Record<string, any>;
  const { title, description, stepsToReproduce } = pickReportFields(body);

  // Combined text used by every layer.
  const combined = [title, description, stepsToReproduce]
    .filter((part) => part.length > 0)
    .join(' ')
    .trim();

  // ---------------------------- Layer 1: length ----------------------------
  if (combined.length < MIN_COMBINED_LENGTH) {
    return rejectSpam(
      res,
      'Report Too Short',
      `Report content must be at least ${MIN_COMBINED_LENGTH} characters long. Please provide a meaningful title, description, and steps to reproduce.`
    );
  }

  // ---------------------------- Layer 2: entropy ---------------------------
  const entropy = calculateShannonEntropy(combined);

  if (entropy > MAX_ENTROPY) {
    return rejectSpam(
      res,
      'Random Keyboard Input Detected',
      `Submitted content appears to be random keyboard mashing (entropy ${entropy.toFixed(2)}). Please write a coherent report.`
    );
  }

  if (entropy < MIN_ENTROPY) {
    return rejectSpam(
      res,
      'Repetitive Content Detected',
      `Submitted content is too repetitive (entropy ${entropy.toFixed(2)}). Please describe the vulnerability with real, varied information.`
    );
  }

  // -------------------------- Layer 3: gibberish lib -----------------------
  try {
    const isGibberish: boolean = gibberish.detect(combined);
    if (isGibberish) {
      return rejectSpam(
        res,
        'Gibberish Detected',
        'Submitted content does not resemble valid English. Please write a clear, readable bug report.'
      );
    }
  } catch (err) {
    // Library failure should never block a legit submission. Log and move on.
    console.error('spamGuardMiddleware: gibberish library error', err);
  }

  return next();
};

export default spamGuardMiddleware;
