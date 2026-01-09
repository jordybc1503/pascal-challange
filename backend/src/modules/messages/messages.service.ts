import { prisma } from '../../db/client.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { UserRole, SenderType, ContentType } from '@prisma/client';

interface GetMessagesParams {
  conversationId: string;
  limit?: number;
  cursor?: string;
  userId: string;
  userRole: UserRole;
}

interface CreateMessageParams {
  conversationId: string;
  contentText: string;
  contentType?: ContentType;
  mediaUrl?: string | null;
  userId: string;
  userRole: UserRole;
}

export class MessagesService {
  async getMessages(params: GetMessagesParams) {
    const { conversationId, limit = 50, cursor, userId, userRole } = params;

    // Check conversation access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // RBAC: sales agents can only access their assigned conversations
    if (userRole === UserRole.SALES_AGENT && conversation.assignedAgentId !== userId) {
      throw new ForbiddenError('You do not have access to this conversation');
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
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
      items,
      pagination: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  async createMessage(params: CreateMessageParams) {
    const { conversationId, contentText, contentType = ContentType.TEXT, mediaUrl, userId, userRole } = params;

    // Check conversation access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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

    return message;
  }
}

export const messagesService = new MessagesService();
