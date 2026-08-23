import { Queue } from 'bullmq';
import { redis } from '../config/redis';

export const createQueue = (name: string) => {
  return new Queue(name, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
};