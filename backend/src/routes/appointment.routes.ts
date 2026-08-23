import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Patient: book appointment
router.post('/', authenticate, requireRole('PATIENT'), appointmentController.bookAppointment);

// Patient: get own appointments
router.get('/my', authenticate, requireRole('PATIENT'), appointmentController.getMyAppointments);

// Doctor: get own appointments
router.get('/doctor/my', authenticate, requireRole('DOCTOR'), appointmentController.getDoctorAppointments);

// Doctor: today's appointments
router.get('/doctor/today', authenticate, requireRole('DOCTOR'), appointmentController.getTodayAppointments);

// Shared: get specific appointment
router.get('/:id', authenticate, appointmentController.getAppointment);

// Patient: cancel appointment
router.post('/:id/cancel', authenticate, appointmentController.cancelAppointment);

// Patient: reschedule appointment
router.post('/:id/reschedule', authenticate, requireRole('PATIENT'), appointmentController.rescheduleAppointment);

// Doctor: complete appointment + post-visit notes
router.post('/:id/complete', authenticate, requireRole('DOCTOR'), appointmentController.completeAppointment);

export default router;