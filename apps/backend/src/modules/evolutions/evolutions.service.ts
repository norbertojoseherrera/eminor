import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEvolutionDto } from './dto/create-evolution.dto';
import { JwtUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class EvolutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEvolutionDto, user: JwtUser) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { doctor: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.doctor.userId !== user.id) {
      throw new ForbiddenException('Only the treating doctor can create an evolution');
    }

    if (appointment.status !== 'ACTIVE' && appointment.status !== 'COMPLETED') {
      throw new ForbiddenException('Appointment must be in ACTIVE or COMPLETED status');
    }

    return this.prisma.evolution.create({
      data: {
        appointmentId: dto.appointmentId,
        patientId: appointment.patientId,
        soapData: dto.soapData as object,
      },
    });
  }

  async sign(id: string, user: JwtUser) {
    const evolution = await this.prisma.evolution.findUnique({
      where: { id },
      include: { appointment: { include: { doctor: true } } },
    });
    if (!evolution) throw new NotFoundException('Evolution not found');

    if (evolution.isSigned) {
      throw new ConflictException('Evolution is already signed and immutable');
    }

    if (evolution.appointment.doctor.userId !== user.id) {
      throw new ForbiddenException('Only the treating doctor can sign this evolution');
    }

    const signatureHash = createHash('sha256')
      .update(JSON.stringify(evolution.soapData))
      .update(evolution.id)
      .update(evolution.createdAt.toISOString())
      .digest('hex');

    const signedData = {
      ...(evolution.soapData as object),
      _signatureHash: signatureHash,
      _signedBy: user.id,
    };

    return this.prisma.evolution.update({
      where: { id },
      data: {
        isSigned: true,
        signedAt: new Date(),
        soapData: signedData,
      },
    });
  }

  async update(id: string, soapData: object, user: JwtUser) {
    const evolution = await this.prisma.evolution.findUnique({
      where: { id },
      include: { appointment: { include: { doctor: true } } },
    });
    if (!evolution) throw new NotFoundException('Evolution not found');

    if (evolution.isSigned) {
      throw new ForbiddenException('Cannot modify a signed evolution. Create a supplementary note instead.');
    }

    if (evolution.appointment.doctor.userId !== user.id) {
      throw new ForbiddenException('Only the treating doctor can update this evolution');
    }

    return this.prisma.evolution.update({
      where: { id },
      data: { soapData: soapData as object },
    });
  }

  async getMedicalRecord(patientId: string, user: JwtUser) {
    if (user.role === Role.DOCTOR) {
      const hasRelation = await this.prisma.appointment.findFirst({
        where: {
          patientId,
          doctor: { userId: user.id },
        },
      });
      if (!hasRelation) {
        throw new ForbiddenException('No appointment relationship with this patient');
      }
    }

    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: user.id },
      });
      if (!patient || patient.id !== patientId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.prisma.patient.findUniqueOrThrow({
      where: { id: patientId },
      include: {
        evolutions: {
          orderBy: { createdAt: 'desc' },
          include: {
            appointment: {
              include: {
                doctor: { select: { licenseNumber: true, specialty: true } },
              },
            },
          },
        },
        studies: { orderBy: { uploadedAt: 'desc' } },
        appointments: {
          where: { status: 'COMPLETED' },
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });
  }
}
