import { Request, Response } from 'express';
import { medicationService } from '../services/medication.service';
import { asyncHandler } from '../utils/response.utils';

export const medicationController = {
  addMedication: asyncHandler(async (req: Request, res: Response) => {
    const { appointmentId, patientId, name, dosage, frequency, durationDays, instructions, startDate, reminderTimes } = req.body;
    if (!appointmentId || !patientId || !name || !dosage || !frequency || !durationDays || !startDate) {
      return res.status(422).json({ success: false, message: 'Missing required medication fields' });
    }
    const medication = await medicationService.addMedication(appointmentId, patientId, {
      name, dosage, frequency, durationDays: Number(durationDays),
      instructions, startDate, reminderTimes: reminderTimes || [],
    });
    res.status(201).json({ success: true, data: medication, message: 'Medication added and reminders scheduled' });
  }),

  getMyMedications: asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.activeOnly === 'true';
    const medications = await medicationService.getPatientMedications(req.user!.id, activeOnly);
    res.json({ success: true, data: medications });
  }),

  deactivateMedication: asyncHandler(async (req: Request, res: Response) => {
    await medicationService.deactivateMedication(String(req.params.id), req.user!.id);
    res.json({ success: true, message: 'Medication deactivated' });
  }),
};