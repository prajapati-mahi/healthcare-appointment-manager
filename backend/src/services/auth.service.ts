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