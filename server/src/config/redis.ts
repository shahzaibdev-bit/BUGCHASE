import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisUrl = process.env.REDIS_URL?.trim();

const redisClient = new Redis(redisUrl || 'redis://127.0.0.1:6379', {
  lazyConnect: true,
  enableOfflineQueue: Boolean(redisUrl),
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (!redisUrl) return null;
    return Math.min(times * 100, 2000);
  },
});

redisClient.on('connect', () => console.log('Redis Connected'));
redisClient.on('error', (err) => console.error('Redis Error:', err));

export default redisClient;
