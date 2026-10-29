import { Router } from 'express';
import { body } from 'express-validator';
import * as alertsController from '../controllers/alertsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const alertValidation = [
  body('message').trim().notEmpty().withMessage('Alert message is required'),
  body('severity').optional().isIn(['info', 'warning', 'critical']).withMessage('Invalid severity'),
  validateRequest,
];

// Active alerts for passengers and display
router.get('/', alertsController.getActiveAlerts);

// Operator & Admin alert publishing and deactivation
router.post('/', authenticateToken, requireRole(['operator', 'admin']), alertValidation, alertsController.createAlert);
router.delete('/:id', authenticateToken, requireRole(['operator', 'admin']), alertsController.deleteAlert);

export default router;
