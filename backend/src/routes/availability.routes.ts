import { Router } from 'express';
import { availabilityController } from '../controllers/availability.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Public: Get slots for a doctor on a date
router.get('/slots', availabilityController.getSlots);

// Public: Get available dates for a doctor in a month
router.get('/dates', availabilityController.getAvailableDates);

// Patient: Hold a slot (5-minute reservation)
router.post('/hold', authenticate, requireRole('PATIENT'), availabilityController.holdSlot);

// Patient: Release a hold
router.delete('/hold/:holdId', authenticate, requireRole('PATIENT'), availabilityController.releaseHold);

export default router;