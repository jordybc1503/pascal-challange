import { Request, Response, NextFunction } from 'express';
import { whatsAppService } from './whatsapp.service.js';
import { sendSuccess } from '../../utils/response.js';
import { TenantRequest } from '../../middlewares/tenant.js';
import { UserRole } from '@prisma/client';
import { ForbiddenError } from '../../utils/errors.js';

export class WhatsAppController {
  /**
   * Create or update WhatsApp configuration (TENANT_ADMIN only)
   */
  async createOrUpdateConfig(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      // Only tenant admins can configure WhatsApp
      if (req.user?.role !== UserRole.TENANT_ADMIN) {
        throw new ForbiddenError('Only tenant admins can configure WhatsApp');
      }

      const { provider, displayName, phoneNumber, providerAccountId, accessToken, webhookVerifyToken, secret } = req.body;

      const result = await whatsAppService.createOrUpdateConfig({
        tenantId: req.tenantId!,
        provider,
        displayName,
        phoneNumber,
        providerAccountId,
        accessToken,
        webhookVerifyToken,
        secret,
      });

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get WhatsApp configuration (TENANT_ADMIN only)
   */
  async getConfig(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== UserRole.TENANT_ADMIN) {
        throw new ForbiddenError('Only tenant admins can view WhatsApp configuration');
      }

      const config = await whatsAppService.getConfig(req.tenantId!);
      sendSuccess(res, config);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle incoming WhatsApp webhook (public endpoint)
   * Supports both Meta (with verification) and other providers
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerAccountId } = req.params;
      const queryParams = req.query as Record<string, string>;
      const payload = req.body;

      const result = await whatsAppService.handleIncomingWebhook(providerAccountId, payload, queryParams);

      // Handle webhook verification (Meta returns challenge)
      if (result && 'challenge' in result && result.challenge) {
        return res.status(200).send(result.challenge);
      }

      res.status(200).json({ status: 'success' });
    } catch (error) {
      next(error);
    }
  }
}

export const whatsAppController = new WhatsAppController();
