import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

prisma.$connect()
  .then(() => logger.info('Connected to PostgreSQL via Prisma'))
  .catch((err) => logger.error('Failed to connect to database', err));
