const fs = require('fs');
const path = require('path');

const write = (p, content) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.trim());
};

// Services
write('src/services/auth.service.ts', `
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { generateToken } from '../utils/token.utils';
import { Role } from '../config/constants';
export class AuthService {
  async register(data: any) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({ data: { email: data.email, passwordHash, name: data.name, role: data.role || Role.PATIENT } });
    return { user, token: generateToken(user.id, user.role as Role) };
  }
  async login(data: any) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) throw new Error('Invalid credentials');
    return { user, token: generateToken(user.id, user.role as Role) };
  }
}
export const authService = new AuthService();
`);

write('src/services/user.service.ts', `
import { prisma } from '../config/database';
export const userService = { getUserById: async (id: string) => prisma.user.findUnique({ where: { id } }) };
`);

write('src/services/doctor.service.ts', `
import { prisma } from '../config/database';
export const doctorService = { getAll: async () => prisma.doctorProfile.findMany({include:{user:true}}) };
`);

write('src/services/appointment.service.ts', `
import { prisma } from '../config/database';
import { AppointmentStatus } from '../config/constants';
export const appointmentService = {
  bookAppointment: async (patientId: string, doctorId: string, date: string, startTime: string, endTime: string, symptoms?: string, holdId?: string) => {
    return prisma.appointment.create({
      data: { patientId, doctorId, appointmentDate: new Date(date), startTime, endTime, symptoms, status: AppointmentStatus.BOOKED }
    });
  },
  cancelAppointment: async (id: string, userId: string, reason?: string) => {
    return prisma.appointment.update({ where: { id }, data: { status: AppointmentStatus.CANCELLED, cancelReason: reason, cancelledBy: userId }});
  }
};
`);

write('src/services/availability.service.ts', `
export const availabilityService = { generateSlots: async (doctorId: string, date: string) => { return []; } };
`);

write('src/services/slotHold.service.ts', `
export const slotHoldService = { createHold: async (patientId: string, doctorId: string, date: string, startTime: string, endTime: string) => { return null; } };
`);

write('src/services/llm.service.ts', `
export const llmService = { generatePreVisitSummary: async () => null, generatePostVisitSummary: async () => null };
`);

write('src/services/email.service.ts', `
export const emailService = { send: async (to: string, sub: string, html: string) => { return { success: true }; } };
`);

write('src/services/calendar.service.ts', `
export const calendarService = { getAuthUrl: (userId: string) => '', getTokens: async (code: string) => ({ success: true, tokens: {} }), storeTokens: async () => ({ success: true }), createEvent: async () => ({ success: true, eventId: '123' }) };
`);

write('src/services/medication.service.ts', `
export const medicationService = { addMedication: async () => null };
`);

write('src/services/notification.service.ts', `
export const notificationService = { getNotifications: async () => [] };
`);

// Controllers
write('src/controllers/auth.controller.ts', `
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
export const register = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json(await authService.register(req.body)); } catch (e) { next(e); } };
export const login = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await authService.login(req.body)); } catch (e) { next(e); } };
export const logout = (req: Request, res: Response) => { res.json({ message: 'Logged out' }); };
export const getMe = (req: Request, res: Response) => { res.json({ user: req.user }); };
`);

write('src/controllers/user.controller.ts', `
import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
export const getUser = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await userService.getUserById(req.params.id)); } catch (e) { next(e); } };
`);

write('src/controllers/doctor.controller.ts', `
import { Request, Response, NextFunction } from 'express';
import { doctorService } from '../services/doctor.service';
export const getDoctors = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await doctorService.getAll()); } catch (e) { next(e); } };
`);

write('src/controllers/appointment.controller.ts', `
import { Request, Response, NextFunction } from 'express';
import { appointmentService } from '../services/appointment.service';
export const bookAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try { const { doctorId, date, startTime, endTime, symptoms, holdId } = req.body; res.status(201).json(await appointmentService.bookAppointment(req.user!.sub, doctorId, date, startTime, endTime, symptoms, holdId)); } catch (e) { next(e); }
};
export const cancelAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await appointmentService.cancelAppointment(req.params.id, req.user!.sub, req.body.reason)); } catch (e) { next(e); }
};
`);

write('src/controllers/availability.controller.ts', `
import { Request, Response, NextFunction } from 'express';
import { availabilityService } from '../services/availability.service';
import { slotHoldService } from '../services/slotHold.service';
export const getAvailability = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ slots: await availabilityService.generateSlots(req.query.doctorId as string, req.query.date as string) }); } catch (e) { next(e); } };
export const holdSlot = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await slotHoldService.createHold(req.user!.sub, req.body.doctorId, req.body.date, req.body.startTime, req.body.endTime)); } catch (e) { next(e); } };
`);

write('src/controllers/admin.controller.ts', `
import { Request, Response, NextFunction } from 'express';
export const dashboard = async (req: Request, res: Response, next: NextFunction) => { res.json({ stats: {} }); };
`);

write('src/controllers/ai.controller.ts', `
import { Request, Response, NextFunction } from 'express';
export const preVisit = async (req: Request, res: Response, next: NextFunction) => { res.json({ summary: '' }); };
`);

write('src/controllers/calendar.controller.ts', `
import { Request, Response, NextFunction } from 'express';
export const getAuthUrl = async (req: Request, res: Response, next: NextFunction) => { res.json({ url: '' }); };
`);

write('src/controllers/medication.controller.ts', `
import { Request, Response, NextFunction } from 'express';
export const addMedication = async (req: Request, res: Response, next: NextFunction) => { res.json({}); };
`);

write('src/controllers/notification.controller.ts', `
import { Request, Response, NextFunction } from 'express';
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => { res.json([]); };
`);

// Routes
write('src/routes/auth.routes.ts', `
import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller';
import { auth } from '../middleware/auth';
const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);
export default router;
`);

write('src/routes/user.routes.ts', `
import { Router } from 'express';
import { getUser } from '../controllers/user.controller';
import { auth } from '../middleware/auth';
const router = Router();
router.get('/:id', auth, getUser);
export default router;
`);

write('src/routes/doctor.routes.ts', `
import { Router } from 'express';
import { getDoctors } from '../controllers/doctor.controller';
const router = Router();
router.get('/', getDoctors);
export default router;
`);

write('src/routes/appointment.routes.ts', `
import { Router } from 'express';
import { bookAppointment, cancelAppointment } from '../controllers/appointment.controller';
import { auth } from '../middleware/auth';
const router = Router();
router.post('/', auth, bookAppointment);
router.post('/:id/cancel', auth, cancelAppointment);
export default router;
`);

write('src/routes/availability.routes.ts', `
import { Router } from 'express';
import { getAvailability, holdSlot } from '../controllers/availability.controller';
import { auth } from '../middleware/auth';
const router = Router();
router.get('/', getAvailability);
router.post('/hold', auth, holdSlot);
export default router;
`);

write('src/routes/admin.routes.ts', `
import { Router } from 'express';
import { dashboard } from '../controllers/admin.controller';
import { auth } from '../middleware/auth';
const router = Router();
router.get('/dashboard', auth, dashboard);
export default router;
`);

write('src/routes/ai.routes.ts', `
import { Router } from 'express';
import { preVisit } from '../controllers/ai.controller';
import { auth } from '../middleware/auth';
const router = Router();
router.post('/pre-visit/:id', auth, preVisit);
export default router;
`);

write('src/routes/calendar.routes.ts', `
import { Router } from 'express';
import { getAuthUrl } from '../controllers/calendar.controller';
import { auth } from '../middleware/auth';
const router = Router();
router.get('/auth-url', auth, getAuthUrl);
export default router;
`);

write('src/routes/medication.routes.ts', `
import { Router } from 'express';
import { addMedication } from '../controllers/medication.controller';
import { auth } from '../middleware/auth';
const router = Router();
router.post('/', auth, addMedication);
export default router;
`);

write('src/routes/notification.routes.ts', `
import { Router } from 'express';
import { getNotifications } from '../controllers/notification.controller';
import { auth } from '../middleware/auth';
const router = Router();
router.get('/', auth, getNotifications);
export default router;
`);

write('src/app.ts', `
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import appointmentRoutes from './routes/appointment.routes';
import availabilityRoutes from './routes/availability.routes';
import doctorRoutes from './routes/doctor.routes';
import adminRoutes from './routes/admin.routes';
import aiRoutes from './routes/ai.routes';
import calendarRoutes from './routes/calendar.routes';
import medicationRoutes from './routes/medication.routes';
import notificationRoutes from './routes/notification.routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORSORIGIN || '*' }));
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => { res.json({ status: 'ok' }); });
app.use(errorHandler);
`);
