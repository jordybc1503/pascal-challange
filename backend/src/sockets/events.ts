import { getIO } from './socket.js';
import { logger } from '../utils/logger.js';

/**
 * Emits a new message event to all clients in a conversation room
 */
export const emitNewMessage = (conversationId: string, message: any): void => {
  try {
    const io = getIO();
    io.to(`conversation:${conversationId}`).emit('message:new', {
      conversationId,
      message,
    });

    logger.debug({ conversationId, messageId: message.id }, 'New message emitted');
  } catch (error) {
    logger.error({ error, conversationId }, 'Failed to emit new message');
  }
};

/**
 * Emits a conversation AI update event to all clients in a conversation room
 */
export const emitConversationAIUpdate = (
  conversationId: string,
  aiData: {
    summary: string | null;
    priority: string | null;
    tags: string[] | null;
    updatedAt: Date | null;
  }
): void => {
  try {
    const io = getIO();
    io.to(`conversation:${conversationId}`).emit('conversation:ai:update', {
      conversationId,
      aiData,
    });

    logger.debug({ conversationId, priority: aiData.priority }, 'AI update emitted');
  } catch (error) {
    logger.error({ error, conversationId }, 'Failed to emit AI update');
  }
};
