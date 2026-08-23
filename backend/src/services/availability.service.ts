import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: 'BOOKED' | 'HELD' | 'DOCTOR_LEAVE' | 'PAST';
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export const availabilityService = {
  async generateSlots(doctorId: string, date: string): Promise<TimeSlot[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon, ...

    // 1. Get doctor profile
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
      include: {
        workingHours: {
          where: { dayOfWeek, isActive: true },
        },
        leaves: {
          where: { leaveDate: targetDate },
        },
      },
    });

    if (!doctorProfile) {
      return [];
    }

    // 2. Check if doctor is on leave
    if (doctorProfile.leaves.length > 0) {
      logger.info(`Doctor ${doctorId} is on leave on ${date}`);
      return [];
    }

    // 3. Check if doctor works on this day
    const workingHours = doctorProfile.workingHours[0];
    if (!workingHours) {
      return []; // Doctor doesn't work on this day
    }

    // 4. Get existing booked/confirmed appointments for this day
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: targetDate, lte: endOfDay },
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
      select: { startTime: true, endTime: true },
    });

    // 5. Get active slot holds for this day
    const activeHolds = await prisma.slotHold.findMany({
      where: {
        doctorId,
        holdDate: targetDate,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: { startTime: true, endTime: true },
    });

    // 6. Generate all slots
    const slots: TimeSlot[] = [];
    const slotDuration = doctorProfile.slotDuration;
    const now = new Date();
    const isToday = targetDate.toDateString() === now.toDateString();

    let current = workingHours.startTime;
    const endWork = workingHours.endTime;
    const endWorkMins = timeToMinutes(endWork);

    while (timeToMinutes(current) + slotDuration <= endWorkMins) {
      const slotEnd = addMinutes(current, slotDuration);

      // Check if slot is in the past (for today)
      if (isToday) {
        const [sh, sm] = current.split(':').map(Number);
        const slotDateTime = new Date(targetDate);
        slotDateTime.setHours(sh, sm, 0, 0);
        if (slotDateTime <= now) {
          slots.push({ startTime: current, endTime: slotEnd, available: false, reason: 'PAST' });
          current = slotEnd;
          continue;
        }
      }

      // Check if booked
      const isBooked = existingAppointments.some(
        (a) => a.startTime === current
      );
      if (isBooked) {
        slots.push({ startTime: current, endTime: slotEnd, available: false, reason: 'BOOKED' });
        current = slotEnd;
        continue;
      }

      // Check if held
      const isHeld = activeHolds.some((h) => h.startTime === current);
      if (isHeld) {
        slots.push({ startTime: current, endTime: slotEnd, available: false, reason: 'HELD' });
        current = slotEnd;
        continue;
      }

      slots.push({ startTime: current, endTime: slotEnd, available: true });
      current = slotEnd;
    }

    return slots;
  },

  async getAvailableDates(doctorId: string, month: string): Promise<string[]> {
    // Returns dates in the given month where the doctor has at least one available slot
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0); // Last day of month

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
      include: {
        workingHours: { where: { isActive: true } },
        leaves: {
          where: {
            leaveDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    if (!doctorProfile) return [];

    const workingDays = new Set(doctorProfile.workingHours.map((wh) => wh.dayOfWeek));
    const leaveDates = new Set(
      doctorProfile.leaves.map((l) => l.leaveDate.toISOString().split('T')[0])
    );

    const availableDates: string[] = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();

      if (
        current >= today &&
        workingDays.has(dayOfWeek) &&
        !leaveDates.has(dateStr)
      ) {
        availableDates.push(dateStr);
      }

      current.setDate(current.getDate() + 1);
    }

    return availableDates;
  },
};