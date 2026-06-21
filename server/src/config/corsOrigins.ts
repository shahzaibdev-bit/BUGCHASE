/** Static browser origins allowed to call the API with credentials. */
export const STATIC_ALLOWED_ORIGINS: string[] = [
  'http://localhost:3000',
  'http://localhost:3100',
  'http://localhost:3101',
  'http://127.0.0.1:3101',
  'http://localhost:5173',
  'https://bugchase-client.vercel.app',
  'https://bugchase.imkasim.xyz',
  'https://bugchase.com',
  'https://www.bugchase.com',
  'https://support.bugchase.com',
];

/** Vercel previews + any bugchase.com subdomain (support.bugchase.com, app.bugchase.com, …). */
export const DYNAMIC_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/bugchase-client-[a-z0-9-]+\.vercel\.app$/i,
  /^https:\/\/bugchase-support-[a-z0-9-]+\.vercel\.app$/i,
  /^https:\/\/([a-z0-9-]+\.)*bugchase\.com$/i,
];

const ENV_ORIGIN_KEYS = ['CLIENT_URL', 'SUPPORT_CLIENT_URL'] as const;

export function collectAllowedOrigins(): Set<string> {
  const origins = new Set(STATIC_ALLOWED_ORIGINS);

  for (const key of ENV_ORIGIN_KEYS) {
    const raw = process.env[key];
    if (!raw) continue;
    raw
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean)
      .forEach((origin) => origins.add(origin));
  }

  return origins;
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;

  const normalizedOrigin = origin.replace(/\/$/, '');
  if (collectAllowedOrigins().has(normalizedOrigin)) return true;
  return DYNAMIC_ORIGIN_PATTERNS.some((pattern) => pattern.test(normalizedOrigin));
}
