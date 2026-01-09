import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './db/client.js';
import redisConnection from './jobs/redis.js';
import { createAIWorker } from './jobs/worker.js';

const startWorker = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Worker: Database connected');

    // Test Redis connection
    await redisConnection.ping();
    logger.info('Worker: Redis connected');

    // Create and start the worker
    const worker = createAIWorker();

    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ⚙️  AI Worker Started                               ║
║                                                       ║
║   Environment: ${config.env.padEnd(37)}║
║   Queue:       ${config.bullmq.queueName.padEnd(37)}║
║   Concurrency: ${config.bullmq.concurrency.toString().padEnd(37)}║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Worker shutdown signal received');

      await worker.close();
      logger.info('Worker closed');

      await prisma.$disconnect();
      logger.info('Database disconnected');

      await redisConnection.quit();
      logger.info('Redis disconnected');

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error({ error }, 'Failed to start worker');
    process.exit(1);
  }
};

startWorker();
