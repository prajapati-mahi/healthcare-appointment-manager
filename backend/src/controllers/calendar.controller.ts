import { Request, Response } from 'express';
import { calendarService } from '../services/calendar.service';
import { asyncHandler } from '../utils/response.utils';

export const calendarController = {
  getAuthUrl: asyncHandler(async (req: Request, res: Response) => {
    const url = calendarService.getAuthUrl(req.user!.id);
    if (!url) {
      return res.json({ success: false, message: 'Google Calendar is not configured on this server.', url: null });
    }
    res.json({ success: true, data: { url } });
  }),

  handleCallback: asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'Missing authorization code' });
    const result = await calendarService.handleCallback(String(state || req.user?.id || ''), String(code));
    if (!result.success) {
      return res.redirect(`${process.env.CORSORIGIN}/dashboard?calendar_error=${encodeURIComponent(result.error || 'Failed')}`);
    }
    res.redirect(`${process.env.CORSORIGIN}/dashboard?calendar_connected=true`);
  }),

  getStatus: asyncHandler(async (req: Request, res: Response) => {
    const status = await calendarService.getConnectionStatus(req.user!.id);
    res.json({ success: true, data: status });
  }),

  disconnect: asyncHandler(async (req: Request, res: Response) => {
    await calendarService.disconnect(req.user!.id);
    res.json({ success: true, message: 'Google Calendar disconnected' });
  }),
};