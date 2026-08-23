import 'dotenv/config';
import { logger } from '../config/logger';
import { slotHoldQueue } from '../queues/slotHold.queue';
import { createNotificationWorker } from './notification.worker';
import { createMedicationWorker } from './medication.worker';
import { createCalendarSyncWorker } from './calendarSync.worker';
import { createSlotHoldWorker } from './slotHold.worker';

async function startWorkers() {
  logger.info('Starting background workers...');

  // Start all workers
  createNotificationWorker();
  createMedicationWorker();
  createCalendarSyncWorker();
  createSlotHoldWorker();

  // Schedule recurring slot-hold cleanup job (every 60 seconds)
  try {
    // Use 'as any' to handle BullMQ version differences in repeat option type
    await slotHoldQueue.add(
      'cleanup-expired-holds',
      {},
      { jobId: 'slot-hold-cleanup-recurring' } as any
    );
    // Schedule a repeating cleanup using setInterval as an alternative
    setInterval(async () => {
      await slotHoldQueue.add('cleanup-expired-holds', {}, { removeOnComplete: true } as any);
    }, 60000);
    logger.info('Slot-hold cleanup scheduled every 60 seconds');
  } catch (err) {
    logger.warn('Could not schedule slot-hold cleanup job', { error: err });
  }

  logger.info('All workers started successfully');
}

startWorkers().catch((err) => {
  console.error('Error starting workers:', err);
  logger.error('Failed to start workers', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => { logger.info('SIGTERM received'); process.exit(0); });
process.on('SIGINT', () => { logger.info('SIGINT received'); process.exit(0); });