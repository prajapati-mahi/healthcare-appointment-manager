import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export function createSlotHoldWorker() {
  const worker = new Worker(
    'slotHold',
    async (job: Job) => {
      logger.info(`Running slot hold cleanup job ${job.id}`);
      const now = new Date();
      const result = await prisma.slotHold.updateMany({
        where: { isActive: true, expiresAt: { lt: now } },
        data: { isActive: false },
      });
      if (result.count > 0) {
        logger.info(`Slot hold cleanup: released ${result.count} expired holds`);
      }
      return { cleaned: result.count };
    },
    { connection: redis, concurrency: 1 }
  );

  worker.on('error', (err) => {
    logger.error('Slot hold worker error', { error: err.message });
  });

  logger.info('Slot hold cleanup worker started');
  return worker;
}
