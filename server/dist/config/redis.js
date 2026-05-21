"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisUrl = process.env.REDIS_URL?.trim();
const redisClient = new ioredis_1.default(redisUrl || 'redis://127.0.0.1:6379', {
    lazyConnect: true,
    enableOfflineQueue: Boolean(redisUrl),
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
        if (!redisUrl)
            return null;
        return Math.min(times * 100, 2000);
    },
});
redisClient.on('connect', () => console.log('Redis Connected'));
redisClient.on('error', (err) => console.error('Redis Error:', err));
exports.default = redisClient;
