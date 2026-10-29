import { Router } from 'express';
import { body } from 'express-validator';
import * as stopsController from '../controllers/stopsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const stopValidation = [
  body('stopName').trim().notEmpty().withMessage('stopName is required'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  validateRequest,
];

router.get('/', stopsController.getAllStops);
router.get('/:id', stopsController.getStopById);

// Mutations (Operator & Admin only)
router.post('/', authenticateToken, requireRole(['operator', 'admin']), stopValidation, stopsController.createStop);
router.put('/:id', authenticateToken, requireRole(['operator', 'admin']), stopsController.updateStop);
router.delete('/:id', authenticateToken, requireRole(['operator', 'admin']), stopsController.deleteStop);

export default router;
