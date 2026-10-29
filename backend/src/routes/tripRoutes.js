import { Router } from 'express';
import { body } from 'express-validator';
import * as tripsController from '../controllers/tripsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const startTripValidation = [
  body('busId').trim().notEmpty().withMessage('busId is required'),
  body('routeId').trim().notEmpty().withMessage('routeId is required'),
  validateRequest,
];

const delayValidation = [
  body('delayMinutes').isNumeric().withMessage('delayMinutes must be a number'),
  validateRequest,
];

// Public/Passenger or authenticated trip views
router.get('/', tripsController.getActiveTrips);
router.get('/:id/history', tripsController.getTripHistory);

// Driver & Operator trip mutations
router.post('/', authenticateToken, requireRole(['driver', 'operator', 'admin']), startTripValidation, tripsController.startTrip);
router.put('/:id/end', authenticateToken, requireRole(['driver', 'operator', 'admin']), tripsController.endTrip);
router.put('/:id/delay', authenticateToken, requireRole(['driver', 'operator', 'admin']), delayValidation, tripsController.reportDelay);

export default router;
