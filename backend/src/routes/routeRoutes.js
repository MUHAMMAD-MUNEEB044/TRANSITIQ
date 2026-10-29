import { Router } from 'express';
import { body } from 'express-validator';
import * as routesController from '../controllers/routesController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const routeValidation = [
  body('routeName').trim().notEmpty().withMessage('routeName is required'),
  body('startLocation').trim().notEmpty().withMessage('startLocation is required'),
  body('destination').trim().notEmpty().withMessage('destination is required'),
  validateRequest,
];

// Passenger route finder
router.get('/search', routesController.searchRoutes);

// General route listings
router.get('/', routesController.getAllRoutes);
router.get('/:id/stops', routesController.getRouteStopsWithETA);
router.get('/:id', routesController.getRouteById);

// Mutations (Operator & Admin only)
router.post('/', authenticateToken, requireRole(['operator', 'admin']), routeValidation, routesController.createRoute);
router.put('/:id', authenticateToken, requireRole(['operator', 'admin']), routesController.updateRoute);
router.delete('/:id', authenticateToken, requireRole(['operator', 'admin']), routesController.deleteRoute);

export default router;
