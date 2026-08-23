import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.get('/my', authenticate, notificationController.getMyNotifications);
router.get('/stats', authenticate, requireRole('ADMIN'), notificationController.getStats);
router.post('/:id/retry', authenticate, requireRole('ADMIN'), notificationController.retryNotification);

export default router;