import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

/**
 * Extended Request interface with tenant and user info
 */
export interface TenantRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
  };
  tenantId?: string;
}

/**
 * Middleware to extract and validate tenantId from JWT
 * Must be used after auth middleware
 */
export const requireTenant = (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    // Tenant should be set by auth middleware from JWT
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!req.user.tenantId) {
      throw new UnauthorizedError('Tenant information missing from token');
    }

    // Set tenantId at request level for easy access
    req.tenantId = req.user.tenantId;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to optionally allow x-tenant-id header for internal/admin services
 * This should ONLY be used for specific admin endpoints
 */
export const allowTenantHeader = (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const headerTenantId = req.headers['x-tenant-id'] as string;

    if (headerTenantId) {
      // Validate it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(headerTenantId)) {
        throw new ForbiddenError('Invalid tenant ID format');
      }

      req.tenantId = headerTenantId;
    }

    next();
  } catch (error) {
    next(error);
  }
};
