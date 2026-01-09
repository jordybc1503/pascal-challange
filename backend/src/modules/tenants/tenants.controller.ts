import { Request, Response, NextFunction } from 'express';
import { tenantsService } from './tenants.service.js';
import { sendSuccess } from '../../utils/response.js';
import { config } from '../../config/env.js';
import { ForbiddenError } from '../../utils/errors.js';
import { TenantRequest } from '../../middlewares/tenant.js';

export class TenantsController {
  /**
   * Create a new tenant (bootstrap mode only)
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // Only allow tenant creation in bootstrap mode
      if (!config.multiTenant.bootstrapMode) {
        throw new ForbiddenError('Tenant creation is disabled. Set BOOTSTRAP_MODE=true to enable.');
      }

      const { name, slug, adminEmail, adminPassword, ruc } = req.body;
      const result = await tenantsService.createTenant(name, slug, adminEmail, adminPassword, ruc);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tenant by ID (tenant members only)
   */
  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Ensure user can only access their own tenant
      if (req.tenantId !== id) {
        throw new ForbiddenError('Access denied to this tenant');
      }

      const tenant = await tenantsService.getTenantById(id);
      sendSuccess(res, tenant);
    } catch (error) {
      next(error);
    }
  }
}

export const tenantsController = new TenantsController();
