import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  logger.error(err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ error: message });
};
