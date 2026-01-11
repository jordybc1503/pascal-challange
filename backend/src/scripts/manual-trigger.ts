
import { aiService } from '../modules/ai/ai.service.js';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger';
import { publishEvent } from '../jobs/publisher.js';
import dotenv from 'dotenv';
dotenv.config();

async function manualTrigger() {
    const SIMULATE_AI = false; // Set to true to bypass Google API (avoid 429 errors)

    console.log('🏁 Starting Manual AI Trigger...');
    if (SIMULATE_AI) console.log('⚠️  SIMULATION MODE ENABLED: Skipping real AI call');

    // 1. Get Conversation
    const conversation = await prisma.conversation.findFirst({
        orderBy: { lastMessageAt: 'desc' },
    });

    if (!conversation) {
        console.error('❌ No conversation found.');
        process.exit(1);
    }

    const { id: conversationId, tenantId } = conversation;
    console.log(`📝 Analyzing Conversation: ${conversationId} (Tenant: ${tenantId})`);

    try {
        let result;

        if (SIMULATE_AI) {
            // MOCK DATA
            console.log('🤖 Simulating AI analysis...');
            await new Promise(r => setTimeout(r, 1000)); // Fake delay
            result = {
                summary: 'Example Summary: Client is asking about pricing packages. Currently verifying budget integration.',
                priority: 'HIGH' as const,
                tags: ['pricing', 'simulation', 'budget'],
            };

            // Manually update DB since we skipped aiService
            await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    aiSummary: result.summary,
                    aiPriority: result.priority,
                    aiTags: result.tags, // Already simple strings
                    aiUpdatedAt: new Date(),
                },
            });
            console.log('✅ Mock DB Update Completed');

            console.log('✅ Analysis Result:', result);

            // 3. Emit
            console.log('📡 Publishing Socket Event...');
            await publishEvent('socket:emit', {
                room: `tenant:${tenantId}`,
                event: 'conversation:ai:update',
                data: {
                    conversationId,
                    aiData: {
                        summary: result.summary,
                        priority: result.priority,
                        tags: result.tags,
                        updatedAt: new Date().toISOString(),
                    },
                },
            });
            console.log('✅ Event Published to Redis');

        } else {
            // REAL CALL
            // 2. Analyze
            console.log('🤖 Calling aiService.analyzeConversation...');
            await aiService.analyzeConversation(conversationId, tenantId);

            // Refetch conversation to get AI results
            const updatedConversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                select: {
                    aiSummary: true,
                    aiPriority: true,
                    aiTags: true,
                    aiUpdatedAt: true,
                }
            });

            if (!updatedConversation) throw new Error('Failed to fetch updated conversation');

            console.log('✅ Analysis Result:', updatedConversation);

            // 3. Emit
            console.log('📡 Publishing Socket Event...');
            await publishEvent('socket:emit', {
                room: `tenant:${tenantId}`,
                event: 'conversation:ai:update',
                data: {
                    conversationId,
                    aiData: {
                        summary: updatedConversation.aiSummary,
                        priority: updatedConversation.aiPriority,
                        tags: updatedConversation.aiTags, // String[]
                        updatedAt: updatedConversation.aiUpdatedAt?.toISOString(),
                    },
                },
            });
            console.log('✅ Event Published to Redis');
        }

    } catch (error) {
        console.error('❌ Manual Trigger Failed:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

manualTrigger();
