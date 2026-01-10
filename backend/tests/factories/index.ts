import { faker } from '@faker-js/faker';
import { prisma } from '@/db/client.js';
import bcrypt from 'bcrypt';
import { UserRole, Priority, SenderType, ContentType } from '@prisma/client';

/**
 * Factory for creating test Tenants
 */
export class TenantFactory {
  static async create(overrides?: {
    name?: string;
    slug?: string;
    ruc?: string;
  }) {
    return await prisma.tenant.create({
      data: {
        name: overrides?.name ?? faker.company.name(),
        slug: overrides?.slug ?? faker.helpers.slugify(faker.company.name()).toLowerCase(),
        ruc: overrides?.ruc ?? faker.string.numeric(11),
      },
    });
  }

  static async createMany(count: number) {
    const tenants = [];
    for (let i = 0; i < count; i++) {
      tenants.push(await this.create());
    }
    return tenants;
  }
}

/**
 * Factory for creating test Users
 */
export class UserFactory {
  static async create(
    tenantId: string,
    overrides?: {
      email?: string;
      password?: string;
      role?: UserRole;
    }
  ) {
    const password = overrides?.password ?? 'password123';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: overrides?.email ?? faker.internet.email(),
        passwordHash,
        role: overrides?.role ?? UserRole.SALES_AGENT,
        tenantId,
      },
    });

    // Return user with plain password for testing
    return { ...user, password };
  }

  static async createAdmin(tenantId: string, overrides?: { email?: string; password?: string }) {
    return await this.create(tenantId, {
      ...overrides,
      role: UserRole.TENANT_ADMIN,
    });
  }

  static async createAgent(tenantId: string, overrides?: { email?: string; password?: string }) {
    return await this.create(tenantId, {
      ...overrides,
      role: UserRole.SALES_AGENT,
    });
  }
}

/**
 * Factory for creating test Leads
 */
export class LeadFactory {
  static async create(
    tenantId: string,
    overrides?: {
      name?: string;
      email?: string;
      phone?: string;
      projectInterest?: string;
      metadata?: Record<string, any>;
    }
  ) {
    return await prisma.lead.create({
      data: {
        name: overrides?.name ?? faker.person.fullName(),
        email: overrides?.email ?? faker.internet.email(),
        phone: overrides?.phone ?? faker.phone.number(),
        projectInterest: overrides?.projectInterest ?? faker.company.catchPhrase(),
        metadata: overrides?.metadata ?? {},
        tenantId,
      },
    });
  }

  static async createMany(tenantId: string, count: number) {
    const leads = [];
    for (let i = 0; i < count; i++) {
      leads.push(await this.create(tenantId));
    }
    return leads;
  }
}

/**
 * Factory for creating test Conversations
 */
export class ConversationFactory {
  static async create(
    tenantId: string,
    leadId: string,
    overrides?: {
      assignedAgentId?: string | null;
      status?: string;
      aiSummary?: string | null;
      aiPriority?: Priority | null;
      aiTags?: string[];
      lastMessageAt?: Date;
      lastAgentReplyAt?: Date | null;
    }
  ) {
    return await prisma.conversation.create({
      data: {
        tenantId,
        leadId,
        assignedAgentId: overrides?.assignedAgentId ?? null,
        status: overrides?.status ?? 'OPEN',
        aiSummary: overrides?.aiSummary ?? faker.lorem.sentence(),
        aiPriority: overrides?.aiPriority ?? faker.helpers.arrayElement([
          Priority.HIGH,
          Priority.MEDIUM,
          Priority.LOW,
          null,
        ]),
        aiTags: overrides?.aiTags ?? faker.helpers.arrayElements(
          ['urgent', 'needs-proposal', 'budget-approved', 'follow-up'],
          faker.number.int({ min: 0, max: 3 })
        ),
        lastMessageAt: overrides?.lastMessageAt ?? new Date(),
        lastAgentReplyAt: overrides?.lastAgentReplyAt ?? null,
      },
      include: {
        lead: true,
        assignedAgent: true,
      },
    });
  }

  static async createWithMessages(
    tenantId: string,
    leadId: string,
    messageCount: number = 3,
    overrides?: Parameters<typeof ConversationFactory.create>[2]
  ) {
    const conversation = await this.create(tenantId, leadId, overrides);

    // Create messages for the conversation
    for (let i = 0; i < messageCount; i++) {
      await MessageFactory.create(tenantId, conversation.id, {
        senderType: i % 2 === 0 ? SenderType.LEAD : SenderType.AGENT,
        senderUserId: i % 2 === 0 ? null : overrides?.assignedAgentId,
      });
    }

    return await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        lead: true,
        assignedAgent: true,
        messages: true,
        _count: {
          select: { messages: true },
        },
      },
    });
  }
}

/**
 * Factory for creating test Messages
 */
export class MessageFactory {
  static async create(
    tenantId: string,
    conversationId: string,
    overrides?: {
      senderType?: SenderType;
      senderUserId?: string | null;
      contentText?: string;
      contentType?: ContentType;
      mediaUrl?: string | null;
    }
  ) {
    return await prisma.message.create({
      data: {
        tenantId,
        conversationId,
        senderType: overrides?.senderType ?? SenderType.LEAD,
        senderUserId: overrides?.senderUserId ?? null,
        contentText: overrides?.contentText ?? faker.lorem.sentence(),
        contentType: overrides?.contentType ?? ContentType.TEXT,
        mediaUrl: overrides?.mediaUrl ?? null,
      },
      include: {
        senderUser: true,
      },
    });
  }

  static async createMany(tenantId: string, conversationId: string, count: number) {
    const messages = [];
    for (let i = 0; i < count; i++) {
      messages.push(await this.create(tenantId, conversationId));
    }
    return messages;
  }
}

/**
 * Helper factory to create a complete test scenario
 */
export class ScenarioFactory {
  /**
   * Creates a complete test scenario with tenant, admin, agents, leads, and conversations
   */
  static async createCompleteScenario() {
    // Create tenant
    const tenant = await TenantFactory.create();

    // Create admin user
    const admin = await UserFactory.createAdmin(tenant.id, {
      email: 'admin@test.com',
      password: 'password123',
    });

    // Create 2 sales agents
    const agent1 = await UserFactory.createAgent(tenant.id, {
      email: 'agent1@test.com',
    });

    const agent2 = await UserFactory.createAgent(tenant.id, {
      email: 'agent2@test.com',
    });

    // Create 5 leads
    const leads = await LeadFactory.createMany(tenant.id, 5);

    // Create conversations (some assigned, some unassigned, mix of priorities)
    const conversations = [];

    // Assigned to agent1, high priority, with messages
    conversations.push(
      await ConversationFactory.createWithMessages(tenant.id, leads[0].id, 5, {
        assignedAgentId: agent1.id,
        aiPriority: Priority.HIGH,
        aiTags: ['urgent', 'needs-proposal'],
      })
    );

    // Assigned to agent1, medium priority
    conversations.push(
      await ConversationFactory.create(tenant.id, leads[1].id, {
        assignedAgentId: agent1.id,
        aiPriority: Priority.MEDIUM,
      })
    );

    // Unassigned, low priority
    conversations.push(
      await ConversationFactory.create(tenant.id, leads[2].id, {
        assignedAgentId: null,
        aiPriority: Priority.LOW,
      })
    );

    // Assigned to agent2, high priority
    conversations.push(
      await ConversationFactory.create(tenant.id, leads[3].id, {
        assignedAgentId: agent2.id,
        aiPriority: Priority.HIGH,
      })
    );

    // Unassigned, no AI analysis yet
    conversations.push(
      await ConversationFactory.create(tenant.id, leads[4].id, {
        assignedAgentId: null,
        aiPriority: null,
        aiTags: [],
        aiSummary: null,
      })
    );

    return {
      tenant,
      admin,
      agents: [agent1, agent2],
      leads,
      conversations,
    };
  }
}
