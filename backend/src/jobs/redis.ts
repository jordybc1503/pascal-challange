import IORedis from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const redisConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  logger.info('Redis connected');
});

redisConnection.on('error', (error) => {
  logger.error({ error }, 'Redis connection error');
});

export default redisConnection;
