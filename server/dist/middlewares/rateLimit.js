"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetRateLimit = exports.rateLimiter = void 0;
const redis_1 = __importDefault(require("../config/redis"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const getRateLimitKey = (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const route = req.originalUrl;
    return `rate_limit:${ip}:${route}`;
};
const rateLimiter = (limit, windowSeconds) => {
    return async (req, res, next) => {
        const key = getRateLimitKey(req);
        try {
            const current = await redis_1.default.incr(key);
            if (current === 1) {
                await redis_1.default.expire(key, windowSeconds);
            }
            if (current > limit) {
                return next(new AppError_1.default('Too many requests, please try again later.', 429));
            }
            next();
        }
        catch (error) {
            console.error('Rate Limiter Error:', error);
            next();
        }
    };
};
exports.rateLimiter = rateLimiter;
const resetRateLimit = async (req) => {
    try {
        const key = getRateLimitKey(req);
        await redis_1.default.del(key);
    }
    catch (error) {
        console.error('Rate Limit Reset Error:', error);
    }
};
exports.resetRateLimit = resetRateLimit;
