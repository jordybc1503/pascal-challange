import OpenAI from 'openai';
import { logger } from '../../../utils/logger.js';
import type { IAIProvider, ConversationContext, AIAnalysisOutput } from '../types.js';
import { AIAnalysisOutputSchema } from '../types.js';

export class OpenAIProvider implements IAIProvider {
    private client: OpenAI;
    private modelName: string;

    constructor(apiKey: string, modelName: string = 'gpt-3.5-turbo') {
        this.client = new OpenAI({ apiKey });
        this.modelName = modelName;
    }

    async analyzeConversation(context: ConversationContext): Promise<AIAnalysisOutput> {
        const prompt = this.buildPrompt(context);

        logger.info({
            conversationId: context.conversationId,
            messageCount: context.recentMessages.length,
            model: this.modelName,
        }, '🤖 Calling OpenAI for conversation analysis');

        try {
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.modelName,
                response_format: { type: 'json_object' },
            });

            const text = completion.choices[0].message.content;

            if (!text) {
                throw new Error('OpenAI returned empty response');
            }

            logger.info({
                conversationId: context.conversationId,
                responseLength: text.length,
            }, '✅ OpenAI response received');

            // Parse and validate JSON response
            const parsed = JSON.parse(text);
            const validated = AIAnalysisOutputSchema.parse(parsed);

            return validated;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({ error: errorMessage, conversationId: context.conversationId }, '❌ OpenAI analysis failed');
            throw error;
        }
    }

    private buildPrompt(context: ConversationContext): string {
        const messages = context.recentMessages
            .map((msg) => {
                const sender = msg.senderType === 'LEAD' ? 'Cliente' : 'Agente';
                return `${sender}: ${msg.contentText}`;
            })
            .join('\n');

        const incrementalContext = context.previousSummary
            ? `\n\n### Resumen Anterior (versión ${context.previousSummaryVersion || 0}):\n${context.previousSummary}\n\n**IMPORTANTE**: Este es un análisis incremental. Usa el resumen anterior como base y actualízalo con los mensajes nuevos.`
            : '\n\n**IMPORTANTE**: Este es el primer análisis de esta conversación.';

        return `Eres un asistente de IA especializado en analizar conversaciones de ventas/soporte de WhatsApp.

Tu tarea es analizar la siguiente conversación y proporcionar:
1. Un resumen conciso (máximo 500 caracteres)
2. Prioridad de atención (HIGH/MEDIUM/LOW)
3. Razón breve de la prioridad
4. Tags clasificatorios relevantes con nivel de confianza

${incrementalContext}

### Mensajes de la Conversación:
${messages}

### Lead Info:
Nombre: ${context.leadName || 'No especificado'}

### Instrucciones de Prioridad:
- HIGH: Cliente molesto, urgencia, problemas críticos, oportunidad de venta grande, cancelación
- MEDIUM: Consultas de precios, seguimiento, soporte estándar
- LOW: Consultas generales, agradecimientos, confirmaciones

### Tags Disponibles:
prospecto, precios, seguimiento, soporte, queja, cancelacion, reclamo, oportunidad_venta, pregunta_general, interes_demo, negociacion, urgente, satisfecho

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "summary": "string (máx 500 chars)",
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "priorityReason": "string (razón breve)",
  "tags": [{ "tag": "string", "confidence": 0.95 }]
}`;
    }
}
