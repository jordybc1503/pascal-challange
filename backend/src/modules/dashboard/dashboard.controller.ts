import { Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service.js';
import { sendSuccess } from '../../utils/response.js';
import { TenantRequest } from '../../middlewares/tenant.js';

export class DashboardController {
  async getMetrics(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const metrics = await dashboardService.getMetrics(
        req.tenantId!,
        req.user!.userId,
        req.user!.role
      );
      sendSuccess(res, metrics);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
