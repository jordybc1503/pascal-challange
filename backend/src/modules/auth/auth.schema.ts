import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    tenantSlug: z.string().min(1, 'Tenant slug is required'),
    role: z.enum(['TENANT_ADMIN', 'SALES_AGENT']).optional(),
  }),
});

// Response schemas
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['TENANT_ADMIN', 'SALES_AGENT']),
  tenantId: z.string(),
  createdAt: z.string(),
});

export const tenantResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: userResponseSchema,
  tenant: tenantResponseSchema,
});

// Types
export type UserResponse = z.infer<typeof userResponseSchema>;
export type TenantResponse = z.infer<typeof tenantResponseSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
