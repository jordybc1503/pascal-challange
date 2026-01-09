import { Queue } from 'bullmq';
import { config } from '../config/env.js';
import { redisConnection } from './redis.js';
import { logger } from '../utils/logger.js';

export const AI_ANALYZE_CONVERSATION = 'AI_ANALYZE_CONVERSATION';

export interface AIAnalyzeConversationJobData {
  conversationId: string;
}

export const aiQueue = new Queue(config.bullmq.queueName, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 3600, // 1 hour
    },
    removeOnFail: {
      count: 1000,
      age: 86400, // 24 hours
    },
  },
});

aiQueue.on('error', (error) => {
  logger.error({ error }, 'Queue error');
});

logger.info({ queueName: config.bullmq.queueName }, 'BullMQ queue initialized');
