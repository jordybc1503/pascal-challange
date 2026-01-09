import { Router } from 'express';
import { messagesController } from './messages.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { getMessagesSchema, createMessageSchema } from './messages.schema.js';

const router = Router();

router.get(
  '/:id/messages',
  authenticate,
  validate(getMessagesSchema),
  messagesController.getMessages.bind(messagesController)
);

router.post(
  '/:id/messages',
  authenticate,
  validate(createMessageSchema),
  messagesController.createMessage.bind(messagesController)
);

export default router;
