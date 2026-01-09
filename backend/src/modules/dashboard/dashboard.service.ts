import { prisma } from '../../db/client.js';
import { UserRole, SenderType } from '@prisma/client';

export class DashboardService {
  async getMetrics(userId: string, userRole: UserRole) {
    const where: any = {};

    // RBAC: sales agents only see their assigned conversations
    if (userRole === UserRole.SALES_AGENT) {
      where.assignedAgentId = userId;
    }

    // Total conversations
    const totalConversations = await prisma.conversation.count({ where });

    // Total unreplied conversations
    // Last message from lead and no agent reply after that
    const unrepliedConversations = await prisma.conversation.count({
      where: {
        ...where,
        lastMessageSenderType: SenderType.LEAD,
        OR: [
          { lastAgentReplyAt: null },
          {
            lastAgentReplyAt: {
              lt: prisma.conversation.fields.lastMessageAt,
            },
          },
        ],
      },
    });

    // Priority breakdown
    const priorityBreakdown = await prisma.conversation.groupBy({
      by: ['aiPriority'],
      where,
      _count: {
        id: true,
      },
    });

    const breakdown = {
      high: 0,
      medium: 0,
      low: 0,
      unanalyzed: 0,
    };

    priorityBreakdown.forEach((item) => {
      if (item.aiPriority === 'HIGH') {
        breakdown.high = item._count.id;
      } else if (item.aiPriority === 'MEDIUM') {
        breakdown.medium = item._count.id;
      } else if (item.aiPriority === 'LOW') {
        breakdown.low = item._count.id;
      } else {
        breakdown.unanalyzed += item._count.id;
      }
    });

    return {
      totalConversations,
      totalUnreplied: unrepliedConversations,
      priorityBreakdown: breakdown,
    };
  }
}

export const dashboardService = new DashboardService();
