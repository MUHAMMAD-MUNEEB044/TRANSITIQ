import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

// Analytics endpoints can be accessed by operators and admins (or public dashboard overview)
router.get('/overview', analyticsController.getOverview);
router.get('/routes/:id/performance', analyticsController.getRoutePerformance);
router.get('/delays/trend', analyticsController.getDelayTrend);
router.get('/peak-hours', analyticsController.getPeakHours);

export default router;
