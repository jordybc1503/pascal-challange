import { Response, NextFunction } from 'express';
import { messagesService } from './messages.service.js';
import { sendSuccess } from '../../utils/response.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { aiJobProducer } from '../../jobs/producer.js';
import { emitNewMessage } from '../../sockets/events.js';
import { ContentType } from '@prisma/client';

export class MessagesController {
  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: conversationId } = req.params;
      const { limit, cursor } = req.query;

      const result = await messagesService.getMessages({
        conversationId,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        cursor: cursor as string | undefined,
        userId: req.user!.userId,
        userRole: req.user!.role,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: conversationId } = req.params;
      const { contentText, contentType, mediaUrl } = req.body;

      const message = await messagesService.createMessage({
        conversationId,
        contentText,
        contentType: contentType as ContentType | undefined,
        mediaUrl,
        userId: req.user!.userId,
        userRole: req.user!.role,
      });

      // Emit socket event for new message
      emitNewMessage(conversationId, message);

      // Enqueue AI analysis job (with debouncing handled by BullMQ)
      await aiJobProducer.enqueueConversationAnalysis(conversationId);

      sendSuccess(res, message, 201);
    } catch (error) {
      next(error);
    }
  }
}

export const messagesController = new MessagesController();
