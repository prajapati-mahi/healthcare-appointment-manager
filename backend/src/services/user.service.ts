import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export const userService = {
  async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true,
        phone: true, dateOfBirth: true, gender: true, address: true,
        isActive: true, createdAt: true,
        doctorProfile: {
          select: {
            id: true, specialization: true, qualifications: true, bio: true,
            experienceYears: true, slotDuration: true, consultationFee: true,
          },
        },
      },
    });
  },

  async updateProfile(userId: string, data: {
    name?: string; phone?: string; dateOfBirth?: string;
    gender?: string; address?: string;
  }) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        address: data.address,
      },
      select: {
        id: true, email: true, name: true, role: true,
        phone: true, dateOfBirth: true, gender: true, address: true,
      },
    });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

    logger.info(`Password changed for user ${userId}`);
    return { success: true };
  },

  async getAllUsers(role?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (role) where.role = role;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, role: true,
          isActive: true, createdAt: true, phone: true,
          doctorProfile: { select: { specialization: true } },
        },
      }),
    ]);

    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async toggleUserStatus(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
  },
};