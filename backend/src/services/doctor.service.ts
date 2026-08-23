import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { notificationQueue } from '../queues/notification.queue';
import { calendarQueue } from '../queues/calendar.queue';

const prisma = new PrismaClient();

export const doctorService = {
  async searchDoctors(query?: string, specialization?: string, page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const where: any = { role: 'DOCTOR', isActive: true };
    if (query) where.name = { contains: query, mode: 'insensitive' };

    const profileWhere: any = { isActive: true };
    if (specialization) profileWhere.specialization = { contains: specialization, mode: 'insensitive' };

    const [total, users] = await Promise.all([
      prisma.user.count({ where: { ...where, doctorProfile: profileWhere } }),
      prisma.user.findMany({
        where: { ...where, doctorProfile: profileWhere },
        skip,
        take: limit,
        select: {
          id: true, name: true, email: true,
          doctorProfile: {
            select: {
              id: true, specialization: true, qualifications: true, bio: true,
              experienceYears: true, slotDuration: true, consultationFee: true,
              workingHours: { where: { isActive: true }, select: { dayOfWeek: true, startTime: true, endTime: true } },
            },
          },
        },
      }),
    ]);

    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getDoctorById(doctorId: string) {
    return prisma.user.findUnique({
      where: { id: doctorId, role: 'DOCTOR' },
      select: {
        id: true, name: true, email: true,
        doctorProfile: {
          select: {
            id: true, specialization: true, qualifications: true, bio: true,
            experienceYears: true, slotDuration: true, consultationFee: true,
            workingHours: { where: { isActive: true } },
            leaves: { where: { leaveDate: { gte: new Date() } }, orderBy: { leaveDate: 'asc' }, take: 10 },
          },
        },
      },
    });
  },

  async getDoctorProfile(userId: string) {
    return prisma.doctorProfile.findUnique({
      where: { userId },
      include: { workingHours: true, leaves: { where: { leaveDate: { gte: new Date() } }, orderBy: { leaveDate: 'asc' } } },
    });
  },

  async updateDoctorProfile(userId: string, data: {
    bio?: string; specialization?: string; qualifications?: string;
    experienceYears?: number; slotDuration?: number; consultationFee?: number;
  }) {
    return prisma.doctorProfile.update({
      where: { userId },
      data: { ...data },
    });
  },

  async setWorkingHours(doctorProfileId: string, hours: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>) {
    // Upsert working hours for each day
    const results = await Promise.all(
      hours.map(h =>
        prisma.workingHours.upsert({
          where: { doctorProfileId_dayOfWeek: { doctorProfileId, dayOfWeek: h.dayOfWeek } },
          create: { doctorProfileId, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isActive: h.isActive },
          update: { startTime: h.startTime, endTime: h.endTime, isActive: h.isActive },
        })
      )
    );
    logger.info(`Working hours updated for profile ${doctorProfileId}`);
    return results;
  },

  async addLeave(doctorProfileId: string, doctorId: string, leaveDate: string, reason?: string) {
    const date = new Date(leaveDate);
    date.setHours(0, 0, 0, 0);

    const leave = await prisma.doctorLeave.create({
      data: { doctorProfileId, leaveDate: date, reason },
    });

    logger.info(`Doctor leave added: ${doctorId} on ${leaveDate}`);

    // Handle conflict: find and cancel affected appointments
    await this.handleLeaveConflicts(doctorId, date);

    return leave;
  },

  async handleLeaveConflicts(doctorId: string, leaveDate: Date) {
    // Find all booked/confirmed appointments for this doctor on the leave date
    const startOfDay = new Date(leaveDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(leaveDate);
    endOfDay.setHours(23, 59, 59, 999);

    const affectedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: startOfDay, lte: endOfDay },
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { name: true } },
      },
    });

    if (affectedAppointments.length === 0) return;

    logger.info(`Leave conflict: cancelling ${affectedAppointments.length} appointments for doctor ${doctorId} on ${leaveDate.toISOString().split('T')[0]}`);

    for (const appt of affectedAppointments) {
      await prisma.$transaction(async (tx) => {
        // Update appointment status
        await tx.appointment.update({
          where: { id: appt.id },
          data: { status: 'DOCTOR_LEAVE', cancelReason: `Doctor is on leave on ${leaveDate.toISOString().split('T')[0]}`, cancelledBy: doctorId },
        });

        // Create notification record
        await tx.notification.create({
          data: {
            userId: appt.patientId,
            appointmentId: appt.id,
            type: 'DOCTOR_LEAVE',
            channel: 'EMAIL',
            status: 'PENDING',
            subject: 'Your appointment has been cancelled - Doctor unavailable',
            metadata: {
              patientName: appt.patient.name,
              doctorName: appt.doctor.name,
              appointmentDate: leaveDate.toISOString().split('T')[0],
              startTime: appt.startTime,
            } as any,
          },
        });
      });

      // Queue email notification (non-critical)
      try {
        await notificationQueue.add('doctor-leave-notification', {
          type: 'DOCTOR_LEAVE',
          appointmentId: appt.id,
          patientId: appt.patientId,
          patientEmail: appt.patient.email,
          patientName: appt.patient.name,
          doctorName: appt.doctor.name,
          appointmentDate: leaveDate.toISOString().split('T')[0],
          startTime: appt.startTime,
        }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
      } catch (err) {
        logger.error('Failed to queue doctor leave notification', { error: err, appointmentId: appt.id });
      }

      // Queue calendar deletion (non-critical)
      try {
        if (appt.calendarEventIdPatient || appt.calendarEventIdDoctor) {
          await calendarQueue.add('delete-leave-event', {
            action: 'delete',
            appointmentId: appt.id,
            patientId: appt.patientId,
            doctorId,
            patientEventId: appt.calendarEventIdPatient,
            doctorEventId: appt.calendarEventIdDoctor,
          });
        }
      } catch (err) {
        logger.error('Failed to queue calendar deletion for leave', { error: err });
      }
    }

    return affectedAppointments.length;
  },

  async removeLeave(leaveId: string, doctorId: string) {
    const leave = await prisma.doctorLeave.findUnique({
      where: { id: leaveId },
      include: { doctorProfile: { select: { userId: true } } },
    });
    if (!leave || leave.doctorProfile.userId !== doctorId) {
      throw new Error('Leave not found or access denied');
    }
    await prisma.doctorLeave.delete({ where: { id: leaveId } });
    logger.info(`Leave ${leaveId} removed by doctor ${doctorId}`);
    return { success: true };
  },

  async getLeaves(doctorId: string, upcoming = true) {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
    if (!profile) return [];
    const where: any = { doctorProfileId: profile.id };
    if (upcoming) where.leaveDate = { gte: new Date() };
    return prisma.doctorLeave.findMany({ where, orderBy: { leaveDate: 'asc' } });
  },

  async getSpecializations() {
    const result = await prisma.doctorProfile.findMany({
      where: { isActive: true },
      select: { specialization: true },
      distinct: ['specialization'],
    });
    return result.map(r => r.specialization);
  },
};