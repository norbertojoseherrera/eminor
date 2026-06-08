import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VideoTokenService } from './video-token.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtUser } from '../../common/decorators/current-user.decorator';

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['WAITING', 'CANCELLED'],
  WAITING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoTokenService: VideoTokenService,
  ) {}

  async findByDoctorAndDate(doctorId: string, date: string) {
    // Append time without Z so Date parses as local time, not UTC
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);

    return this.prisma.appointment.findMany({
      where: { doctorId, scheduledAt: { gte: start, lte: end } },
      include: {
        patient: { select: { firstName: true, lastName: true, dni: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findForPatient(userId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { userId } });
    if (!patient) return [];

    return this.prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: { select: { licenseNumber: true, specialty: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async create(dto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes,
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { licenseNumber: true, specialty: true } },
      },
    });
  }

  async findById(id: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: { select: { email: true } } } },
      },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async updateStatus(id: string, newStatus: AppointmentStatus, user: JwtUser) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { userId: true } },
        doctor: { select: { userId: true } },
      },
    });
    if (!appt) throw new NotFoundException('Appointment not found');

    if (!VALID_TRANSITIONS[appt.status].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${appt.status} to ${newStatus}`,
      );
    }

    this.assertCanModify(appt, user);

    return this.prisma.appointment.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async getVideoToken(id: string, user: JwtUser) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { userId: true } },
        doctor: { select: { userId: true } },
      },
    });
    if (!appt) throw new NotFoundException('Appointment not found');

    if (
      appt.status !== 'PENDING' &&
      appt.status !== 'WAITING' &&
      appt.status !== 'ACTIVE'
    ) {
      throw new BadRequestException('Appointment is not active');
    }

    this.assertCanModify(appt, user);

    const token = this.videoTokenService.generateToken(appt.roomUuid, user);
    return { token, roomName: appt.roomUuid, domain: 'meet.jit.si' };
  }

  private assertCanModify(
    appt: { patient: { userId: string } | null; doctor: { userId: string } | null },
    user: JwtUser,
  ) {
    if (user.role === Role.ADMIN) return;

    const isPatient = appt.patient?.userId === user.id;
    const isDoctor = appt.doctor?.userId === user.id;

    if (!isPatient && !isDoctor) {
      throw new ForbiddenException('You do not have access to this appointment');
    }
  }
}
