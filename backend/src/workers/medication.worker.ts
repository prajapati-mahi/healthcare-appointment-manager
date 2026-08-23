import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import { emailService } from '../services/email.service';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export function createMedicationWorker() {
  const worker = new Worker(
    'medication',
    async (job: Job) => {
      const { medicationId, patientId, medicationName, dose } = job.data;
      logger.info(`Processing medication reminder job ${job.id}`);

      const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
      if (!medication || !medication.isActive || new Date() > medication.endDate) {
        logger.info(`Medication ${medicationId} inactive/expired, skipping`);
        return { skipped: true };
      }

      const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { email: true, name: true } });
      if (!patient) return { skipped: true };

      const result = await emailService.sendMedicationReminder({ to: patient.email, patientName: patient.name, medicationName, dose });

      await prisma.notification.create({
        data: {
          userId: patientId,
          type: 'MEDICATION_REMINDER',
          channel: 'EMAIL',
          status: result.success ? 'SENT' : 'FAILED',
          sentAt: result.success ? new Date() : undefined,
          errorMessage: result.success ? null : result.error,
          attempts: 1,
          lastAttemptAt: new Date(),
          subject: `Medication Reminder: ${medicationName}`,
          metadata: { medicationId, medicationName, dose } as any,
        },
      });

      if (!result.success) throw new Error(result.error);
      return result;
    },
    { connection: redis, concurrency: 3 }
  );

  worker.on('failed', (job, err) => logger.error(`Medication job ${job?.id} permanently failed`, { error: err.message }));
  worker.on('error', (err) => logger.error('Medication worker error', { error: err.message }));
  logger.info('Medication worker started');
  return worker;
}
