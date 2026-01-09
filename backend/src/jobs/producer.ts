import { aiQueue, AI_ANALYZE_CONVERSATION, AIAnalyzeConversationJobData } from './queue.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

class AIJobProducer {
  /**
   * Enqueues a conversation analysis job with debouncing.
   * If a job for the same conversation is already pending, it will be delayed.
   * This prevents duplicate analysis when multiple messages arrive in quick succession.
   */
  async enqueueConversationAnalysis(conversationId: string): Promise<void> {
    try {
      const jobData: AIAnalyzeConversationJobData = {
        conversationId,
      };

      await aiQueue.add(AI_ANALYZE_CONVERSATION, jobData, {
        jobId: `analyze-${conversationId}`, // Same jobId ensures deduplication
        delay: config.ai.debounceMs, // Debounce delay
        // If a job with the same jobId exists, it will be replaced
      });

      logger.debug({ conversationId }, 'AI analysis job enqueued');
    } catch (error) {
      logger.error({ error, conversationId }, 'Failed to enqueue AI analysis job');
      throw error;
    }
  }
}

export const aiJobProducer = new AIJobProducer();
