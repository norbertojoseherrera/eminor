import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfService } from '../../common/pdf/pdf.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
  ) {}

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

  async getPatients(search?: string) {
    return this.prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { dni: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dni: true,
        user: { select: { email: true } },
      },
    });
  }

  async getPatientRecords(patientId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const doctorSelect = {
      select: { licenseNumber: true, specialty: true, firstName: true, lastName: true },
    };

    const [evolutions, prescriptions, certificates] = await Promise.all([
      this.prisma.evolution.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: { appointment: { include: { doctor: doctorSelect } } },
      }),
      this.prisma.prescription.findMany({
        where: { appointment: { patientId } },
        orderBy: { issuedAt: 'desc' },
        include: { appointment: { include: { doctor: doctorSelect } } },
      }),
      this.prisma.certificate.findMany({
        where: { patientId },
        orderBy: { issuedAt: 'desc' },
        include: { appointment: { include: { doctor: doctorSelect } } },
      }),
    ]);

    return { patient, evolutions, prescriptions, certificates };
  }

  async getEvolutionPdf(id: string) {
    const evolution = await this.prisma.evolution.findUnique({
      where: { id },
      include: { patient: true, appointment: { include: { doctor: true } } },
    });
    if (!evolution) throw new NotFoundException('Evolution not found');

    const buffer = await this.pdf.generateEvolutionPdf(
      evolution,
      evolution.patient,
      evolution.appointment.doctor,
    );
    return { buffer, filename: `evolucion-${evolution.id}.pdf` };
  }

  async getPrescriptionPdf(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: { appointment: { include: { doctor: true, patient: true } } },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');

    const buffer = await this.pdf.generatePrescriptionPdf(
      prescription,
      prescription.appointment.patient,
      prescription.appointment.doctor,
    );
    return { buffer, filename: `receta-${prescription.id}.pdf` };
  }

  async getCertificatePdf(id: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: { patient: true, appointment: { include: { doctor: true } } },
    });
    if (!certificate) throw new NotFoundException('Certificate not found');

    const buffer = await this.pdf.generateCertificatePdf(
      certificate,
      certificate.patient,
      certificate.appointment.doctor,
    );
    return { buffer, filename: `certificado-${certificate.id}.pdf` };
  }
}
