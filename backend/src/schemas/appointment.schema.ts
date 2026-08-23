import { z } from 'zod';
import { UrgencyLevel } from '../config/constants';

export const bookAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    symptoms: z.string().optional(),
    holdId: z.string().uuid().optional()
  })
});

export const holdSlotSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string()
  })
});
