import { Router } from 'express';
import { body } from 'express-validator';
import * as driversController from '../controllers/driversController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const driverValidation = [
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('phone').trim().notEmpty().withMessage('phone is required'),
  body('licenseNumber').trim().notEmpty().withMessage('licenseNumber is required'),
  validateRequest,
];

// All driver endpoints are restricted to Admin & Operator (or authenticated driver for own info)
router.use(authenticateToken);

router.get('/', requireRole(['admin', 'operator']), driversController.getAllDrivers);
router.get('/:id', requireRole(['admin', 'operator', 'driver']), driversController.getDriverById);
router.post('/', requireRole(['admin', 'operator']), driverValidation, driversController.createDriver);
router.put('/:id', requireRole(['admin', 'operator']), driversController.updateDriver);
router.delete('/:id', requireRole(['admin', 'operator']), driversController.deleteDriver);

export default router;
