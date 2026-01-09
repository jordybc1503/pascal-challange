import { getIO } from './socket.js';
import { logger } from '../utils/logger.js';

/**
 * Emits a new message event to all clients in a conversation room (tenant-scoped)
 */
export const emitNewMessage = (conversationId: string, tenantId: string, message: unknown): void => {
  try {
    const io = getIO();
    const room = `tenant:${tenantId}:conversation:${conversationId}`;
    io.to(room).emit('message:new', {
      conversationId,
      message,
    });

    logger.debug({ conversationId, tenantId, messageId: (message as any).id }, 'New message emitted');
  } catch (error) {
    logger.error({ error, conversationId, tenantId }, 'Failed to emit new message');
  }
};

/**
 * Emits a conversation AI update event to all clients in a conversation room (tenant-scoped)
 */
export const emitConversationAIUpdate = (
  conversationId: string,
  tenantId: string,
  aiData: {
    summary: string | null;
    priority: string | null;
    tags: string[] | null;
    updatedAt: Date | null;
  }
): void => {
  try {
    const io = getIO();
    const room = `tenant:${tenantId}:conversation:${conversationId}`;
    io.to(room).emit('conversation:ai:update', {
      conversationId,
      aiData,
    });

    logger.debug({ conversationId, tenantId, priority: aiData.priority }, 'AI update emitted');
  } catch (error) {
    logger.error({ error, conversationId, tenantId }, 'Failed to emit AI update');
  }
};
