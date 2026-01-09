import { z } from 'zod';

export const getConversationsSchema = z.object({
  query: z.object({
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
    tag: z.string().optional(),
    search: z.string().optional(),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    cursor: z.string().optional(),
  }),
});

export const assignConversationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID'),
  }),
  body: z.object({
    agentId: z.string().uuid('Invalid agent ID').nullable(),
  }),
});

export const getConversationByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID'),
  }),
});
