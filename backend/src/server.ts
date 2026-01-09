import { createServer } from 'http';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { initializeSocket } from './sockets/socket.js';
import { prisma } from './db/client.js';
import redisConnection from './jobs/redis.js';

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected');

    // Test Redis connection
    await redisConnection.ping();
    logger.info('Redis connected');

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    initializeSocket(httpServer);

    // Start server
    httpServer.listen(config.port, () => {
      logger.info({
        port: config.port,
        env: config.env,
        apiPrefix: config.apiPrefix,
      }, 'Server started successfully');

      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 Messaging System Backend Started                ║
║                                                       ║
║   Environment: ${config.env.padEnd(37)}║
║   Port:        ${config.port.toString().padEnd(37)}║
║   API:         http://localhost:${config.port}${config.apiPrefix.padEnd(19)}║
║   Health:      http://localhost:${config.port}/health${' '.repeat(19)}║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      httpServer.close(async () => {
        logger.info('HTTP server closed');

        await prisma.$disconnect();
        logger.info('Database disconnected');

        await redisConnection.quit();
        logger.info('Redis disconnected');

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
