import { API_URL } from '@/config';

/** Bearer + httpOnly cookie session for cross-origin API calls (localhost:3000 → :5000). */
export function getAuthHeaders(extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {
    ...((extra as Record<string, string>) || {}),
  };
  const token = localStorage.getItem('token');
  if (token && token !== 'null' && token !== 'undefined') {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** Authenticated fetch — always sends session cookie; adds Bearer token when present. */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = getAuthHeaders(options.headers as HeadersInit);
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/** Like apiFetch but parses JSON and throws on non-OK with server message. */
export async function apiFetchJson<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(path, options);
  } catch (err: any) {
    throw new Error(err?.message || 'Network request failed — is the server running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message || `Request failed (${res.status})`);
  }
  return data as T;
}
