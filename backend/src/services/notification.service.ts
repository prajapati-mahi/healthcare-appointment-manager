import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export const notificationService = {
  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data: notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getStats() {
    const [total, sent, failed, deadLetter, pending] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { status: 'SENT' } }),
      prisma.notification.count({ where: { status: 'FAILED' } }),
      prisma.notification.count({ where: { status: 'DEAD_LETTER' } }),
      prisma.notification.count({ where: { status: { in: ['PENDING', 'RETRYING'] } } }),
    ]);
    return {
      total, sent, failed, deadLetter, pending,
      successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
    };
  },

  async retryNotification(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!notification) throw new Error('Notification not found');
    if (!['FAILED', 'DEAD_LETTER'].includes(notification.status)) {
      throw new Error('Only failed notifications can be retried');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'PENDING', errorMessage: null, attempts: 0 },
    });

    const { notificationQueue } = await import('../queues/notification.queue');
    await notificationQueue.add(
      'retry-notification',
      {
        notificationId,
        type: notification.type,
        appointmentId: notification.appointmentId,
        patientId: notification.userId,
        patientEmail: notification.user.email,
        patientName: notification.user.name,
        ...((notification.metadata as Record<string, any>) || {}),
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
    );

    logger.info(`Notification ${notificationId} queued for retry`);
    return { success: true };
  },

  async markAllRead(userId: string) {
    // No read/unread in schema, but useful endpoint
    return { success: true };
  },
};