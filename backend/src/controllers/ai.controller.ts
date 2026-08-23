import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { llmService } from '../services/llm.service';
import { asyncHandler } from '../utils/response.utils';

const prisma = new PrismaClient();

export const aiController = {
  // Doctor: get pre-visit AI summary for an appointment
  getPreVisitSummary: asyncHandler(async (req: Request, res: Response) => {
    const appointmentId = String(req.params.appointmentId);
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId, doctorId: req.user!.id },
      select: {
        id: true, symptoms: true, symptomDuration: true, symptomSeverity: true,
        preVisitSummaryStatus: true, urgencyLevel: true, chiefComplaint: true, suggestedQuestions: true,
        patient: { select: { name: true, dateOfBirth: true, gender: true } },
      },
    });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: appointment });
  }),

  // Doctor: trigger post-visit AI summary generation
  generatePostVisitSummary: asyncHandler(async (req: Request, res: Response) => {
    const appointmentId = String(req.params.appointmentId);
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId, doctorId: req.user!.id },
      include: { prescriptions: true, medications: true },
    });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (!appointment.postVisitNotes) {
      return res.status(422).json({ success: false, message: 'Post-visit notes must be saved before generating summary' });
    }

    const summary = await llmService.generatePostVisitSummary(
      appointment.postVisitNotes,
      appointment.medications,
      appointment.prescriptions
    );

    if (!summary) {
      return res.json({
        success: false,
        message: 'AI summary generation failed. Patient summary is unavailable. Notes are still saved.',
        data: null,
      });
    }

    // Store the AI-generated summary (not yet approved)
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        patientFriendlySummary: JSON.stringify(summary),
        summaryApprovedByDoctor: false,
      },
    });

    res.json({ success: true, data: summary, message: 'AI summary generated. Review and approve before patient can see it.' });
  }),

  // Doctor: approve AI summary so patient can view it
  approvePostVisitSummary: asyncHandler(async (req: Request, res: Response) => {
    const appointmentId = String(req.params.appointmentId);
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId, doctorId: req.user!.id },
    });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (!appointment.patientFriendlySummary) {
      return res.status(422).json({ success: false, message: 'No summary to approve. Generate one first.' });
    }
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { summaryApprovedByDoctor: true },
    });
    res.json({ success: true, message: 'Summary approved. Patient can now view it.' });
  }),

  // Patient: get their approved post-visit summary
  getPatientSummary: asyncHandler(async (req: Request, res: Response) => {
    const appointmentId = String(req.params.appointmentId);
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId, patientId: req.user!.id },
      select: { patientFriendlySummary: true, summaryApprovedByDoctor: true, status: true },
    });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (!appointment.summaryApprovedByDoctor || !appointment.patientFriendlySummary) {
      return res.json({ success: true, data: null, message: 'Summary not yet available' });
    }
    try {
      const parsed = JSON.parse(appointment.patientFriendlySummary);
      res.json({ success: true, data: parsed });
    } catch {
      res.json({ success: true, data: { visitSummary: appointment.patientFriendlySummary } });
    }
  }),
};