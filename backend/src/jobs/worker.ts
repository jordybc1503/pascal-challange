import { Worker, Job } from 'bullmq';
import { config } from '../config/env.js';
import { redisConnection } from './redis.js';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { AI_ANALYZE_CONVERSATION, AIAnalyzeConversationJobData } from './queue.js';
import { analyzeConversation } from '../modules/ai/analyzer.js';
import { emitConversationAIUpdate } from '../sockets/events.js';
import { Priority } from '@prisma/client';

export const createAIWorker = () => {
  const worker = new Worker(
    config.bullmq.queueName,
    async (job: Job<AIAnalyzeConversationJobData>) => {
      if (job.name === AI_ANALYZE_CONVERSATION) {
        return await processConversationAnalysis(job);
      }

      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: redisConnection,
      concurrency: config.bullmq.concurrency,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, jobName: job?.name, error }, 'Job failed');
  });

  worker.on('error', (error) => {
    logger.error({ error }, 'Worker error');
  });

  logger.info({ concurrency: config.bullmq.concurrency }, 'AI worker started');

  return worker;
};

async function processConversationAnalysis(job: Job<AIAnalyzeConversationJobData>) {
  const { conversationId, tenantId } = job.data;

  logger.info({ conversationId, tenantId, jobId: job.id }, 'Processing conversation analysis');

  try {
    // Fetch the conversation to ensure it exists (tenant-scoped)
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        tenantId, // CRITICAL: Ensure tenant isolation
      },
    });

    if (!conversation) {
      logger.warn({ conversationId, tenantId }, 'Conversation not found, skipping analysis');
      return { skipped: true, reason: 'conversation_not_found' };
    }

    // Fetch the last N messages (e.g., 30) - tenant-scoped via conversation
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        conversation: {
          tenantId, // CRITICAL: Verify tenant ownership
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        contentText: true,
        senderType: true,
        createdAt: true,
      },
    });

    if (messages.length === 0) {
      logger.info({ conversationId, tenantId }, 'No messages to analyze');
      return { analyzed: false, reason: 'no_messages' };
    }

    // Reverse to have chronological order for AI
    messages.reverse();

    // Call AI analysis
    const analysis = await analyzeConversation(messages);

    // Map priority string to enum
    const priorityMap: Record<string, Priority> = {
      high: Priority.HIGH,
      medium: Priority.MEDIUM,
      low: Priority.LOW,
    };

    // Update conversation with AI results
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        aiSummary: analysis.summary,
        aiPriority: priorityMap[analysis.priority],
        aiTags: analysis.tags,
        aiUpdatedAt: new Date(),
      },
    });

    // Emit socket event to notify clients (tenant-scoped)
    emitConversationAIUpdate(conversationId, tenantId, {
      summary: updated.aiSummary,
      priority: updated.aiPriority,
      tags: updated.aiTags,
      updatedAt: updated.aiUpdatedAt,
    });

    logger.info(
      { conversationId, priority: analysis.priority, tags: analysis.tags },
      'Conversation analysis completed'
    );

    return {
      analyzed: true,
      conversationId,
      priority: analysis.priority,
      tagsCount: analysis.tags.length,
    };
  } catch (error) {
    logger.error({ error, conversationId }, 'Error processing conversation analysis');
    throw error;
  }
}
