import { z } from 'zod';

export const createTenantSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
    ruc: z.string().optional(),
    adminEmail: z.string().email('Invalid email format'),
    adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const tenantResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  ruc: z.string().nullable(),
  createdAt: z.string(),
});

export type TenantResponse = z.infer<typeof tenantResponseSchema>;
