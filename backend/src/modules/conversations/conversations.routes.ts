import { Router } from 'express';
import { conversationsController } from './conversations.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';
import {
  getConversationsSchema,
  getConversationByIdSchema,
  assignConversationSchema,
} from './conversations.schema.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.get(
  '/',
  authenticate,
  validate(getConversationsSchema),
  conversationsController.getConversations.bind(conversationsController)
);

router.get(
  '/:id',
  authenticate,
  validate(getConversationByIdSchema),
  conversationsController.getConversationById.bind(conversationsController)
);

router.post(
  '/:id/assign',
  authenticate,
  requireRole(UserRole.ADMIN),
  validate(assignConversationSchema),
  conversationsController.assignConversation.bind(conversationsController)
);

export default router;
