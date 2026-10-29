import { Router } from 'express';
import { body } from 'express-validator';
import * as busesController from '../controllers/busesController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const busValidation = [
  body('busNumber').trim().notEmpty().withMessage('busNumber is required'),
  body('vehicleNumber').trim().notEmpty().withMessage('vehicleNumber is required'),
  body('capacity').optional().isInt({ min: 10, max: 150 }).withMessage('capacity must be between 10 and 150'),
  validateRequest,
];

router.get('/', busesController.getAllBuses);
router.get('/:id', busesController.getBusById);

// Protected routes (Operator, Admin only for mutations)
router.post('/', authenticateToken, requireRole(['operator', 'admin']), busValidation, busesController.createBus);
router.put('/:id', authenticateToken, requireRole(['operator', 'admin']), busesController.updateBus);
router.delete('/:id', authenticateToken, requireRole(['operator', 'admin']), busesController.deleteBus);

export default router;
