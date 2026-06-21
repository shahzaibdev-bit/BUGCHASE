/**
 * API base URL for the support portal.
 *
 * Production (Vercel): set VITE_API_URL to your live backend, or leave unset and
 * rely on support-client/vercel.json proxying /api → bugchase-server.vercel.app.
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

/** Legacy warning — production uses vercel.json /api proxy when VITE_API_URL is unset. */
export const isApiMisconfigured = false;
