import { Router } from 'express';
import { doctorController } from '../controllers/doctor.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Public endpoints
router.get('/specializations', doctorController.getSpecializations);
router.get('/', doctorController.searchDoctors);
router.get('/:id', doctorController.getDoctorById);

// Doctor-only: profile & schedule management
router.get('/me/profile', authenticate, requireRole('DOCTOR'), doctorController.getMyProfile);
router.patch('/me/profile', authenticate, requireRole('DOCTOR'), doctorController.updateMyProfile);
router.put('/me/working-hours', authenticate, requireRole('DOCTOR'), doctorController.setWorkingHours);
router.get('/me/leaves', authenticate, requireRole('DOCTOR'), doctorController.getMyLeaves);
router.post('/me/leaves', authenticate, requireRole('DOCTOR'), doctorController.addLeave);
router.delete('/me/leaves/:leaveId', authenticate, requireRole('DOCTOR'), doctorController.removeLeave);

export default router;