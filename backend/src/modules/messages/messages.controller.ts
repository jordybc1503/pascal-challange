import { Response, NextFunction } from 'express';
import { messagesService } from './messages.service.js';
import { sendSuccess } from '../../utils/response.js';
import { TenantRequest } from '../../middlewares/tenant.js';
import { queueJob, aiJobProducer } from '../../jobs/producer.js';
import { emitNewMessage } from '../../sockets/events.js';
import { logger } from '../../utils/logger.js';
import { ContentType } from '@prisma/client';

export class MessagesController {
  async getMessages(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { id: conversationId } = req.params;
      const { limit, cursor } = req.query;

      const result = await messagesService.getMessages({
        conversationId,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        cursor: cursor as string | undefined,
        userId: req.user!.userId,
        userRole: req.user!.role,
        tenantId: req.tenantId!, // CRITICAL: Pass tenant ID
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createMessage(req: TenantRequest, res: Response, next: NextFunction) {
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
        tenantId: req.tenantId!, // CRITICAL: Pass tenant ID
      });

      // Emit socket event for new message (with tenant scope)
      emitNewMessage(conversationId, req.tenantId!, message);

      logger.info({ conversationId, tenantId: req.tenantId }, '🔍 Debug: About to enqueue AI job from Controller');

      // Enqueue AI analysis job with tenantId
      await aiJobProducer.enqueueConversationAnalysis(conversationId, req.tenantId!);

      sendSuccess(res, message, 201);
    } catch (error) {
      next(error);
    }
  }
}

export const messagesController = new MessagesController();
