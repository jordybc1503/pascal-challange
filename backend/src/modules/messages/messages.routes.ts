import { Router } from 'express';
import { messagesController } from './messages.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireTenant } from '../../middlewares/tenant.js';
import { getMessagesSchema, createMessageSchema } from './messages.schema.js';

const router = Router();

router.get(
  '/:id/messages',
  authenticate,
  requireTenant, // CRITICAL: Add tenant middleware
  validate(getMessagesSchema),
  messagesController.getMessages.bind(messagesController)
);

router.post(
  '/:id/messages',
  authenticate,
  requireTenant, // CRITICAL: Add tenant middleware
  validate(createMessageSchema),
  messagesController.createMessage.bind(messagesController)
);

export default router;
