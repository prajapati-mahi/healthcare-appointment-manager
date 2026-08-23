import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../config/logger';
import { notificationQueue } from '../queues/notification.queue';
import { calendarQueue } from '../queues/calendar.queue';

import { llmService } from './llm.service';

const prisma = new PrismaClient();

type BookingData = {
  patientId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  holdId: string;
  symptoms: string;
  symptomDuration?: string;
  symptomSeverity?: string;
  additionalInfo?: string;
};

export const appointmentService = {
  /**
   * CONCURRENCY-SAFE booking using a Prisma transaction.
   * The partial unique index on (doctorId, appointmentDate, startTime) WHERE status IN ('BOOKED','CONFIRMED','HOLD')
   * guarantees that even if two requests race, only one can succeed.
   */
  async bookAppointment(data: BookingData) {
    const appointmentDate = new Date(data.date);

    const appointment = await prisma.$transaction(async (tx) => {
      // 1. Verify hold is active and belongs to this patient
      const hold = await tx.slotHold.findUnique({ where: { id: data.holdId } });
      if (!hold || !hold.isActive) {
        throw new Error('HOLD_EXPIRED: Your slot reservation has expired. Please select another slot.');
      }
      if (hold.patientId !== data.patientId) {
        throw new Error('HOLD_INVALID: Slot hold does not belong to this patient.');
      }
      if (hold.expiresAt < new Date()) {
        await tx.slotHold.update({ where: { id: data.holdId }, data: { isActive: false } });
        throw new Error('HOLD_EXPIRED: Your slot reservation has expired. Please select another slot.');
      }

      // 2. Re-verify no active appointment exists (race condition guard)
      const existing = await tx.appointment.findFirst({
        where: {
          doctorId: data.doctorId,
          appointmentDate,
          startTime: data.startTime,
          status: { in: ['BOOKED', 'CONFIRMED', 'HOLD'] },
        },
      });
      if (existing) {
        throw new Error('SLOT_TAKEN: This slot was just booked by another patient. Please select another slot.');
      }

      // 3. Create appointment (DB partial unique index is the final safety net)
      const newAppointment = await tx.appointment.create({
        data: {
          patientId: data.patientId,
          doctorId: data.doctorId,
          appointmentDate,
          startTime: data.startTime,
          endTime: data.endTime,
          status: 'BOOKED',
          symptoms: data.symptoms,
          symptomDuration: data.symptomDuration,
          symptomSeverity: data.symptomSeverity,
          additionalInfo: data.additionalInfo,
          calendarSyncStatus: 'PENDING',
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: {
            select: {
              id: true, name: true, email: true,
              doctorProfile: { select: { specialization: true } },
            },
          },
        },
      });

      // 4. Release the slot hold
      await tx.slotHold.update({ where: { id: data.holdId }, data: { isActive: false } });

      // 5. Create notification records
      await tx.notification.create({
        data: {
          userId: data.patientId,
          appointmentId: newAppointment.id,
          type: 'BOOKING_CONFIRMATION',
          channel: 'EMAIL',
          status: 'PENDING',
          subject: 'Appointment Confirmed',
          metadata: {
            patientName: newAppointment.patient.name,
            doctorName: newAppointment.doctor.name,
            doctorSpecialization: (newAppointment.doctor as any).doctorProfile?.specialization,
            appointmentDate: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
          } as Prisma.InputJsonValue,
        },
      });

      return newAppointment;
    });

    // --- Post-transaction: queue async jobs (these can fail without affecting the booking) ---

    // Queue email notifications
    try {
      await notificationQueue.add(
        'booking-confirmation',
        {
          type: 'BOOKING_CONFIRMATION',
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          patientEmail: appointment.patient.email,
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          doctorEmail: appointment.doctor.email,
          doctorSpecialization: (appointment.doctor as any).doctorProfile?.specialization,
          appointmentDate: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      );

      await notificationQueue.add(
        'new-booking-doctor',
        {
          type: 'NEW_BOOKING_DOCTOR',
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          patientName: appointment.patient.name,
          doctorId: appointment.doctorId,
          doctorEmail: appointment.doctor.email,
          doctorName: appointment.doctor.name,
          appointmentDate: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      );
    } catch (err) {
      logger.error('Failed to queue booking notification', { error: err, appointmentId: appointment.id });
      // Non-critical: appointment is already booked
    }

    // Queue calendar event creation
    try {
      await calendarQueue.add(
        'create-calendar-event',
        {
          action: 'create',
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          appointmentData: {
            title: `Medical Appointment - Dr. ${appointment.doctor.name}`,
            description: `Appointment with Dr. ${appointment.doctor.name} (${(appointment.doctor as any).doctorProfile?.specialization || 'Specialist'})`,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
          },
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
    } catch (err) {
      logger.error('Failed to queue calendar event', { error: err, appointmentId: appointment.id });
      // Non-critical: appointment is already booked
    }

    // Queue LLM pre-visit summary generation (async, non-blocking)
    try {
      if (data.symptoms) {
        setImmediate(async () => {
          const summary = await llmService.generatePreVisitSummary(
            data.symptoms,
            data.symptomDuration ?? '',
            data.symptomSeverity ?? ''
          );
          if (summary) {
            await prisma.appointment.update({
              where: { id: appointment.id },
              data: {
                urgencyLevel: summary.urgencyLevel as any,
                chiefComplaint: summary.chiefComplaint,
                suggestedQuestions: summary.suggestedQuestions,
                preVisitSummaryStatus: 'GENERATED',
              },
            });
            logger.info(`Pre-visit summary generated for appointment ${appointment.id}`);
          } else {
            await prisma.appointment.update({
              where: { id: appointment.id },
              data: { preVisitSummaryStatus: 'FAILED' },
            });
          }
        });
      }
    } catch (err) {
      logger.error('Failed to trigger LLM summary', { error: err });
    }

    logger.info(`Appointment booked: ${appointment.id} - Patient: ${data.patientId}, Doctor: ${data.doctorId}, Date: ${data.date} ${data.startTime}`);
    return appointment;
  },

  async getAppointmentById(appointmentId: string, requestingUserId: string, requestingUserRole: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { id: true, name: true, email: true, phone: true, dateOfBirth: true } },
        doctor: {
          select: {
            id: true, name: true, email: true,
            doctorProfile: { select: { specialization: true, qualifications: true } },
          },
        },
        prescriptions: true,
        medications: true,
      },
    });

    if (!appointment) throw new Error('Appointment not found');

    // Access control
    if (requestingUserRole === 'PATIENT' && appointment.patientId !== requestingUserId) {
      throw new Error('FORBIDDEN: Cannot view this appointment');
    }
    if (requestingUserRole === 'DOCTOR' && appointment.doctorId !== requestingUserId) {
      throw new Error('FORBIDDEN: Cannot view this appointment');
    }

    // Patient should not see unapproved doctor summary
    if (requestingUserRole === 'PATIENT' && !appointment.summaryApprovedByDoctor) {
      return { ...appointment, patientFriendlySummary: null };
    }

    return appointment;
  },

  async getPatientAppointments(patientId: string, status?: string | undefined, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: any = { patientId };
    if (status) where.status = status;

    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ appointmentDate: 'desc' }, { startTime: 'asc' }],
        include: {
          doctor: {
            select: {
              name: true,
              doctorProfile: { select: { specialization: true } },
            },
          },
        },
      }),
    ]);

    return { data: appointments, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getDoctorAppointments(doctorId: string, dateFilter?: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { doctorId };
    if (status) where.status = status;
    if (dateFilter) {
      const date = new Date(dateFilter);
      date.setHours(0, 0, 0, 0);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      where.appointmentDate = { gte: date, lt: next };
    }

    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
        include: {
          patient: { select: { id: true, name: true, email: true, phone: true, dateOfBirth: true } },
        },
      }),
    ]);

    return { data: appointments, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async cancelAppointment(appointmentId: string, requestingUserId: string, requestingUserRole: string, reason?: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { name: true, email: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!appointment) throw new Error('Appointment not found');

    // Authorization
    if (requestingUserRole === 'PATIENT' && appointment.patientId !== requestingUserId) {
      throw new Error('FORBIDDEN');
    }
    if (requestingUserRole === 'DOCTOR' && appointment.doctorId !== requestingUserId) {
      throw new Error('FORBIDDEN');
    }

    // State machine validation
    if (['COMPLETED', 'CANCELLED', 'DOCTOR_LEAVE'].includes(appointment.status)) {
      throw new Error(`Cannot cancel appointment with status: ${appointment.status}`);
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
        cancelledBy: requestingUserId,
      },
    });

    logger.info(`Appointment ${appointmentId} cancelled by ${requestingUserId}`);

    // Queue cancellation email (non-critical)
    try {
      await notificationQueue.add(
        'cancellation',
        {
          type: 'CANCELLATION',
          appointmentId,
          patientId: appointment.patientId,
          patientEmail: appointment.patient.email,
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
          startTime: appointment.startTime,
          cancelReason: reason,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      );

      // Queue calendar deletion
      if (appointment.calendarEventIdPatient || appointment.calendarEventIdDoctor) {
        await calendarQueue.add(
          'delete-event',
          {
            action: 'delete',
            appointmentId,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            patientEventId: appointment.calendarEventIdPatient,
            doctorEventId: appointment.calendarEventIdDoctor,
          },
          { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
        );
      }
    } catch (err) {
      logger.error('Failed to queue cancellation notification', { error: err, appointmentId });
    }

    return { success: true };
  },

  async rescheduleAppointment(
    appointmentId: string,
    requestingUserId: string,
    requestingUserRole: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    newHoldId: string
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { name: true, email: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!appointment) throw new Error('Appointment not found');

    if (requestingUserRole === 'PATIENT' && appointment.patientId !== requestingUserId) {
      throw new Error('FORBIDDEN');
    }
    if (!['BOOKED', 'CONFIRMED'].includes(appointment.status)) {
      throw new Error(`Cannot reschedule appointment with status: ${appointment.status}`);
    }

    const newAppointmentDate = new Date(newDate);
    const oldDate = appointment.appointmentDate.toISOString().split('T')[0];
    const oldTime = appointment.startTime;

    await prisma.$transaction(async (tx) => {
      // Verify hold for new slot
      const hold = await tx.slotHold.findUnique({ where: { id: newHoldId } });
      if (!hold || !hold.isActive || hold.expiresAt < new Date()) {
        throw new Error('HOLD_EXPIRED: New slot reservation has expired. Please select another slot.');
      }

      // Check new slot is available
      const existingAtNew = await tx.appointment.findFirst({
        where: {
          doctorId: appointment.doctorId,
          appointmentDate: newAppointmentDate,
          startTime: newStartTime,
          status: { in: ['BOOKED', 'CONFIRMED', 'HOLD'] },
          id: { not: appointmentId },
        },
      });
      if (existingAtNew) {
        throw new Error('SLOT_TAKEN: The new slot is no longer available.');
      }

      // Update appointment
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          appointmentDate: newAppointmentDate,
          startTime: newStartTime,
          endTime: newEndTime,
          status: 'BOOKED',
          rescheduledFrom: `${oldDate} ${oldTime}`,
          calendarSyncStatus: 'PENDING',
        },
      });

      // Release new hold
      await tx.slotHold.update({ where: { id: newHoldId }, data: { isActive: false } });
    });

    logger.info(`Appointment ${appointmentId} rescheduled from ${oldDate} ${oldTime} to ${newDate} ${newStartTime}`);

    // Queue notifications and calendar update (non-critical)
    try {
      await notificationQueue.add(
        'reschedule',
        {
          type: 'RESCHEDULING',
          appointmentId,
          patientId: appointment.patientId,
          patientEmail: appointment.patient.email,
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          appointmentDate: oldDate,
          startTime: oldTime,
          rescheduleDate: newDate,
          rescheduleStartTime: newStartTime,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      );

      if (appointment.calendarEventIdPatient || appointment.calendarEventIdDoctor) {
        await calendarQueue.add(
          'update-event',
          {
            action: 'update',
            appointmentId,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            patientEventId: appointment.calendarEventIdPatient,
            doctorEventId: appointment.calendarEventIdDoctor,
            appointmentData: { date: newDate, startTime: newStartTime, endTime: newEndTime },
          },
          { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
        );
      }
    } catch (err) {
      logger.error('Failed to queue reschedule notification', { error: err, appointmentId });
    }

    return { success: true };
  },

  async completeAppointment(
    appointmentId: string,
    doctorId: string,
    postVisitNotes: string,
    diagnosis?: string,
    followUpDate?: Date
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId, doctorId },
    });
    if (!appointment) throw new Error('Appointment not found');
    if (appointment.status !== 'BOOKED' && appointment.status !== 'CONFIRMED') {
      throw new Error(`Cannot complete appointment with status: ${appointment.status}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED', postVisitNotes },
      });

      if (diagnosis || followUpDate) {
        await tx.prescription.create({
          data: {
            appointmentId,
            diagnosis,
            followUpDate,
            notes: postVisitNotes,
          },
        });
      }
    });

    logger.info(`Appointment ${appointmentId} completed`);
    return { success: true };
  },

  async getTodayAppointments(doctorId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: today, lt: tomorrow },
        status: { in: ['BOOKED', 'CONFIRMED', 'COMPLETED'] },
      },
      orderBy: { startTime: 'asc' },
      include: {
        patient: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  },
};