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
const MIN_UNIQUE_CYBER_TERMS = 3;

const gibberish = gibberishDetective({ useCache: true });

/* -------------------------------------------------------------------------- */
/*                          Cybersecurity vocabulary                          */
/* -------------------------------------------------------------------------- */

/**
 * High-signal cybersecurity vocabulary used to verify that a submitted
 * report is actually on-topic. Terms are grouped by domain area so the
 * dictionary stays maintainable: adding/removing a category does not
 * require touching the scoring logic below.
 *
 * Rules of thumb for adding new terms:
 *   - Prefer terms that almost never appear outside security contexts
 *     (e.g. "xss", "ssrf", "idor").
 *   - Multi-word phrases are fine; the regex builder handles them.
 *   - Keep everything lowercase; the scanner lowercases input before
 *     matching, so casing in the dictionary is irrelevant.
 */
export const CYBER_DICTIONARY = {
  // OWASP-style web application vulnerabilities
  webVulnerabilities: [
    'xss',
    'csrf',
    'ssrf',
    'sqli',
    'rce',
    'idor',
    'lfi',
    'rfi',
    'xxe',
    'ssti',
    'sql injection',
    'cross-site scripting',
    'cross site scripting',
    'command injection',
    'code injection',
    'path traversal',
    'directory traversal',
    'open redirect',
    'clickjacking',
    'prototype pollution',
    'deserialization',
    'race condition',
  ],

  // Identity, sessions, and access control
  authentication: [
    'authentication',
    'authorization',
    'authn',
    'authz',
    'oauth',
    'saml',
    'jwt',
    'session',
    'cookie',
    'token',
    'mfa',
    '2fa',
    'otp',
    'sso',
    'privilege escalation',
    'broken authentication',
    'session fixation',
    'session hijacking',
  ],

  // Network, transport, and infrastructure surfaces
  networkInfra: [
    'subdomain',
    'dns',
    'tls',
    'ssl',
    'certificate',
    'endpoint',
    'api',
    'webhook',
    'proxy',
    'firewall',
    'cors',
    'csp',
    'https',
    'origin',
    'tcp',
    'udp',
    'reverse shell',
    'referer',
  ],

  // Generic security concepts and reporting taxonomy
  generalSecurity: [
    'vulnerability',
    'exploit',
    'cve',
    'cvss',
    'poc',
    'sanitization',
    'validation',
    'encryption',
    'hashing',
    'mitigation',
    'reconnaissance',
    'recon',
    'impact',
    'severity',
    'bypass',
    'misconfiguration',
  ],

  // Payloads, vectors, and exploitation tooling/techniques
  payloads: [
    'payload',
    'iframe',
    'base64',
    'polyglot',
    'reflected',
    'stored',
    'blind',
    'injection',
    'sanitize',
    'encode',
    'fuzzing',
    'burp',
  ],
};

/* -------------------------------------------------------------------------- */
/*                          Regex compilation (once)                          */
/* -------------------------------------------------------------------------- */

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Flatten the grouped dictionary into a single de-duplicated, length-sorted
 * list of terms. We sort by length descending so the regex engine prefers
 * the longest match at any given position. Example: with both "injection"
 * and "sql injection" in the alternation, text containing "sql injection"
 * matches the longer phrase first, avoiding a spurious extra hit on
 * "injection" inside it.
 */
const ALL_CYBER_TERMS: string[] = Array.from(
  new Set(Object.values(CYBER_DICTIONARY).flat())
).sort((a, b) => b.length - a.length);

/**
 * Compiled cyber vocabulary regex.
 *
 *   - `\b` on both sides guarantees we never match a term as a substring
 *     of an unrelated word. This is what prevents "port" from matching
 *     "report" or "script" from matching "description".
 *   - The `g` flag returns every occurrence so we can count uniques.
 *   - The `i` flag is belt-and-suspenders; we already lowercase input.
 */
export const CYBER_REGEX = new RegExp(
  '\\b(?:' + ALL_CYBER_TERMS.map(escapeRegExp).join('|') + ')\\b',
  'gi'
);

/**
 * Count how many *unique* cybersecurity terms appear in the given text.
 * Returns both the count and the matched terms so the rejection message
 * (and any future logging) can show exactly what was/wasn't picked up.
 */
export function countUniqueCyberTerms(text: string): {
  count: number;
  terms: string[];
} {
  const lowered = (text || '').toLowerCase();
  const matches = lowered.match(CYBER_REGEX) || [];
  const unique = new Set(matches.map((m) => m.toLowerCase()));
  return { count: unique.size, terms: Array.from(unique) };
}

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

  // Combined text used by every layer. Kept in original casing here so
  // entropy/gibberish layers see realistic text; the vocabulary layer
  // lowercases internally before matching.
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

  // ------------------- Layer 4: Domain Vocabulary Heuristic ----------------
  //
  // Scoring model
  // -------------
  //   1. Lowercase the concatenated report text (handled inside
  //      countUniqueCyberTerms).
  //   2. Scan against the precompiled CYBER_REGEX. Every match is a single
  //      occurrence of one dictionary term, with \b boundaries on both sides
  //      so we never trigger on substrings inside unrelated words.
  //   3. De-duplicate via a Set so authors don't pass by repeating the same
  //      term ("xss xss xss xss"). We count *unique* terms only.
  //   4. If the unique count is below MIN_UNIQUE_CYBER_TERMS, the report is
  //      almost certainly off-topic for a bug bounty platform (a cooking
  //      recipe, marketing copy, etc.) and we reject it with a specific,
  //      actionable error message.
  //
  // Why this catches off-topic text the earlier layers miss
  // -------------------------------------------------------
  //   - Length passes:    a recipe can easily be > 30 chars.
  //   - Entropy passes:   well-written English sits between 3.5 and 4.8.
  //   - Gibberish passes: real prose isn't gibberish, it's just unrelated.
  //   Only a domain-vocabulary check can flag "well-written but off-topic".
  const { count } = countUniqueCyberTerms(combined);
  if (count < MIN_UNIQUE_CYBER_TERMS) {
    return rejectSpam(
      res,
      'Invalid Report',
      'This report is not valid. It does not contain the information expected in a cybersecurity vulnerability report.'
    );
  }

  return next();
};

export default spamGuardMiddleware;
