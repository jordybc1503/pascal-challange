import { prisma } from '../../db/client.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { UserRole, SenderType, ContentType } from '@prisma/client';
import { serialize } from '../../utils/serializer.js';
import { whatsAppService } from '../whatsapp/whatsapp.service.js';
import { logger } from '../../utils/logger.js';

interface GetMessagesParams {
  conversationId: string;
  limit?: number;
  cursor?: string;
  userId: string;
  userRole: UserRole;
  tenantId: string;
}

interface CreateMessageParams {
  conversationId: string;
  contentText: string;
  contentType?: ContentType;
  mediaUrl?: string | null;
  userId: string;
  userRole: UserRole;
  tenantId: string;
}

export class MessagesService {
  async getMessages(params: GetMessagesParams) {
    const { conversationId, limit = 50, cursor, userId, userRole, tenantId } = params;

    // Check conversation access with tenant scope
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId, // CRITICAL: Scope by tenant
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // RBAC: sales agents can only access their assigned conversations
    if (userRole === UserRole.SALES_AGENT && conversation.assignedAgentId !== userId) {
      throw new ForbiddenError('You do not have access to this conversation');
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        tenantId, // CRITICAL: Scope by tenant
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        senderUser: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const hasNextPage = messages.length > limit;
    const items = hasNextPage ? messages.slice(0, -1) : messages;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return {
      items: serialize(items),
      pagination: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  async createMessage(params: CreateMessageParams) {
    const { conversationId, contentText, contentType = ContentType.TEXT, mediaUrl, userId, userRole, tenantId } = params;

    // Check conversation access with tenant scope
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId, // CRITICAL: Scope by tenant
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // RBAC: sales agents can only send messages to their assigned conversations
    if (userRole === UserRole.SALES_AGENT && conversation.assignedAgentId !== userId) {
      throw new ForbiddenError('You do not have access to this conversation');
    }

    const message = await prisma.message.create({
      data: {
        tenantId, // CRITICAL: Add tenant ID
        conversationId,
        senderType: SenderType.AGENT,
        senderUserId: userId,
        contentText,
        contentType,
        mediaUrl,
      },
      include: {
        senderUser: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Update conversation metadata
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessageSenderType: SenderType.AGENT,
        lastAgentReplyAt: new Date(),
      },
    });

    // NEW: Send via WhatsApp if conversation came from WhatsApp
    try {
      await whatsAppService.sendMessage(
        tenantId,
        conversationId,
        contentText,
        userId
      );
      logger.info({ conversationId, tenantId }, 'WhatsApp message sent successfully');
    } catch (error) {
      logger.warn({ error, conversationId, tenantId }, 'Failed to send WhatsApp message');
      // Don't fail the whole request if WhatsApp send fails
    }

    return serialize(message);
  }
}

export const messagesService = new MessagesService();
