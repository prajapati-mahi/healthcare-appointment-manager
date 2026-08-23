import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  logger.error(err.message || err, { stack: err.stack, path: req.path });

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Prisma unique constraint error
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Resource conflict or slot already taken';
  }

  if (message.startsWith('SLOT_HELD') || message.startsWith('SLOT_BOOKED')) {
    statusCode = 409;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
};
