import { z } from 'zod';

export const createDoctorSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    specialization: z.string(),
    qualifications: z.string(),
    experienceYears: z.number().min(0),
    slotDuration: z.number().min(5).max(120),
    consultationFee: z.number().optional()
  })
});

export const workingHoursSchema = z.object({
  body: z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string(),
    endTime: z.string()
  })
});
