import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import { emailService } from '../services/email.service';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export function createNotificationWorker() {
  const worker = new Worker(
    'notification',
    async (job: Job) => {
      const {
        type, appointmentId, patientId, patientEmail, patientName,
        doctorName, doctorEmail, appointmentDate, startTime, endTime,
        doctorSpecialization, rescheduleDate, rescheduleStartTime,
        cancelReason, medicationName, dose,
      } = job.data;

      logger.info(`Processing notification job ${job.id}: type=${type}`);

      // Find notification record
      let notifId: string | null = null;
      if (appointmentId && patientId) {
        const notif = await prisma.notification.findFirst({
          where: { appointmentId, userId: patientId, type, status: { in: ['PENDING', 'FAILED', 'RETRYING'] } },
          orderBy: { createdAt: 'desc' },
        });
        notifId = notif?.id ?? null;
        if (notifId) {
          await prisma.notification.update({
            where: { id: notifId },
            data: { attempts: { increment: 1 }, lastAttemptAt: new Date(), status: 'RETRYING' },
          });
        }
      }

      let result: { success: boolean; error?: string };

      try {
        switch (type) {
          case 'BOOKING_CONFIRMATION':
            result = await emailService.sendBookingConfirmation({ to: patientEmail, patientName, doctorName, appointmentDate, startTime, endTime, appointmentId, doctorSpecialization });
            break;
          case 'NEW_BOOKING_DOCTOR':
            result = await emailService.sendNewBookingToDoctor({ to: doctorEmail, doctorName, patientName, appointmentDate, startTime, endTime, appointmentId });
            break;
          case 'APPOINTMENT_REMINDER':
            result = await emailService.sendAppointmentReminder({ to: patientEmail, patientName, doctorName, appointmentDate, startTime });
            break;
          case 'CANCELLATION':
            result = await emailService.sendCancellationNotification({ to: patientEmail, patientName, doctorName, appointmentDate, startTime, cancelReason });
            break;
          case 'RESCHEDULING':
            result = await emailService.sendRescheduleNotification({ to: patientEmail, patientName, doctorName, oldDate: appointmentDate, oldTime: startTime, newDate: rescheduleDate, newTime: rescheduleStartTime });
            break;
          case 'DOCTOR_LEAVE':
            result = await emailService.sendDoctorLeaveNotification({ to: patientEmail, patientName, doctorName, appointmentDate, startTime });
            break;
          case 'MEDICATION_REMINDER':
            result = await emailService.sendMedicationReminder({ to: patientEmail, patientName, medicationName, dose });
            break;
          default:
            result = { success: false, error: `Unknown notification type: ${type}` };
        }
      } catch (err: any) {
        result = { success: false, error: err.message };
      }

      if (notifId) {
        const notif = await prisma.notification.findUnique({ where: { id: notifId } });
        const attempts = notif?.attempts ?? 1;
        const maxAttempts = notif?.maxAttempts ?? 3;
        const finalStatus = result.success ? 'SENT' : (attempts >= maxAttempts ? 'DEAD_LETTER' : 'FAILED');
        await prisma.notification.update({
          where: { id: notifId },
          data: { status: finalStatus as any, sentAt: result.success ? new Date() : undefined, errorMessage: result.success ? null : result.error },
        });
      }

      if (!result.success) {
        logger.warn(`Notification job ${job.id} failed: ${result.error}`);
        throw new Error(result.error);
      }

      logger.info(`Notification job ${job.id} sent successfully`);
      return result;
    },
    { connection: redis, concurrency: Number(process.env.WORKER_CONCURRENCY) || 5 }
  );

  worker.on('failed', (job, err) => logger.error(`Notification job ${job?.id} failed permanently`, { error: err.message }));
  worker.on('error', (err) => logger.error('Notification worker error', { error: err.message }));
  logger.info('Notification worker started');
  return worker;
}
