import { Request, Response, NextFunction } from 'express';
import { availabilityService } from '../services/availability.service';
import { slotHoldService } from '../services/slotHold.service';
import { asyncHandler } from '../utils/response.utils';

export const availabilityController = {
  // Public: Get available slots for a doctor on a date
  getSlots: asyncHandler(async (req: Request, res: Response) => {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(422).json({ success: false, message: 'doctorId and date are required' });
    }
    const slots = await availabilityService.generateSlots(doctorId as string, date as string);
    res.json({ success: true, data: slots });
  }),

  // Public: Get available dates for a doctor in a month
  getAvailableDates: asyncHandler(async (req: Request, res: Response) => {
    const { doctorId, month } = req.query;
    if (!doctorId || !month) {
      return res.status(422).json({ success: false, message: 'doctorId and month (YYYY-MM) are required' });
    }
    const dates = await availabilityService.getAvailableDates(doctorId as string, month as string);
    res.json({ success: true, data: dates });
  }),

  // Patient: Create a slot hold (reserves slot for 5 min)
  holdSlot: asyncHandler(async (req: Request, res: Response) => {
    const { doctorId, date, startTime, endTime } = req.body;
    if (!doctorId || !date || !startTime || !endTime) {
      return res.status(422).json({ success: false, message: 'Missing required fields for slot hold' });
    }

    const hold = await slotHoldService.createHold(
      req.user!.id,
      doctorId,
      date,
      startTime,
      endTime
    );

    res.status(201).json({
      success: true,
      data: {
        holdId: hold.id,
        expiresAt: hold.expiresAt,
        expiresInSeconds: Math.floor((hold.expiresAt.getTime() - Date.now()) / 1000),
      },
      message: 'Slot reserved for 5 minutes',
    });
  }),

  // Patient: Release a hold manually
  releaseHold: asyncHandler(async (req: Request, res: Response) => {
    await slotHoldService.releaseHold(String(req.params.holdId));
    res.json({ success: true, message: 'Slot hold released' });
  }),
};

// Legacy exports for backward compatibility
export const getAvailability = availabilityController.getSlots;
export const holdSlot = availabilityController.holdSlot;