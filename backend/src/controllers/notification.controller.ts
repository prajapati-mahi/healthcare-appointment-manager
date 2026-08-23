import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/response.utils';

export const notificationController = {
  getMyNotifications: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query;
    const result = await notificationService.getUserNotifications(
      req.user!.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );
    res.json({ success: true, ...result });
  }),

  getStats: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await notificationService.getStats();
    res.json({ success: true, data: stats });
  }),

  retryNotification: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.retryNotification(String(req.params.id));
    res.json({ success: true, message: 'Notification queued for retry' });
  }),
};