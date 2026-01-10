import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { JWTPayload } from '../middlewares/auth.js';

export interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
}

let io: Server | null = null;

export const initializeSocket = (httpServer: HTTPServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

      // CRITICAL: Validate tenantId in JWT
      if (!decoded.tenantId) {
        return next(new Error('Authentication error: Missing tenant'));
      }

      socket.user = decoded;
      socket.data.tenantId = decoded.tenantId;

      logger.debug({
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        socketId: socket.id
      }, 'Socket authenticated');

      next();
    } catch (error) {
      logger.error({ error }, 'Socket authentication failed');
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const tenantId = socket.data.tenantId;

    // Automatically join tenant room for broadcast messages
    socket.join(`tenant:${tenantId}`);

    logger.info({
      userId: socket.user?.userId,
      tenantId,
      socketId: socket.id
    }, 'Socket connected');

    // Join conversation room with tenant prefix
    socket.on('conversation:join', (conversationId: string) => {
      const room = `tenant:${tenantId}:conversation:${conversationId}`;
      socket.join(room);
      logger.debug(
        { userId: socket.user?.userId, tenantId, conversationId, socketId: socket.id },
        'User joined conversation room'
      );
    });

    // Leave conversation room
    socket.on('conversation:leave', (conversationId: string) => {
      const room = `tenant:${tenantId}:conversation:${conversationId}`;
      socket.leave(room);
      logger.debug(
        { userId: socket.user?.userId, tenantId, conversationId, socketId: socket.id },
        'User left conversation room'
      );
    });

    // Typing indicators with tenant scope
    socket.on('typing:start', (conversationId: string) => {
      const room = `tenant:${tenantId}:conversation:${conversationId}`;
      socket.to(room).emit('typing:start', {
        userId: socket.user?.userId,
        email: socket.user?.email,
        conversationId,
      });

      logger.debug({ userId: socket.user?.userId, tenantId, conversationId }, 'User started typing');
    });

    socket.on('typing:stop', (conversationId: string) => {
      const room = `tenant:${tenantId}:conversation:${conversationId}`;
      socket.to(room).emit('typing:stop', {
        userId: socket.user?.userId,
        email: socket.user?.email,
        conversationId,
      });

      logger.debug({ userId: socket.user?.userId, conversationId }, 'User stopped typing');
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId: socket.user?.userId, socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  logger.info('Socket.IO initialized');

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};
