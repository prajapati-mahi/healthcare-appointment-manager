import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/response.utils';

export const userController = {
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const profile = await userService.getProfile(req.user!.id);
    if (!profile) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: profile });
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const { name, phone, dateOfBirth, gender, address } = req.body;
    const updated = await userService.updateProfile(req.user!.id, { name, phone, dateOfBirth, gender, address });
    res.json({ success: true, data: updated, message: 'Profile updated' });
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(422).json({ success: false, message: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(422).json({ success: false, message: 'New password must be at least 8 characters' });
    }
    await userService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  }),
};