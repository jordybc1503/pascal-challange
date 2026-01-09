import bcrypt from 'bcrypt';
import { prisma } from '../src/db/client.js';
import { logger } from '../src/utils/logger.js';
import { UserRole, SenderType } from '@prisma/client';

async function seed() {
  try {
    logger.info('🌱 Starting database seed...');

    // Clean existing data
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();

    logger.info('🧹 Cleaned existing data');

    // Create users
    const passwordHash = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    const agent1 = await prisma.user.create({
      data: {
        email: 'agent1@test.com',
        passwordHash,
        role: UserRole.SALES_AGENT,
      },
    });

    const agent2 = await prisma.user.create({
      data: {
        email: 'agent2@test.com',
        passwordHash,
        role: UserRole.SALES_AGENT,
      },
    });

    logger.info('👥 Created users');

    // Create leads
    const lead1 = await prisma.lead.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        projectInterest: 'E-commerce platform',
        metadata: {
          source: 'website',
          company: 'TechCorp',
        },
      },
    });

    const lead2 = await prisma.lead.create({
      data: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
        projectInterest: 'Mobile app development',
        metadata: {
          source: 'referral',
          budget: '50k-100k',
        },
      },
    });

    const lead3 = await prisma.lead.create({
      data: {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '+1122334455',
        projectInterest: 'AI integration',
        metadata: {
          source: 'linkedin',
          urgency: 'high',
        },
      },
    });

    logger.info('🎯 Created leads');

    // Create conversations
    const conv1 = await prisma.conversation.create({
      data: {
        leadId: lead1.id,
        assignedAgentId: agent1.id,
        lastMessageAt: new Date(),
        lastMessageSenderType: SenderType.LEAD,
      },
    });

    const conv2 = await prisma.conversation.create({
      data: {
        leadId: lead2.id,
        assignedAgentId: agent1.id,
        lastMessageAt: new Date(Date.now() - 3600000), // 1 hour ago
        lastMessageSenderType: SenderType.AGENT,
        lastAgentReplyAt: new Date(Date.now() - 3600000),
        aiSummary: 'Discussing mobile app requirements and timeline',
        aiPriority: 'MEDIUM',
        aiTags: ['mobile', 'app', 'timeline'],
        aiUpdatedAt: new Date(),
      },
    });

    const conv3 = await prisma.conversation.create({
      data: {
        leadId: lead3.id,
        assignedAgentId: agent2.id,
        lastMessageAt: new Date(Date.now() - 7200000), // 2 hours ago
        lastMessageSenderType: SenderType.LEAD,
        aiSummary: 'Urgent AI integration project, needs immediate attention',
        aiPriority: 'HIGH',
        aiTags: ['ai', 'urgent', 'integration'],
        aiUpdatedAt: new Date(),
      },
    });

    logger.info('💬 Created conversations');

    // Create messages for conversation 1
    await prisma.message.createMany({
      data: [
        {
          conversationId: conv1.id,
          senderType: SenderType.LEAD,
          contentText: 'Hi, I\'m interested in building an e-commerce platform',
          createdAt: new Date(Date.now() - 7200000),
        },
        {
          conversationId: conv1.id,
          senderType: SenderType.AGENT,
          senderUserId: agent1.id,
          contentText: 'Hello John! I\'d be happy to help. Can you tell me more about your requirements?',
          createdAt: new Date(Date.now() - 7000000),
        },
        {
          conversationId: conv1.id,
          senderType: SenderType.LEAD,
          contentText: 'I need a platform with payment integration, inventory management, and a modern design',
          createdAt: new Date(Date.now() - 6900000),
        },
        {
          conversationId: conv1.id,
          senderType: SenderType.AGENT,
          senderUserId: agent1.id,
          contentText: 'Great! We can definitely help with that. What\'s your timeline and budget?',
          createdAt: new Date(Date.now() - 6800000),
        },
        {
          conversationId: conv1.id,
          senderType: SenderType.LEAD,
          contentText: 'I\'m looking to launch in 3 months. Budget is around $50k',
          createdAt: new Date(),
        },
      ],
    });

    // Create messages for conversation 2
    await prisma.message.createMany({
      data: [
        {
          conversationId: conv2.id,
          senderType: SenderType.LEAD,
          contentText: 'Need a mobile app for iOS and Android',
          createdAt: new Date(Date.now() - 10800000),
        },
        {
          conversationId: conv2.id,
          senderType: SenderType.AGENT,
          senderUserId: agent1.id,
          contentText: 'Sure! What features are you looking for?',
          createdAt: new Date(Date.now() - 10700000),
        },
        {
          conversationId: conv2.id,
          senderType: SenderType.LEAD,
          contentText: 'User authentication, real-time chat, and push notifications',
          createdAt: new Date(Date.now() - 10600000),
        },
        {
          conversationId: conv2.id,
          senderType: SenderType.AGENT,
          senderUserId: agent1.id,
          contentText: 'Perfect! Let me prepare a proposal for you. I\'ll send it by tomorrow.',
          createdAt: new Date(Date.now() - 3600000),
        },
      ],
    });

    // Create messages for conversation 3
    await prisma.message.createMany({
      data: [
        {
          conversationId: conv3.id,
          senderType: SenderType.LEAD,
          contentText: 'URGENT: Need AI integration for our existing platform ASAP',
          createdAt: new Date(Date.now() - 14400000),
        },
        {
          conversationId: conv3.id,
          senderType: SenderType.AGENT,
          senderUserId: agent2.id,
          contentText: 'I understand the urgency. Can you describe what kind of AI features you need?',
          createdAt: new Date(Date.now() - 14300000),
        },
        {
          conversationId: conv3.id,
          senderType: SenderType.LEAD,
          contentText: 'We need chatbot, document analysis, and predictive analytics. Timeline is 1 month.',
          createdAt: new Date(Date.now() - 7200000),
        },
      ],
    });

    logger.info('📨 Created messages');

    logger.info('✅ Seed completed successfully!');
    logger.info('');
    logger.info('🔑 Test credentials:');
    logger.info('  Admin:  admin@test.com / password123');
    logger.info('  Agent1: agent1@test.com / password123');
    logger.info('  Agent2: agent2@test.com / password123');
    logger.info('');

  } catch (error) {
    logger.error({ error }, 'Error seeding database');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
