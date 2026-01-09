import { prisma } from '../../db/client.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors.js';
import { UserRole, Priority } from '@prisma/client';

interface GetConversationsFilters {
  priority?: Priority;
  tag?: string;
  search?: string;
  limit?: number;
  cursor?: string;
  userId: string;
  userRole: UserRole;
}

export class ConversationsService {
  async getConversations(filters: GetConversationsFilters) {
    const { priority, tag, search, limit = 20, cursor, userId, userRole } = filters;

    const where: any = {};

    // RBAC: sales agents can only see their assigned conversations
    if (userRole === UserRole.SALES_AGENT) {
      where.assignedAgentId = userId;
    }

    if (priority) {
      where.aiPriority = priority;
    }

    if (tag) {
      where.aiTags = {
        has: tag,
      };
    }

    if (search) {
      where.OR = [
        { aiSummary: { contains: search, mode: 'insensitive' } },
        { lead: { name: { contains: search, mode: 'insensitive' } } },
        { lead: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { lastMessageAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    const hasNextPage = conversations.length > limit;
    const items = hasNextPage ? conversations.slice(0, -1) : conversations;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return {
      items,
      pagination: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  async getConversationById(conversationId: string, userId: string, userRole: UserRole) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: true,
        assignedAgent: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // RBAC: sales agents can only see their assigned conversations
    if (userRole === UserRole.SALES_AGENT && conversation.assignedAgentId !== userId) {
      throw new ForbiddenError('You do not have access to this conversation');
    }

    return conversation;
  }

  async assignConversation(conversationId: string, agentId: string | null, requestingUserId: string, requestingUserRole: UserRole) {
    // Only admins can assign conversations
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can assign conversations');
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (agentId) {
      const agent = await prisma.user.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new BadRequestError('Agent not found');
      }

      if (agent.role !== UserRole.SALES_AGENT && agent.role !== UserRole.ADMIN) {
        throw new BadRequestError('User is not a sales agent or admin');
      }
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedAgentId: agentId },
      include: {
        lead: true,
        assignedAgent: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }
}

export const conversationsService = new ConversationsService();
