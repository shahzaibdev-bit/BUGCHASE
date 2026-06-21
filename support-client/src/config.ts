/**
 * API base URL for the support portal.
 *
 * Production (Vercel): MUST set VITE_API_URL to your live backend, e.g.
 *   https://your-api-host.vercel.app/api
 *   https://api.bugchase.com/api
 *
 * Local dev: leave unset — Vite proxies /api → http://localhost:5000
 */
function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) {
    return '/api';
  }

  const withoutTrailingSlash = raw.replace(/\/+$/, '');
  if (withoutTrailingSlash.endsWith('/api')) {
    return withoutTrailingSlash;
  }
  return `${withoutTrailingSlash}/api`;
}

export const API_URL = resolveApiUrl();

/** True when the built app has no explicit backend URL (will 404 on Vercel). */
export const isApiMisconfigured =
  import.meta.env.PROD && !import.meta.env.VITE_API_URL?.trim();
