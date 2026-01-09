import { Router } from 'express';
import { conversationsController } from './conversations.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';
import { requireRole } from '../../middlewares/rbac.js';
import {
  getConversationsSchema,
  getConversationByIdSchema,
  assignConversationSchema,
} from './conversations.schema.js';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * @openapi
 * /api/v1/conversations:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Listar conversaciones
 *     description: Obtiene la lista de conversaciones del tenant. Los agentes solo ven conversaciones asignadas.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *         description: Filtrar por prioridad
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filtrar por tag de AI
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en nombre del lead
 *       - in: query
 *         name: unreplied
 *         schema:
 *           type: boolean
 *         description: Solo conversaciones sin respuesta
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor para paginación
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Número de resultados por página
 *     responses:
 *       200:
 *         description: Lista de conversaciones
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
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Conversation'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         nextCursor:
 *                           type: string
 *                           nullable: true
 *                         hasNextPage:
 *                           type: boolean
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  authenticate,
  requireTenant,
  validate(getConversationsSchema),
  conversationsController.getConversations.bind(conversationsController)
);

/**
 * @openapi
 * /api/v1/conversations/{id}:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Obtener conversación por ID
 *     description: Obtiene los detalles de una conversación específica
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la conversación
 *     responses:
 *       200:
 *         description: Detalles de la conversación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos para ver esta conversación
 *       404:
 *         description: Conversación no encontrada
 */
router.get(
  '/:id',
  authenticate,
  requireTenant, // CRITICAL: Add tenant middleware
  validate(getConversationByIdSchema),
  conversationsController.getConversationById.bind(conversationsController)
);

router.post(
  '/:id/assign',
  authenticate,
  requireTenant, // CRITICAL: Add tenant middleware
  requireRole([UserRole.TENANT_ADMIN]), // Updated role
  validate(assignConversationSchema),
  conversationsController.assignConversation.bind(conversationsController)
);

export default router;
