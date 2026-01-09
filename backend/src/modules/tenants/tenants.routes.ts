import { Router } from 'express';
import { tenantsController } from './tenants.controller.js';
import { validate } from '../../middlewares/validate.js';
import { createTenantSchema } from './tenants.schema.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';

const router = Router();

/**
 * @openapi
 * /api/v1/tenants:
 *   post:
 *     tags:
 *       - Tenants
 *     summary: Crear nueva compañía/tenant
 *     description: Endpoint público para crear una nueva compañía con su usuario administrador. No requiere autenticación.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - adminEmail
 *               - adminPassword
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 example: Mi Empresa SAS
 *               slug:
 *                 type: string
 *                 minLength: 2
 *                 pattern: '^[a-z0-9-]+$'
 *                 example: mi-empresa
 *                 description: Identificador único (solo minúsculas, números y guiones)
 *               adminEmail:
 *                 type: string
 *                 format: email
 *                 example: admin@miempresa.com
 *               adminPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: securePassword123
 *     responses:
 *       201:
 *         description: Tenant creado exitosamente
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
 *                     tenant:
 *                       $ref: '#/components/schemas/Tenant'
 *                     admin:
 *                       $ref: '#/components/schemas/User'
 *       409:
 *         description: El slug ya está en uso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', validate(createTenantSchema), tenantsController.create.bind(tenantsController));

/**
 * @openapi
 * /api/v1/tenants/{id}:
 *   get:
 *     tags:
 *       - Tenants
 *     summary: Obtener información del tenant
 *     description: Obtiene la información de un tenant específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del tenant
 *     responses:
 *       200:
 *         description: Información del tenant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tenant no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authenticate, requireTenant, tenantsController.getById.bind(tenantsController));

export default router;
