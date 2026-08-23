import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import { calendarService } from '../services/calendar.service';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export function createCalendarSyncWorker() {
  const worker = new Worker(
    'calendar',
    async (job: Job) => {
      const { action, appointmentId, patientId, doctorId, patientEventId, doctorEventId, appointmentData } = job.data;
      logger.info(`Processing calendar job ${job.id}: action=${action}`);

      try {
        if (action === 'create') {
          const patientResult = patientId ? await calendarService.createEvent(patientId, appointmentData) : { success: false };
          const doctorResult = doctorId ? await calendarService.createEvent(doctorId, appointmentData) : { success: false };

          const syncStatus = (patientResult.success || doctorResult.success) ? 'SYNCED' : 'FAILED';
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
              calendarEventIdPatient: (patientResult as any).eventId ?? null,
              calendarEventIdDoctor: (doctorResult as any).eventId ?? null,
              calendarSyncStatus: syncStatus as any,
            },
          });
          if (syncStatus === 'FAILED') throw new Error('Calendar event creation failed');

        } else if (action === 'update') {
          if (patientEventId && patientId) await calendarService.updateEvent(patientId, patientEventId, appointmentData);
          if (doctorEventId && doctorId) await calendarService.updateEvent(doctorId, doctorEventId, appointmentData);
          await prisma.appointment.update({ where: { id: appointmentId }, data: { calendarSyncStatus: 'SYNCED' } });

        } else if (action === 'delete') {
          if (patientEventId && patientId) await calendarService.deleteEvent(patientId, patientEventId);
          if (doctorEventId && doctorId) await calendarService.deleteEvent(doctorId, doctorEventId);
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { calendarEventIdPatient: null, calendarEventIdDoctor: null, calendarSyncStatus: 'SYNCED' },
          });
        }
      } catch (err: any) {
        // Calendar failure MUST NOT fail the appointment - just log and mark
        logger.error(`Calendar job ${job.id} failed (non-critical)`, { error: err.message });
        try {
          await prisma.appointment.update({ where: { id: appointmentId }, data: { calendarSyncStatus: 'FAILED' } });
        } catch (_) {}
        throw err; // Re-throw for BullMQ retry
      }
    },
    { connection: redis, concurrency: 3 }
  );

  worker.on('failed', (job, err) => logger.error(`Calendar job ${job?.id} permanently failed`, { error: err.message }));
  worker.on('error', (err) => logger.error('Calendar worker error', { error: err.message }));
  logger.info('Calendar sync worker started');
  return worker;
}
