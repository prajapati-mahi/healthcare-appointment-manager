import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const slotHoldService = {
  /**
   * Create a slot hold for the given slot.
   * DB-level unique constraint on [doctorId, holdDate, startTime, isActive=true]
   * ensures only one active hold can exist per slot at any time.
   */
  async createHold(
    patientId: string,
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{ id: string; expiresAt: Date }> {
    const holdDate = new Date(date);
    holdDate.setHours(0, 0, 0, 0);
    const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);

    // Check for existing active hold for this slot (by another patient)
    const existingHold = await prisma.slotHold.findFirst({
      where: {
        doctorId,
        holdDate,
        startTime,
        isActive: true,
        expiresAt: { gt: new Date() }, // Not yet expired
      },
    });

    if (existingHold) {
      if (existingHold.patientId === patientId) {
        // Renew hold for same patient
        const updated = await prisma.slotHold.update({
          where: { id: existingHold.id },
          data: { expiresAt },
        });
        logger.info(`Slot hold renewed: ${updated.id} for patient ${patientId}`);
        return { id: updated.id, expiresAt: updated.expiresAt };
      } else {
        throw new Error('SLOT_HELD: This slot is temporarily reserved by another patient. Please select another slot.');
      }
    }

    // Also check if the slot is already booked
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: holdDate,
        startTime,
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
    });
    if (existingAppointment) {
      throw new Error('SLOT_BOOKED: This slot is already booked.');
    }

    // Deactivate any old expired holds for this patient on this slot
    await prisma.slotHold.updateMany({
      where: { patientId, doctorId, holdDate, startTime, isActive: true },
      data: { isActive: false },
    });

    // Create new hold - DB unique constraint provides final safety net
    try {
      const hold = await prisma.slotHold.create({
        data: {
          patientId,
          doctorId,
          holdDate,
          startTime,
          endTime,
          expiresAt,
          isActive: true,
        },
      });

      logger.info(`Slot hold created: ${hold.id} for doctor ${doctorId} on ${date} ${startTime}`);
      return { id: hold.id, expiresAt: hold.expiresAt };
    } catch (err: any) {
      // Unique constraint violation = race condition caught at DB level
      if (err.code === 'P2002') {
        throw new Error('SLOT_HELD: This slot was just reserved by another patient. Please select another slot.');
      }
      throw err;
    }
  },

  async releaseHold(holdId: string): Promise<void> {
    await prisma.slotHold.updateMany({
      where: { id: holdId, isActive: true },
      data: { isActive: false },
    });
  },

  async releasePatientHolds(patientId: string): Promise<void> {
    await prisma.slotHold.updateMany({
      where: { patientId, isActive: true },
      data: { isActive: false },
    });
  },

  async getActiveHold(holdId: string) {
    const hold = await prisma.slotHold.findUnique({ where: { id: holdId } });
    if (!hold || !hold.isActive || hold.expiresAt < new Date()) return null;
    return hold;
  },

  async cleanupExpiredHolds(): Promise<number> {
    const result = await prisma.slotHold.updateMany({
      where: { isActive: true, expiresAt: { lt: new Date() } },
      data: { isActive: false },
    });
    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired slot holds`);
    }
    return result.count;
  },

  async getPatientActiveHolds(patientId: string) {
    return prisma.slotHold.findMany({
      where: { patientId, isActive: true, expiresAt: { gt: new Date() } },
    });
  },
};