import { Router } from 'express';
import { medicationController } from '../controllers/medication.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Doctor: Add medication to appointment
router.post('/', authenticate, requireRole('DOCTOR'), medicationController.addMedication);

// Patient: Get active/all medications
router.get('/my', authenticate, requireRole('PATIENT'), medicationController.getMyMedications);

// Patient: Deactivate medication
router.delete('/:id', authenticate, requireRole('PATIENT'), medicationController.deactivateMedication);

export default router;