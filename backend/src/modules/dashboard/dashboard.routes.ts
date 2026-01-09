import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

const router = Router();

/**
 * @openapi
 * /api/v1/dashboard/metrics:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Obtener métricas del dashboard
 *     description: Retorna estadísticas y métricas del tenant (conversaciones, leads, respuestas, etc.)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas del dashboard
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
 *                     totalConversations:
 *                       type: integer
 *                       example: 45
 *                     openConversations:
 *                       type: integer
 *                       example: 12
 *                     totalLeads:
 *                       type: integer
 *                       example: 78
 *                     newLeadsToday:
 *                       type: integer
 *                       example: 5
 *                     averageResponseTime:
 *                       type: number
 *                       example: 4.5
 *                       description: Tiempo promedio de respuesta en minutos
 *                     conversationsByPriority:
 *                       type: object
 *                       properties:
 *                         URGENT:
 *                           type: integer
 *                           example: 3
 *                         HIGH:
 *                           type: integer
 *                           example: 8
 *                         MEDIUM:
 *                           type: integer
 *                           example: 15
 *                         LOW:
 *                           type: integer
 *                           example: 19
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/metrics',
  authenticate,
  requireTenant,
  dashboardController.getMetrics.bind(dashboardController)
);

export default router;
