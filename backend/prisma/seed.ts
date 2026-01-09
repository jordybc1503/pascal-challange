import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { prisma } from '../src/db/client.js';
import { logger } from '../src/utils/logger.js';
import { UserRole, SenderType, Priority } from '@prisma/client';

async function seed() {
  try {
    logger.info('🌱 Starting database seed...');

    // Clean existing data (in reverse order of dependencies)
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.whatsAppCredential.deleteMany();
    await prisma.whatsAppChannel.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    logger.info('🧹 Cleaned existing data');

    // Create Tenants (Companies)
    const tenant1 = await prisma.tenant.create({
      data: {
        name: 'Acme Software Corp',
        slug: 'acme',
      },
    });

    const tenant2 = await prisma.tenant.create({
      data: {
        name: 'TechStart Solutions',
        slug: 'techstart',
      },
    });

    logger.info('🏢 Created tenants (companies)');

    // Create users with hashed password
    const passwordHash = await bcrypt.hash('password123', 10);

    // Acme users
    const acmeAdmin = await prisma.user.create({
      data: {
        email: 'admin@acme.com',
        passwordHash,
        role: UserRole.TENANT_ADMIN,
        tenantId: tenant1.id,
      },
    });

    const acmeAgent1 = await prisma.user.create({
      data: {
        email: faker.internet.email({ firstName: 'Sarah', lastName: 'Johnson', provider: 'acme.com' }).toLowerCase(),
        passwordHash,
        role: UserRole.SALES_AGENT,
        tenantId: tenant1.id,
      },
    });

    const acmeAgent2 = await prisma.user.create({
      data: {
        email: faker.internet.email({ firstName: 'Michael', lastName: 'Chen', provider: 'acme.com' }).toLowerCase(),
        passwordHash,
        role: UserRole.SALES_AGENT,
        tenantId: tenant1.id,
      },
    });

    // TechStart users
    const techstartAdmin = await prisma.user.create({
      data: {
        email: 'admin@techstart.com',
        passwordHash,
        role: UserRole.TENANT_ADMIN,
        tenantId: tenant2.id,
      },
    });

    const techstartAgent = await prisma.user.create({
      data: {
        email: faker.internet.email({ firstName: 'Emma', lastName: 'Wilson', provider: 'techstart.com' }).toLowerCase(),
        passwordHash,
        role: UserRole.SALES_AGENT,
        tenantId: tenant2.id,
      },
    });

    logger.info('👥 Created users');

    // Create leads for Acme
    const acmeLeads = [];
    for (let i = 0; i < 8; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const company = faker.company.name();

      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          name: `${firstName} ${lastName}`,
          email: faker.internet.email({ firstName, lastName }).toLowerCase(),
          phone: faker.phone.number('+1##########'),
          projectInterest: faker.helpers.arrayElement([
            'E-commerce platform',
            'Mobile app development',
            'AI integration',
            'Custom CRM system',
            'Web application',
            'API development',
          ]),
          metadata: {
            source: faker.helpers.arrayElement(['website', 'referral', 'linkedin', 'facebook', 'google-ads']),
            company,
            budget: faker.helpers.arrayElement(['10k-25k', '25k-50k', '50k-100k', '100k+']),
            industry: faker.helpers.arrayElement(['Technology', 'Healthcare', 'Finance', 'Retail', 'Education']),
          },
        },
      });
      acmeLeads.push(lead);
    }

    // Create leads for TechStart
    const techstartLeads = [];
    for (let i = 0; i < 5; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant2.id,
          name: `${firstName} ${lastName}`,
          email: faker.internet.email({ firstName, lastName }).toLowerCase(),
          phone: faker.phone.number('+1##########'),
          projectInterest: faker.helpers.arrayElement([
            'Cloud migration',
            'DevOps consulting',
            'Security audit',
            'Infrastructure setup',
          ]),
          metadata: {
            source: faker.helpers.arrayElement(['website', 'referral', 'linkedin']),
            company: faker.company.name(),
            urgency: faker.helpers.arrayElement(['low', 'medium', 'high']),
          },
        },
      });
      techstartLeads.push(lead);
    }

    logger.info('🎯 Created leads');

    // Create conversations for Acme
    const acmeConversations = [];
    for (let i = 0; i < 6; i++) {
      const lead = acmeLeads[i];
      const agent = i % 2 === 0 ? acmeAgent1 : acmeAgent2;
      const hoursAgo = faker.number.int({ min: 1, max: 48 });
      const hasAI = faker.datatype.boolean(0.7); // 70% have AI analysis

      const conv = await prisma.conversation.create({
        data: {
          tenant: { connect: { id: tenant1.id } },
          lead: { connect: { id: lead.id } },
          assignedAgent: { connect: { id: agent.id } },
          lastMessageAt: new Date(Date.now() - hoursAgo * 3600000),
          lastMessageSenderType: faker.helpers.arrayElement([SenderType.LEAD, SenderType.AGENT]),
          lastAgentReplyAt: faker.datatype.boolean(0.6) ? new Date(Date.now() - (hoursAgo + 1) * 3600000) : null,
          aiSummary: hasAI ? faker.lorem.sentence(12) : null,
          aiPriority: hasAI ? faker.helpers.arrayElement([Priority.LOW, Priority.MEDIUM, Priority.HIGH]) : null,
          aiTags: hasAI ? faker.helpers.arrayElements(['urgent', 'budget-approved', 'needs-proposal', 'technical', 'pricing', 'timeline'], { min: 1, max: 3 }) : [],
          aiUpdatedAt: hasAI ? new Date(Date.now() - hoursAgo * 3600000) : null,
        },
      });
      acmeConversations.push({ conv, lead, agent });
    }

    // Create conversations for TechStart
    const techstartConversations = [];
    for (let i = 0; i < 3; i++) {
      const lead = techstartLeads[i];
      const hoursAgo = faker.number.int({ min: 1, max: 24 });

      const conv = await prisma.conversation.create({
        data: {
          tenant: { connect: { id: tenant2.id } },
          lead: { connect: { id: lead.id } },
          assignedAgent: { connect: { id: techstartAgent.id } },
          lastMessageAt: new Date(Date.now() - hoursAgo * 3600000),
          lastMessageSenderType: SenderType.LEAD,
          aiSummary: faker.lorem.sentence(10),
          aiPriority: faker.helpers.arrayElement([Priority.LOW, Priority.MEDIUM, Priority.HIGH]),
          aiTags: faker.helpers.arrayElements(['consulting', 'cloud', 'devops', 'urgent'], { min: 1, max: 2 }),
          aiUpdatedAt: new Date(Date.now() - hoursAgo * 3600000),
        },
      });
      techstartConversations.push({ conv, lead, agent: techstartAgent });
    }

    logger.info('💬 Created conversations');

    // Create messages for Acme conversations
    for (const { conv, lead, agent } of acmeConversations) {
      const messageCount = faker.number.int({ min: 3, max: 10 });
      const messages = [];

      for (let i = 0; i < messageCount; i++) {
        const isLead = i % 2 === 0;
        const hoursAgo = messageCount - i;

        messages.push({
          tenantId: tenant1.id,
          conversationId: conv.id,
          senderType: isLead ? SenderType.LEAD : SenderType.AGENT,
          senderUserId: isLead ? null : agent.id,
          contentText: isLead
            ? faker.helpers.arrayElement([
                `Hi, I'm interested in ${lead.projectInterest}`,
                `What's your availability for a call?`,
                `Can you send me a proposal?`,
                `What's the estimated timeline?`,
                `Do you have experience in ${(lead.metadata as any).industry}?`,
                `Our budget is around ${(lead.metadata as any).budget}`,
              ])
            : faker.helpers.arrayElement([
                `Hello ${lead.name.split(' ')[0]}! I'd be happy to help with that.`,
                `We have extensive experience in this area.`,
                `I can schedule a call for tomorrow. Does that work?`,
                `Let me prepare a detailed proposal for you.`,
                `Our typical timeline for this is 8-12 weeks.`,
                `Yes, we've worked with several clients in your industry.`,
              ]),
          createdAt: new Date(Date.now() - hoursAgo * 3600000),
        });
      }

      await prisma.message.createMany({ data: messages });
    }

    // Create messages for TechStart conversations
    for (const { conv, lead, agent } of techstartConversations) {
      const messageCount = faker.number.int({ min: 2, max: 6 });
      const messages = [];

      for (let i = 0; i < messageCount; i++) {
        const isLead = i % 2 === 0;
        const hoursAgo = messageCount - i;

        messages.push({
          tenantId: tenant2.id,
          conversationId: conv.id,
          senderType: isLead ? SenderType.LEAD : SenderType.AGENT,
          senderUserId: isLead ? null : agent.id,
          contentText: isLead
            ? faker.lorem.sentence(faker.number.int({ min: 5, max: 15 }))
            : faker.lorem.sentence(faker.number.int({ min: 5, max: 12 })),
          createdAt: new Date(Date.now() - hoursAgo * 3600000),
        });
      }

      await prisma.message.createMany({ data: messages });
    }

    logger.info('📨 Created messages');

    logger.info('✅ Seed completed successfully!');
    logger.info('');
    logger.info('🏢 Tenants:');
    logger.info(`  - ${tenant1.name} (slug: ${tenant1.slug})`);
    logger.info(`  - ${tenant2.name} (slug: ${tenant2.slug})`);
    logger.info('');
    logger.info('🔑 Test credentials (password for all: password123):');
    logger.info('  Acme Tenant:');
    logger.info(`    Admin:  ${acmeAdmin.email}`);
    logger.info(`    Agent1: ${acmeAgent1.email}`);
    logger.info(`    Agent2: ${acmeAgent2.email}`);
    logger.info('  TechStart Tenant:');
    logger.info(`    Admin:  ${techstartAdmin.email}`);
    logger.info(`    Agent:  ${techstartAgent.email}`);
    logger.info('');
    logger.info('📊 Statistics:');
    logger.info(`  - ${acmeLeads.length} leads for Acme`);
    logger.info(`  - ${techstartLeads.length} leads for TechStart`);
    logger.info(`  - ${acmeConversations.length} conversations for Acme`);
    logger.info(`  - ${techstartConversations.length} conversations for TechStart`);
    logger.info('');

  } catch (error) {
    logger.error({ error }, 'Error seeding database');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
