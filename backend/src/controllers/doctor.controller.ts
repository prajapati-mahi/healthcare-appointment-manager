import { Request, Response } from 'express';
import { doctorService } from '../services/doctor.service';
import { asyncHandler } from '../utils/response.utils';

export const doctorController = {
  searchDoctors: asyncHandler(async (req: Request, res: Response) => {
    const { q, specialization, page, limit } = req.query;
    const result = await doctorService.searchDoctors(
      q as string | undefined,
      specialization as string | undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 12
    );
    res.json({ success: true, ...result });
  }),

  getDoctorById: asyncHandler(async (req: Request, res: Response) => {
    const doctor = await doctorService.getDoctorById(String(req.params.id));
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: doctor });
  }),

  getSpecializations: asyncHandler(async (_req: Request, res: Response) => {
    const data = await doctorService.getSpecializations();
    res.json({ success: true, data });
  }),

  getMyProfile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await doctorService.getDoctorProfile(req.user!.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, data: profile });
  }),

  updateMyProfile: asyncHandler(async (req: Request, res: Response) => {
    const updated = await doctorService.updateDoctorProfile(req.user!.id, req.body);
    res.json({ success: true, data: updated });
  }),

  setWorkingHours: asyncHandler(async (req: Request, res: Response) => {
    const profile = await doctorService.getDoctorProfile(req.user!.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    const result = await doctorService.setWorkingHours(profile.id, req.body.hours);
    res.json({ success: true, data: result, message: 'Working hours updated' });
  }),

  getMyLeaves: asyncHandler(async (req: Request, res: Response) => {
    const leaves = await doctorService.getLeaves(req.user!.id, req.query.upcoming !== 'false');
    res.json({ success: true, data: leaves });
  }),

  addLeave: asyncHandler(async (req: Request, res: Response) => {
    const profile = await doctorService.getDoctorProfile(req.user!.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    const { leaveDate, reason } = req.body;
    if (!leaveDate) return res.status(422).json({ success: false, message: 'leaveDate is required' });
    const leave = await doctorService.addLeave(profile.id, req.user!.id, leaveDate, reason);
    res.status(201).json({ success: true, data: leave, message: 'Leave added. Affected appointments have been notified.' });
  }),

  removeLeave: asyncHandler(async (req: Request, res: Response) => {
    await doctorService.removeLeave(String(req.params.leaveId), req.user!.id);
    res.json({ success: true, message: 'Leave removed' });
  }),
};