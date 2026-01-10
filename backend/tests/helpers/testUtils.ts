import jwt from 'jsonwebtoken';
import { config } from '@/config/env.js';
import { UserRole } from '@prisma/client';
import type { JWTPayload } from '@/middlewares/auth.js';

/**
 * Generate a JWT token for testing
 */
export function generateTestToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Create a test token from user data
 */
export function createTokenForUser(user: {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
}): string {
  return generateTestToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  });
}

/**
 * Helper to extract Bearer token from Authorization header
 */
export function getBearerToken(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert that a value is defined (TypeScript type guard)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Expected value to be defined');
  }
}

/**
 * Create pagination params for testing
 */
export function createPaginationParams(params?: {
  limit?: number;
  cursor?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  return searchParams.toString();
}
