import { Injectable, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createDoctor(dto: CreateDoctorDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: Role.DOCTOR,
        doctor: {
          create: {
            licenseNumber: dto.licenseNumber,
            specialty: dto.specialty,
            isVerified: true,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        doctor: { select: { id: true, licenseNumber: true, specialty: true } },
      },
    });
  }

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);
    return { users, total, page, limit };
  }

  async toggleUserActive(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  async getAuditLogs(page = 1, limit = 50, userId?: string) {
    const skip = (page - 1) * limit;
    const where = userId ? { userId } : {};

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page, limit };
  }

  async getStats() {
    const [totalUsers, totalDoctors, totalPatients, appointmentsByStatus] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.doctor.count(),
      this.prisma.patient.count(),
      this.prisma.appointment.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    return {
      totalUsers,
      totalDoctors,
      totalPatients,
      appointmentsByStatus: appointmentsByStatus.map((r) => ({
        status: r.status,
        count: r._count.status,
      })),
    };
  }
}
