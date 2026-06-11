import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { JwtUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateCertificateDto, user: JwtUser) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { doctor: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.doctor.userId !== user.id) {
      throw new ForbiddenException('Only the treating doctor can issue a certificate');
    }

    if (appointment.status !== 'COMPLETED') {
      throw new BadRequestException('Appointment must be COMPLETED before issuing a certificate');
    }

    const issuedAt = new Date();
    const signingKey = this.config.get<string>('prescriptionSigningKey') ?? 'dev-signing-key';

    const signatureInput = JSON.stringify({
      appointmentId: dto.appointmentId,
      doctorId: appointment.doctorId,
      licenseNumber: appointment.doctor.licenseNumber,
      type: dto.type,
      content: dto.content,
      restDays: dto.restDays ?? null,
      issuedAt: issuedAt.toISOString(),
    });

    const digitalSignatureHash = createHmac('sha256', signingKey)
      .update(signatureInput)
      .digest('hex');

    return this.prisma.certificate.create({
      data: {
        appointmentId: dto.appointmentId,
        patientId: appointment.patientId,
        type: dto.type,
        content: dto.content,
        restDays: dto.restDays,
        digitalSignatureHash,
        issuedAt,
      },
    });
  }

  async findByAppointment(appointmentId: string, user: JwtUser) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true, patient: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const isDoctor = appointment.doctor.userId === user.id;
    const isPatient = appointment.patient.userId === user.id;
    if (!isDoctor && !isPatient) throw new ForbiddenException('Access denied');

    return this.prisma.certificate.findUnique({ where: { appointmentId } });
  }

  async findForPatient(patientId: string, user: JwtUser) {
    if (user.role === 'PATIENT') {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient || patient.id !== patientId) throw new ForbiddenException('Access denied');
    }

    return this.prisma.certificate.findMany({
      where: { patientId },
      include: {
        appointment: {
          include: { doctor: { select: { licenseNumber: true, specialty: true } } },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }
}
