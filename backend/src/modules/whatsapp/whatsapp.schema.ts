import { z } from 'zod';

export const createWhatsAppConfigSchema = z.object({
  body: z.object({
    provider: z.enum(['META', 'TWILIO']),
    displayName: z.string().min(1, 'Display name is required'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    providerAccountId: z.string().min(1, 'Provider account ID is required'), // phone_number_id for Meta, AccountSid for Twilio
    accessToken: z.string().optional(), // Optional for updates, required for creation (validated in service)
    webhookVerifyToken: z.string().optional(),
    secret: z.string().optional(), // For Twilio auth token or Meta app secret
  }),
});

export const whatsAppChannelResponseSchema = z.object({
  id: z.string(),
  provider: z.enum(['META', 'TWILIO']),
  displayName: z.string(),
  phoneNumber: z.string(),
  providerAccountId: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type WhatsAppChannelResponse = z.infer<typeof whatsAppChannelResponseSchema>;
