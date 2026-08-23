import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/response.utils';

const prisma = new PrismaClient();

export const adminController = {
  getDashboard: asyncHandler(async (_req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalUsers, totalDoctors, totalPatients, totalAppointments, todayAppointments, pendingNotifications, calendarFailed] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'DOCTOR', isActive: true } }),
      prisma.user.count({ where: { role: 'PATIENT', isActive: true } }),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { appointmentDate: { gte: today, lt: tomorrow } } }),
      prisma.notification.count({ where: { status: { in: ['PENDING', 'FAILED', 'RETRYING'] } } }),
      prisma.appointment.count({ where: { calendarSyncStatus: 'FAILED' } }),
    ]);

    res.json({
      success: true,
      data: { totalUsers, totalDoctors, totalPatients, totalAppointments, todayAppointments, pendingNotifications, calendarFailed },
    });
  }),

  getAllAppointments: asyncHandler(async (req: Request, res: Response) => {
    const { status, date, page, limit } = req.query;
    const skip = (Number(page || 1) - 1) * Number(limit || 20);
    const where: any = {};
    if (status) where.status = status;
    if (date) {
      const d = new Date(String(date));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.appointmentDate = { gte: d, lt: next };
    }

    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: Number(limit || 20),
        orderBy: [{ appointmentDate: 'desc' }, { startTime: 'asc' }],
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true, doctorProfile: { select: { specialization: true } } } },
        },
      }),
    ]);

    res.json({ success: true, data: appointments, total, page: Number(page || 1) });
  }),

  getAllUsers: asyncHandler(async (req: Request, res: Response) => {
    const { role, page, limit } = req.query;
    const result = await userService.getAllUsers(
      role as string | undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );
    res.json({ success: true, ...result });
  }),

  toggleUserStatus: asyncHandler(async (req: Request, res: Response) => {
    const result = await userService.toggleUserStatus(String(req.params.id));
    res.json({ success: true, data: result, message: `User ${result.isActive ? 'activated' : 'deactivated'}` });
  }),

  getCalendarFailures: asyncHandler(async (_req: Request, res: Response) => {
    const appointments = await prisma.appointment.findMany({
      where: { calendarSyncStatus: 'FAILED' },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        patient: { select: { name: true } },
        doctor: { select: { name: true } },
      },
    });
    res.json({ success: true, data: appointments });
  }),
};