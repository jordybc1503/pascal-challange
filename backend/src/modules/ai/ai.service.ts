import { logger } from '../../utils/logger.js';
import { prisma } from '../../db/client.js';
import { config as appConfig } from '../../config/env.js';
import type { IAIProvider, AIProviderConfig, AIUpdatePolicy } from './types.js';
import { AIUpdatePolicySchema, DEFAULT_AI_UPDATE_POLICY } from './types.js';
import { GeminiAIProvider } from './providers/gemini.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { BadRequestError } from '../../utils/errors.js';

export class AIService {
  /**
   * Get AI provider instance for a tenant
   */
  private async getProviderForTenant(tenantId: string): Promise<IAIProvider> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiConfig: true },
    });

    // Fallback to global config if tenant config is missing
    let config = tenant?.aiConfig as AIProviderConfig | null;

    if (!config && appConfig.ai.apiKey) {
      logger.info({ tenantId }, 'Using global AI configuration');
      config = {
        provider: appConfig.ai.provider,
        apiKey: appConfig.ai.apiKey,
        model: appConfig.ai.model,
      };
    }

    if (!config) {
      throw new BadRequestError('AI not configured for this tenant and no global config found');
    }

    switch (config.provider) {
      case 'gemini':
        return new GeminiAIProvider(config.apiKey, config.model);
      case 'openai':
        return new OpenAIProvider(config.apiKey, config.model);
      // Add more providers here
      // case 'openai':
      //   return new OpenAIProvider(config.apiKey, config.model);
      default:
        throw new BadRequestError(`Unsupported AI provider: ${config.provider}`);
    }
  }

  /**
   * Get AI update policy for a conversation (conversation-level or tenant-level)
   *
   */
  private async getUpdatePolicy(conversationId: string, tenantId: string): Promise<AIUpdatePolicy> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { aiUpdatePolicy: true },
    });

    if (conversation?.aiUpdatePolicy) {
      return AIUpdatePolicySchema.parse(conversation.aiUpdatePolicy);
    }

    // Fallback to tenant-level policy
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiConfig: true },
    });

    const aiConfig = tenant?.aiConfig as { updatePolicy?: AIUpdatePolicy } | null;
    if (aiConfig?.updatePolicy) {
      return AIUpdatePolicySchema.parse(aiConfig.updatePolicy);
    }

    // Default policy
    return DEFAULT_AI_UPDATE_POLICY;
  }

  /**
   * Check if conversation should be analyzed based on update policy
   */
  async shouldAnalyzeConversation(conversationId: string, tenantId: string): Promise<boolean> {
    const policy = await this.getUpdatePolicy(conversationId, tenantId);

    // CRITICAL for testing: Update to always analyze
    logger.info('🔍 Checking if should analyze', { msg: 'FORCED TRUE FOR TESTING' });
    return true;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        messagesSinceLastAI: true,
        aiUpdatedAt: true,
      },
    });

    if (!conversation) return false;

    if (policy.mode === 'EVERY_N_MESSAGES') {
      const shouldAnalyze = conversation.messagesSinceLastAI >= (policy.n || 3);
      logger.info('🔍 Checking if should analyze (messages)', {
        conversationId,
        messagesSinceLastAI: conversation.messagesSinceLastAI,
        threshold: policy.n,
        shouldAnalyze,
      });
      return shouldAnalyze;
    }

    if (policy.mode === 'EVERY_X_MINUTES') {
      if (!conversation.aiUpdatedAt) return true; // Never analyzed

      const minutesSinceLastUpdate =
        (Date.now() - conversation.aiUpdatedAt.getTime()) / 1000 / 60;

      const shouldAnalyze = minutesSinceLastUpdate >= (policy.minutes || 30);
      logger.info('🔍 Checking if should analyze (time)', {
        conversationId,
        minutesSinceLastUpdate: minutesSinceLastUpdate.toFixed(1),
        threshold: policy.minutes,
        shouldAnalyze,
      });
      return shouldAnalyze;
    }

    return false;
  }

  /**
   * Analyze a conversation and update AI fields
   */
  async analyzeConversation(conversationId: string, tenantId: string): Promise<void> {
    logger.info('🤖 Starting AI analysis', { conversationId, tenantId });

    const provider = await this.getProviderForTenant(tenantId);

    // Get conversation with recent messages
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20, // Last 20 messages for context
          select: {
            senderType: true,
            contentText: true,
            createdAt: true,
          },
        },
        lead: {
          select: { name: true },
        },
      },
    });

    if (!conversation) {
      logger.warn('Conversation not found for AI analysis', { conversationId });
      return;
    }

    // Prepare context for AI
    const context = {
      conversationId,
      previousSummary: conversation.aiSummary,
      previousSummaryVersion: conversation.aiSummaryVersion,
      recentMessages: conversation.messages.reverse(), // Oldest to newest
      leadName: conversation.lead.name,
    };

    // Call AI provider with retry logic
    const analysis = await this.analyzeWithRetry(() => provider.analyzeConversation(context));

    // Update conversation with AI results
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        aiSummary: analysis.summary,
        aiSummaryVersion: { increment: 1 },
        aiSummaryUpdatedAt: new Date(),
        aiPriority: analysis.priority as 'HIGH' | 'MEDIUM' | 'LOW',
        aiTags: analysis.tags.map((t) => t.tag),
        aiMetadata: {
          priorityReason: analysis.priorityReason,
          tagConfidences: Object.fromEntries(
            analysis.tags.map((t) => [t.tag, t.confidence || 1.0])
          ),
          analyzedAt: new Date().toISOString(),
        },
        aiUpdatedAt: new Date(),
        messagesSinceLastAI: 0, // Reset counter
      },
    });

    logger.info('✅ AI analysis completed', {
      conversationId,
      priority: analysis.priority,
      tags: analysis.tags.map((t) => t.tag),
    });
  }

  /**
   * Retry logic for AI calls
   */
  private async analyzeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 5,
    delayMs = 10000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) throw error;

        const waitTime = delayMs * Math.pow(2, attempt - 1);
        logger.warn('⚠️ AI call failed, retrying...', {
          attempt,
          maxRetries,
          waitTime,
          error: error instanceof Error ? error.message : String(error),
        });

        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    throw new Error('Retry logic failed unexpectedly');
  }

  /**
   * Configure AI for a tenant
   */
  async configureTenantAI(
    tenantId: string,
    config: AIProviderConfig & { updatePolicy?: AIUpdatePolicy }
  ): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        aiConfig: config as any,
      },
    });

    logger.info('✅ AI configured for tenant', {
      tenantId,
      provider: config.provider,
      hasUpdatePolicy: !!config.updatePolicy,
    });
  }
}

export const aiService = new AIService();
