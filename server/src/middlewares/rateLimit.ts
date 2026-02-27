import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis';
import AppError from '../utils/AppError';

const getRateLimitKey = (req: Request, prefix: string = 'global') => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const route = req.originalUrl;
  return `rate_limit:${prefix}:${ip}:${route}`;
};

export const rateLimiter = (limit: number, windowSeconds: number, prefix: string = 'global') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = getRateLimitKey(req, prefix);

    try {
      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      if (current > limit) {
        return next(new AppError('Too many requests, please try again later.', 429));
      }

      next();
    } catch (error) {
      console.error('Rate Limiter Error:', error);
      next();
    }
  };
};

export const resetRateLimit = async (req: Request, prefix: string = 'global') => {
  try {
    const key = getRateLimitKey(req, prefix);
    await redisClient.del(key);
  } catch (error) {
    console.error('Rate Limit Reset Error:', error);
  }
};
