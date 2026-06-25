import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Upstash Redis only — use the Redis protocol URL from the Upstash dashboard
 * (rediss://default:PASSWORD@ENDPOINT.upstash.io:6379), not the REST API URL.
 */
export function normalizeRedisUrl(raw: string): string {
  let url = raw.trim();
  if (!url) {
    throw new Error(
      'REDIS_URL is required. Set your Upstash Redis URL in server/.env ' +
        '(e.g. rediss://default:PASSWORD@YOUR-ENDPOINT.upstash.io:6379).',
    );
  }

  if (url.includes('upstash.io') && url.startsWith('redis://')) {
    url = `rediss://${url.slice('redis://'.length)}`;
  }

  // Ensure a DB index for clients that expect /0
  if (!url.match(/\/\d+(\?|$)/)) {
    url = url.replace(/\/?$/, '/0');
  }

  return url;
}

function resolveRedisUrl(): string {
  const raw = (process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || '').trim();
  return normalizeRedisUrl(raw);
}

const redisUrl = resolveRedisUrl();
const useTls = redisUrl.startsWith('rediss://');

const redisClient = new Redis(redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: true,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 3000);
  },
  ...(useTls ? { tls: {} } : {}),
});

redisClient.on('connect', () => console.log('[redis] Connected to Upstash'));
redisClient.on('error', (err) => console.error('[redis] Error:', err.message || err));

export async function ensureRedisConnected(): Promise<void> {
  if (redisClient.status === 'ready') return;
  await redisClient.connect();
  await redisClient.ping();
}

export default redisClient;
