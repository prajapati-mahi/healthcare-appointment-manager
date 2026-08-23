import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/response.utils';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(422).json({ success: false, message: 'email, password, and name are required' });
    }
    // Only allow PATIENT or DOCTOR self-registration; ADMIN must be seeded
    const allowedRoles = ['PATIENT', 'DOCTOR'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Cannot register with this role' });
    }
    try {
      const { user, token } = await authService.register({ email, password, name, role: role || 'PATIENT' });
      res.status(201).json({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
        },
        message: 'Registration successful',
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
      throw err;
    }
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({ success: false, message: 'email and password are required' });
    }
    try {
      const { user, token } = await authService.login({ email, password });
      res.json({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
        },
        message: 'Login successful',
      });
    } catch (_) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  }),

  logout: (_req: Request, res: Response) => {
    // JWT is stateless; client should discard the token
    res.json({ success: true, message: 'Logged out successfully' });
  },

  getMe: (req: Request, res: Response) => {
    res.json({ success: true, data: req.user });
  },
};