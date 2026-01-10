import { prisma } from '../../db/client.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors.js';
import { UserRole, Priority, Prisma } from '@prisma/client';
import { serialize } from '../../utils/serializer.js';

interface GetConversationsFilters {
  priority?: Priority;
  tag?: string;
  search?: string;
  unreplied?: boolean;
  limit?: number;
  cursor?: string;
  userId: string;
  userRole: UserRole;
  tenantId: string;
}

export class ConversationsService {
  async getConversations(filters: GetConversationsFilters) {
    const { priority, tag, search, unreplied, limit = 20, cursor, userId, userRole, tenantId } = filters;

    const where: Prisma.ConversationWhereInput = {
      tenantId, // CRITICAL: Scope by tenant
    };

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

    if (unreplied) {
      where.lastAgentReplyAt = null;
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
      items: serialize(items),
      pagination: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  async getConversationById(conversationId: string, tenantId: string, userId: string, userRole: UserRole) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId, // CRITICAL: Scope by tenant
      },
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

    return serialize(conversation);
  }

  async assignConversation(conversationId: string, agentId: string | null, tenantId: string, requestingUserRole: UserRole) {
    // Only tenant admins can assign conversations
    if (requestingUserRole !== UserRole.TENANT_ADMIN) {
      throw new ForbiddenError('Only tenant admins can assign conversations');
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId, // CRITICAL: Scope by tenant
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (agentId) {
      const agent = await prisma.user.findFirst({
        where: {
          id: agentId,
          tenantId, // CRITICAL: Ensure agent belongs to same tenant
        },
      });

      if (!agent) {
        throw new BadRequestError('Agent not found in this tenant');
      }

      if (agent.role !== UserRole.SALES_AGENT && agent.role !== UserRole.TENANT_ADMIN) {
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

    return serialize(updated);
  }
}

export const conversationsService = new ConversationsService();
