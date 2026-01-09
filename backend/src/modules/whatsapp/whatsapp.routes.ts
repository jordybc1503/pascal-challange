import { Router } from 'express';
import { whatsAppController } from './whatsapp.controller.js';
import { validate } from '../../middlewares/validate.js';
import { createWhatsAppConfigSchema } from './whatsapp.schema.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

const router = Router();

/**
 * @openapi
 * /api/v1/whatsapp/config:
 *   post:
 *     tags:
 *       - WhatsApp
 *     summary: Create or update WhatsApp configuration
 *     description: Configure WhatsApp integration (Meta or Twilio). Only TENANT_ADMIN can access.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - displayName
 *               - phoneNumber
 *               - providerAccountId
 *               - accessToken
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [META, TWILIO]
 *                 example: META
 *               displayName:
 *                 type: string
 *                 example: My Business
 *               phoneNumber:
 *                 type: string
 *                 example: +1234567890
 *               providerAccountId:
 *                 type: string
 *                 example: "1234567890123456"
 *                 description: Phone Number ID for Meta, Account SID for Twilio
 *               accessToken:
 *                 type: string
 *                 example: EAAxxxxxxxxxxxxx
 *                 description: Access token for Meta, Auth Token for Twilio
 *               webhookVerifyToken:
 *                 type: string
 *                 example: my_verify_token
 *               secret:
 *                 type: string
 *                 example: app_secret_here
 *     responses:
 *       201:
 *         description: Configuration saved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not a TENANT_ADMIN)
 */
router.post(
  '/config',
  authenticate,
  requireTenant,
  validate(createWhatsAppConfigSchema),
  whatsAppController.createOrUpdateConfig.bind(whatsAppController)
);

/**
 * @openapi
 * /api/v1/whatsapp/config:
 *   get:
 *     tags:
 *       - WhatsApp
 *     summary: Get WhatsApp configuration
 *     description: Retrieve current WhatsApp configuration. Only TENANT_ADMIN can access.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     providerAccountId:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get(
  '/config',
  authenticate,
  requireTenant,
  whatsAppController.getConfig.bind(whatsAppController)
);

/**
 * @openapi
 * /api/v1/whatsapp/webhook/{providerAccountId}:
 *   get:
 *     tags:
 *       - WhatsApp
 *     summary: WhatsApp webhook verification (Meta)
 *     description: Handles webhook verification challenge from Meta
 *     parameters:
 *       - in: path
 *         name: providerAccountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hub.mode
 *         schema:
 *           type: string
 *       - in: query
 *         name: hub.verify_token
 *         schema:
 *           type: string
 *       - in: query
 *         name: hub.challenge
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification successful
 *   post:
 *     tags:
 *       - WhatsApp
 *     summary: Receive WhatsApp messages
 *     description: Webhook endpoint to receive incoming WhatsApp messages
 *     parameters:
 *       - in: path
 *         name: providerAccountId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Message received
 */
router.all(
  '/webhook/:providerAccountId',
  whatsAppController.handleWebhook.bind(whatsAppController)
);

export default router;
