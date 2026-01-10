import { Router } from 'express';
import { usersController } from './users.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';
import { requireRole } from '../../middlewares/rbac.js';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List all users in tenant
 *     description: Only accessible by TENANT_ADMIN. Returns all users in the tenant.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                         enum: [TENANT_ADMIN, SALES_AGENT]
 *                       createdAt:
 *                         type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not a TENANT_ADMIN)
 */
router.get(
  '/',
  authenticate,
  requireTenant,
  requireRole(UserRole.TENANT_ADMIN),
  usersController.listUsers.bind(usersController)
);

export default router;
