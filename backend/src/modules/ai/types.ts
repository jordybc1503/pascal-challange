import { z } from 'zod';
import { Priority } from '@prisma/client';

// ============================================
// AI Provider Types
// ============================================

export const AIProviderName = z.enum(['gemini', 'openai', 'claude']);
export type AIProviderName = z.infer<typeof AIProviderName>;

export interface AIProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  model?: string;
}

// ============================================
// AI Analysis Output Schemas
// ============================================

export const AITagSchema = z.object({
  tag: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

export const AIAnalysisOutputSchema = z.object({
  summary: z.string().describe('Resumen conciso de la conversación (max 500 caracteres)'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Prioridad de la conversación'),
  priorityReason: z.string().describe('Razón breve de la prioridad asignada'),
  tags: z.array(AITagSchema).describe('Etiquetas clasificatorias (ej: prospecto, precios, soporte, queja)'),
});

export type AIAnalysisOutput = z.infer<typeof AIAnalysisOutputSchema>;

// ============================================
// Update Policy Types
// ============================================

export const AIUpdatePolicySchema = z.object({
  mode: z.enum(['EVERY_N_MESSAGES', 'EVERY_X_MINUTES']),
  n: z.number().int().positive().optional(),
  minutes: z.number().int().positive().optional(),
}).refine(
  (data) => {
    if (data.mode === 'EVERY_N_MESSAGES') return data.n !== undefined;
    if (data.mode === 'EVERY_X_MINUTES') return data.minutes !== undefined;
    return true;
  },
  { message: 'n is required for EVERY_N_MESSAGES, minutes is required for EVERY_X_MINUTES' }
);

export type AIUpdatePolicy = z.infer<typeof AIUpdatePolicySchema>;

// Default policy: analyze after every 3 messages
export const DEFAULT_AI_UPDATE_POLICY: AIUpdatePolicy = {
  mode: 'EVERY_N_MESSAGES',
  n: 1, // Changed from 3 to 1 for easier testing
};

// ============================================
// AI Service Interfaces
// ============================================

export interface ConversationContext {
  conversationId: string;
  previousSummary?: string | null;
  previousSummaryVersion?: number;
  recentMessages: Array<{
    senderType: 'LEAD' | 'AGENT' | 'SYSTEM';
    contentText: string;
    createdAt: Date;
  }>;
  leadName?: string;
}

export interface IAIProvider {
  analyzeConversation(context: ConversationContext): Promise<AIAnalysisOutput>;
}
