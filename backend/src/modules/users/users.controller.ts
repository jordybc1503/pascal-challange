import { Response, NextFunction } from 'express';
import { usersService } from './users.service.js';
import { sendSuccess } from '../../utils/response.js';
import { TenantRequest } from '../../middlewares/tenant.js';

export class UsersController {
  async listUsers(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const users = await usersService.listUsers(req.tenantId!);
      sendSuccess(res, users);
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
