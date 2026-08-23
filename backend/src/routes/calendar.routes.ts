import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get OAuth URL
router.get('/auth', authenticate, calendarController.getAuthUrl);

// OAuth callback (redirect URI from Google)
router.get('/callback', calendarController.handleCallback);

// Get connection status
router.get('/status', authenticate, calendarController.getStatus);

// Disconnect Google Calendar
router.post('/disconnect', authenticate, calendarController.disconnect);

export default router;