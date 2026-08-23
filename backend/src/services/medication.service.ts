import { PrismaClient } from '@prisma/client';
import { medicationQueue } from '../queues/medication.queue';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export const medicationService = {
  async addMedication(appointmentId: string, patientId: string, data: {
    name: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    instructions?: string;
    startDate: string;
    reminderTimes: string[];
  }) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + data.durationDays);

    const medication = await prisma.medication.create({
      data: {
        appointmentId,
        patientId,
        name: data.name,
        dosage: data.dosage,
        frequency: data.frequency,
        durationDays: data.durationDays,
        instructions: data.instructions,
        startDate,
        endDate,
        reminderTimes: data.reminderTimes,
        isActive: true,
      },
    });

    logger.info(`Medication added: ${medication.id} for patient ${patientId}`);

    // Schedule reminder jobs (non-critical: failure doesn't affect medication creation)
    try {
      for (const reminderTime of data.reminderTimes) {
        await medicationQueue.add(
          `reminder-${medication.id}-${reminderTime}`,
          {
            medicationId: medication.id,
            patientId,
            medicationName: data.name,
            dose: `${data.dosage} - ${reminderTime}`,
          },
          {
            delay: this._msUntilNextReminder(reminderTime),
            removeOnComplete: true,
          }
        );
      }
      logger.info(`Scheduled ${data.reminderTimes.length} reminder(s) for medication ${medication.id}`);
    } catch (err) {
      logger.error('Failed to schedule medication reminders', { error: err, medicationId: medication.id });
    }

    return medication;
  },

  _msUntilNextReminder(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const reminderToday = new Date();
    reminderToday.setHours(hours, minutes, 0, 0);

    if (reminderToday <= now) {
      // Schedule for tomorrow
      reminderToday.setDate(reminderToday.getDate() + 1);
    }
    return reminderToday.getTime() - now.getTime();
  },

  async getPatientMedications(patientId: string, activeOnly = false) {
    const where: any = { patientId };
    if (activeOnly) {
      where.isActive = true;
      where.endDate = { gte: new Date() };
    }
    return prisma.medication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          select: {
            appointmentDate: true,
            doctor: {
              select: { name: true, doctorProfile: { select: { specialization: true } } },
            },
          },
        },
      },
    });
  },

  async deactivateMedication(medicationId: string, patientId: string) {
    const med = await prisma.medication.findUnique({ where: { id: medicationId } });
    if (!med || med.patientId !== patientId) {
      throw new Error('Medication not found or access denied');
    }
    await prisma.medication.update({
      where: { id: medicationId },
      data: { isActive: false },
    });
    logger.info(`Medication ${medicationId} deactivated`);
    return { success: true };
  },
};