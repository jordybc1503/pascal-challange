import { aiQueue, AI_ANALYZE_CONVERSATION, AIAnalyzeConversationJobData } from './queue.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

class AIJobProducer {
  /**
   * Enqueues a conversation analysis job with debouncing.
   * If a job for the same conversation is already pending, it will be delayed.
   * This prevents duplicate analysis when multiple messages arrive in quick succession.
   */
  async enqueueConversationAnalysis(conversationId: string, tenantId: string): Promise<void> {
    try {
      const jobData: AIAnalyzeConversationJobData = {
        conversationId,
        tenantId, // CRITICAL: Include for tenant isolation in worker
      };

      await aiQueue.add(AI_ANALYZE_CONVERSATION, jobData, {
        jobId: `analyze-${tenantId}-${conversationId}`, // Tenant-scoped jobId for deduplication
        delay: config.ai.debounceMs, // Debounce delay
        // If a job with the same jobId exists, it will be replaced
      });

      logger.info({ conversationId, tenantId, jobId: `analyze-${tenantId}-${conversationId}` }, 'AI analysis job enqueued');
    } catch (error) {
      logger.error({ error, conversationId, tenantId }, 'Failed to enqueue AI analysis job');
      throw error;
    }
  }
}

export const aiJobProducer = new AIJobProducer();

/**
 * Helper function to queue an AI analysis job
 * @deprecated Use aiJobProducer.enqueueConversationAnalysis directly
 */
export async function queueJob(
  jobType: 'AI_ANALYZE_CONVERSATION',
  data: AIAnalyzeConversationJobData
): Promise<void> {
  if (jobType === 'AI_ANALYZE_CONVERSATION') {
    await aiJobProducer.enqueueConversationAnalysis(data.conversationId, data.tenantId);
  }
}
