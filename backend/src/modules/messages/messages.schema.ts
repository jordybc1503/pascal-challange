import { z } from 'zod';

export const getMessagesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID'),
  }),
  query: z.object({
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
    cursor: z.string().optional(),
  }),
});

export const createMessageSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID'),
  }),
  body: z.object({
    contentText: z.string().min(1, 'Message content is required'),
    contentType: z.enum(['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO']).optional().default('TEXT'),
    mediaUrl: z.string().url().optional().nullable(),
  }),
});
