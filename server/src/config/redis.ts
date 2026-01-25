import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisClient = new Redis(process.env.REDIS_URL as string);

redisClient.on('connect', () => console.log('Redis Connected'));
redisClient.on('error', (err) => console.error('Redis Error:', err));

export default redisClient;
