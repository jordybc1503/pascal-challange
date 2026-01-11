import { Worker, Job } from 'bullmq';
import { config } from '../config/env.js';
import { redisConnection } from './redis.js';
import { logger } from '../utils/logger.js';
import { AI_ANALYZE_CONVERSATION, AIAnalyzeConversationJobData } from './queue.js';
import { aiService } from '../modules/ai/ai.service.js';
import { prisma } from '../db/client.js';

export const createAIWorker = () => {
  const worker = new Worker(
    config.bullmq.queueName,
    async (job: Job<AIAnalyzeConversationJobData>) => {
      logger.info({ jobName: job.name, jobId: job.id }, '📥 Worker received a job (Raw Debug)');

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

  logger.info({ conversationId, tenantId, jobId: job.id }, 'Processing AI conversation analysis');

  try {
    // Check if analysis should run based on update policy
    const shouldAnalyze = await aiService.shouldAnalyzeConversation(conversationId, tenantId);

    if (!shouldAnalyze) {
      logger.info('⏭️ Skipping AI analysis (policy not met)', { conversationId });
      return { skipped: true, reason: 'policy_not_met' };
    }

    // Run AI analysis
    await aiService.analyzeConversation(conversationId, tenantId);

    // Get updated conversation data to emit
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        aiSummary: true,
        aiPriority: true,
        aiTags: true,
        aiUpdatedAt: true,
        aiMetadata: true,
      },
    });

    // Emit event via Redis Pub/Sub (handled by main server)
    const { publishEvent } = await import('./publisher.js');
    await publishEvent('socket:emit', {
      room: `tenant:${tenantId}`,
      event: 'conversation:ai:update',
      data: {
        conversationId,
        aiData: {
          summary: updatedConversation?.aiSummary,
          priority: updatedConversation?.aiPriority,
          tags: updatedConversation?.aiTags,
          updatedAt: updatedConversation?.aiUpdatedAt?.toISOString(),
        },
      },
    });

    logger.info('✅ AI analysis job completed', { conversationId });

    return { success: true };
  } catch (error) {
    logger.error('❌ AI analysis job failed', {
      conversationId,
      tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
