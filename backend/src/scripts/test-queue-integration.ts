
import { queueJob } from '../jobs/producer.js';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

async function testIntegration() {
    console.log('🧪 Testing Queue Integration...');

    // 1. Get a recent conversation
    const conversation = await prisma.conversation.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { messages: true }
    });

    if (!conversation) {
        console.error('❌ No conversation found in DB');
        process.exit(1);
    }

    console.log(`📝 Using Conversation: ${conversation.id} (Tenant: ${conversation.tenantId})`);

    // 2. Enqueue Job
    try {
        console.log('🚀 Calling queueJob...');
        await queueJob('AI_ANALYZE_CONVERSATION', {
            conversationId: conversation.id,
            tenantId: conversation.tenantId
        });
        console.log('✅ queueJob returned successfully.');

        // 3. Monitor Redis to see if job is there
        const { aiQueue } = await import('../jobs/queue.js');
        const delayedCount = await aiQueue.getDelayedCount();
        const waitingCount = await aiQueue.getWaitingCount();
        const activeCount = await aiQueue.getActiveCount();

        console.log('📊 Queue Status:', { delayed: delayedCount, waiting: waitingCount, active: activeCount });

    } catch (error) {
        console.error('❌ queueJob failed:', error);
    } finally {
        await prisma.$disconnect();
        setTimeout(() => process.exit(0), 1000);
    }
}

testIntegration();
