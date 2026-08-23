import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Doctor: Get pre-visit AI summary
router.get('/pre-visit/:appointmentId', authenticate, requireRole('DOCTOR'), aiController.getPreVisitSummary);

// Doctor: Generate post-visit AI summary
router.post('/post-visit/:appointmentId', authenticate, requireRole('DOCTOR'), aiController.generatePostVisitSummary);

// Doctor: Approve post-visit summary
router.post('/post-visit/:appointmentId/approve', authenticate, requireRole('DOCTOR'), aiController.approvePostVisitSummary);

// Patient: Get approved post-visit summary
router.get('/post-visit/:appointmentId/patient', authenticate, requireRole('PATIENT'), aiController.getPatientSummary);

export default router;