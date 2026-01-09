import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../middlewares/validate.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.post('/login', validate(loginSchema), authController.login.bind(authController));
router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
