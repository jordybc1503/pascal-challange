import { z } from 'zod';

// Enums
export const UserRole = z.enum(['TENANT_ADMIN', 'SALES_AGENT']);
export const SenderType = z.enum(['LEAD', 'AGENT', 'SYSTEM']);
export const Priority = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export const ContentType = z.enum(['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO']);

// Tenant schema
export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  ruc: z.string().nullable().optional(),
});

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),

});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: UserRole,
  tenantId: z.string(),
  createdAt: z.string(),
});

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
  tenant: TenantSchema,
});

// Lead schema
export const LeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  projectInterest: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});

// Conversation schema
export const ConversationSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  assignedAgentId: z.string().nullable(),
  status: z.string(),
  lastMessageAt: z.string().nullable(),
  lastMessageSenderType: SenderType.nullable(),
  lastAgentReplyAt: z.string().nullable(),
  aiSummary: z.string().nullable(),
  aiPriority: Priority.nullable(),
  aiTags: z.array(z.string()),
  aiUpdatedAt: z.string().nullable(),
  createdAt: z.string(),
  lead: LeadSchema,
  assignedAgent: z
    .object({
      id: z.string(),
      email: z.string(),
    })
    .nullable(),
  _count: z.object({
    messages: z.number(),
  }),
});

// Message schema
export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderType: SenderType,
  senderUserId: z.string().nullable(),
  contentText: z.string(),
  contentType: ContentType,
  mediaUrl: z.string().nullable(),
  createdAt: z.string(),
  senderUser: z
    .object({
      id: z.string(),
      email: z.string(),
      role: UserRole,
    })
    .nullable(),
});

// Dashboard schema
export const DashboardMetricsSchema = z.object({
  totalConversations: z.number(),
  totalUnreplied: z.number(),
  priorityBreakdown: z.object({
    high: z.number(),
    medium: z.number(),
    low: z.number(),
    unanalyzed: z.number(),
  }),
});

// API Response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.literal('success'),
    data: dataSchema,
  });

export const ApiErrorResponseSchema = z.object({
  status: z.literal('error'),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  }),
});

// Paginated response
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      nextCursor: z.string().nullable(),
      hasNextPage: z.boolean(),
    }),
  });

// Socket event schemas
export const SocketMessageNewSchema = z.object({
  conversationId: z.string(),
  message: MessageSchema,
});

export const SocketAIUpdateSchema = z.object({
  conversationId: z.string(),
  aiData: z.object({
    summary: z.string().nullable(),
    priority: Priority.nullable(),
    tags: z.array(z.string()).nullable(),
    updatedAt: z.string().nullable(),
  }),
});

export const SocketTypingSchema = z.object({
  userId: z.string(),
  email: z.string(),
  conversationId: z.string(),
});

// Types
export type UserRole = z.infer<typeof UserRole>;
export type SenderType = z.infer<typeof SenderType>;
export type Priority = z.infer<typeof Priority>;
export type ContentType = z.infer<typeof ContentType>;
export type LoginData = z.infer<typeof LoginSchema>;
export type User = z.infer<typeof UserSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type Lead = z.infer<typeof LeadSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
export type SocketMessageNew = z.infer<typeof SocketMessageNewSchema>;
export type SocketAIUpdate = z.infer<typeof SocketAIUpdateSchema>;
export type SocketTyping = z.infer<typeof SocketTypingSchema>;

// Send message schema
export const SendMessageSchema = z.object({
  contentText: z.string().min(1, 'Message cannot be empty'),
  contentType: ContentType.optional(),
  mediaUrl: z.string().url().nullable().optional(),
});

export type SendMessageData = z.infer<typeof SendMessageSchema>;
