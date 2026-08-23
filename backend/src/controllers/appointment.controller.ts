import { Request, Response, NextFunction } from 'express';
import { appointmentService } from '../services/appointment.service';
import { asyncHandler } from '../utils/response.utils';

export const appointmentController = {
  // Patient: book appointment
  bookAppointment: asyncHandler(async (req: Request, res: Response) => {
    const { doctorId, date, startTime, endTime, holdId, symptoms, symptomDuration, symptomSeverity, additionalInfo } = req.body;

    if (!doctorId || !date || !startTime || !endTime || !holdId || !symptoms) {
      return res.status(422).json({ success: false, message: 'Missing required booking fields' });
    }

    const appointment = await appointmentService.bookAppointment({
      patientId: req.user!.id,
      doctorId,
      date,
      startTime,
      endTime,
      holdId,
      symptoms,
      symptomDuration,
      symptomSeverity,
      additionalInfo,
    });

    res.status(201).json({ success: true, data: appointment, message: 'Appointment booked successfully' });
  }),

  // Patient/Doctor: get appointment by ID
  getAppointment: asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const appointment = await appointmentService.getAppointmentById(id, req.user!.id, req.user!.role);
    res.json({ success: true, data: appointment });
  }),

  // Patient: get own appointments
  getMyAppointments: asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query;
    const result = await appointmentService.getPatientAppointments(
      req.user!.id,
      status as string | undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10
    );
    res.json({ success: true, ...result });
  }),

  // Doctor: get own appointments
  getDoctorAppointments: asyncHandler(async (req: Request, res: Response) => {
    const { date, status, page, limit } = req.query;
    const result = await appointmentService.getDoctorAppointments(
      req.user!.id,
      date as string | undefined,
      status as string | undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );
    res.json({ success: true, ...result });
  }),

  // Doctor: get today's appointments
  getTodayAppointments: asyncHandler(async (req: Request, res: Response) => {
    const appointments = await appointmentService.getTodayAppointments(req.user!.id);
    res.json({ success: true, data: appointments });
  }),

  // Patient/Admin: cancel appointment
  cancelAppointment: asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    await appointmentService.cancelAppointment(id, req.user!.id, req.user!.role, req.body.reason);
    res.json({ success: true, message: 'Appointment cancelled' });
  }),

  // Patient: reschedule appointment
  rescheduleAppointment: asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { newDate, newStartTime, newEndTime, newHoldId } = req.body;
    if (!newDate || !newStartTime || !newEndTime || !newHoldId) {
      return res.status(422).json({ success: false, message: 'Missing rescheduling fields' });
    }
    await appointmentService.rescheduleAppointment(id, req.user!.id, req.user!.role, newDate, newStartTime, newEndTime, newHoldId);
    res.json({ success: true, message: 'Appointment rescheduled' });
  }),

  // Doctor: complete appointment and add post-visit notes
  completeAppointment: asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { postVisitNotes, diagnosis, followUpDate } = req.body;
    if (!postVisitNotes) {
      return res.status(422).json({ success: false, message: 'Post-visit notes are required' });
    }
    await appointmentService.completeAppointment(
      id, req.user!.id, postVisitNotes, diagnosis,
      followUpDate ? new Date(followUpDate) : undefined
    );
    res.json({ success: true, message: 'Appointment completed' });
  }),
};