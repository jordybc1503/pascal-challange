import { Response, NextFunction } from 'express';
import { conversationsService } from './conversations.service.js';
import { sendSuccess } from '../../utils/response.js';
import { TenantRequest } from '../../middlewares/tenant.js';
import { Priority } from '@prisma/client';

export class ConversationsController {
  async getConversations(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { priority, tag, search, limit, cursor } = req.query;

      const result = await conversationsService.getConversations({
        priority: priority as Priority | undefined,
        tag: tag as string | undefined,
        search: search as string | undefined,
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

  async getConversationById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const conversation = await conversationsService.getConversationById(
        id,
        req.tenantId!, // CRITICAL: Pass tenant ID
        req.user!.userId,
        req.user!.role
      );

      sendSuccess(res, conversation);
    } catch (error) {
      next(error);
    }
  }

  async assignConversation(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { agentId } = req.body;

      const conversation = await conversationsService.assignConversation(
        id,
        agentId,
        req.tenantId!, // CRITICAL: Pass tenant ID
        req.user!.role
      );

      sendSuccess(res, conversation);
    } catch (error) {
      next(error);
    }
  }
}

export const conversationsController = new ConversationsController();
