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
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtUser } from '../../common/decorators/current-user.decorator';

const VIDEO_ROOM_AVAILABILITY_MINUTES = 15;

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

  async findPatientsForDoctor(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) return [];

    const appointments = await this.prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dni: true, phone: true, medicalInsurance: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    const patients = new Map<string, { id: string; firstName: string; lastName: string; dni: string; phone: string; medicalInsurance: string | null; lastAppointment: Date; appointmentsCount: number }>();
    for (const appt of appointments) {
      const existing = patients.get(appt.patient.id);
      if (existing) {
        existing.appointmentsCount += 1;
      } else {
        patients.set(appt.patient.id, {
          ...appt.patient,
          lastAppointment: appt.scheduledAt,
          appointmentsCount: 1,
        });
      }
    }

    return [...patients.values()].sort((a, b) => a.lastName.localeCompare(b.lastName, 'es'));
  }

  async create(dto: CreateAppointmentDto, user: JwtUser) {
    let patientId = dto.patientId;

    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient) throw new NotFoundException('Patient profile not found');
      patientId = patient.id;
    }

    if (!patientId) {
      throw new BadRequestException('patientId is required');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('La fecha del turno debe ser futura');
    }

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        scheduledAt,
        status: { not: AppointmentStatus.CANCELLED },
      },
    });
    if (conflict) {
      throw new BadRequestException('El horario seleccionado ya no está disponible');
    }

    return this.prisma.appointment.create({
      data: {
        patientId,
        doctorId: dto.doctorId,
        scheduledAt,
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

    if (appt.status !== AppointmentStatus.ACTIVE) {
      const minutesUntil = (appt.scheduledAt.getTime() - Date.now()) / 60_000;
      if (minutesUntil > VIDEO_ROOM_AVAILABILITY_MINUTES) {
        throw new BadRequestException(
          `La sala de videoconsulta estará disponible ${VIDEO_ROOM_AVAILABILITY_MINUTES} minutos antes del turno (faltan ${Math.ceil(minutesUntil - VIDEO_ROOM_AVAILABILITY_MINUTES)} minutos)`,
        );
      }
    }

    const token = this.videoTokenService.generateToken(appt.roomUuid, user);
    return { token, roomName: appt.roomUuid, domain: 'meet.jit.si' };
  }

  async findAllAdmin(filters: {
    page?: number;
    limit?: number;
    status?: AppointmentStatus;
    doctorId?: string;
    patientId?: string;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
      ...(filters.patientId ? { patientId: filters.patientId } : {}),
    };

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          patient: { select: { firstName: true, lastName: true, dni: true } },
          doctor: { select: { firstName: true, lastName: true, licenseNumber: true, specialty: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { appointments, total, page, limit };
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Appointment not found');

    if (dto.scheduledAt) {
      const scheduledAt = new Date(dto.scheduledAt);
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          id: { not: id },
          doctorId: dto.doctorId ?? appt.doctorId,
          scheduledAt,
          status: { not: AppointmentStatus.CANCELLED },
        },
      });
      if (conflict) {
        throw new BadRequestException('El horario seleccionado ya no está disponible');
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.patientId ? { patientId: dto.patientId } : {}),
        ...(dto.doctorId ? { doctorId: dto.doctorId } : {}),
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true, dni: true } },
        doctor: { select: { firstName: true, lastName: true, licenseNumber: true, specialty: true } },
      },
    });
  }

  async remove(id: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Appointment not found');

    await this.prisma.appointment.delete({ where: { id } });
    return { id };
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
