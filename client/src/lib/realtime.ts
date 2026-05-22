import { API_URL } from '@/config';

export function getRealtimeSocketUrl(): string | null {
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (explicitSocketUrl) return explicitSocketUrl.replace(/\/$/, '');

  // Vercel serverless functions do not host Socket.io. Keep realtime enabled
  // locally, and use VITE_SOCKET_URL later if you deploy a separate socket server.
  if (!import.meta.env.DEV) return null;

  return API_URL.replace(/\/api\/?$/, '');
}
