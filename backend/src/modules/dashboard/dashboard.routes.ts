import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.get('/metrics', authenticate, dashboardController.getMetrics.bind(dashboardController));

export default router;
