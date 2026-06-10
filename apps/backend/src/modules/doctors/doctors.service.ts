import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(specialty?: string) {
    return this.prisma.doctor.findMany({
      where: {
        isVerified: true,
        ...(specialty ? { specialty: { equals: specialty, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialty: true,
        licenseNumber: true,
      },
      orderBy: [{ specialty: 'asc' }, { lastName: 'asc' }],
    });
  }

  async getOwnAvailability(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    return this.prisma.doctorAvailability.findMany({
      where: { doctorId: doctor.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async setOwnAvailability(userId: string, dto: SetAvailabilityDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({ where: { doctorId: doctor.id } });
      if (dto.schedule.length === 0) return [];

      await tx.doctorAvailability.createMany({
        data: dto.schedule.map((slot) => ({
          doctorId: doctor.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slotMinutes: slot.slotMinutes,
        })),
      });

      return tx.doctorAvailability.findMany({
        where: { doctorId: doctor.id },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });
  }

  async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    // Argentina no usa horario de verano: offset fijo -03:00, independiente de la TZ del servidor
    const ARG_TZ_OFFSET = '-03:00';

    const dayStart = new Date(`${date}T00:00:00${ARG_TZ_OFFSET}`);
    const dayEnd = new Date(`${date}T23:59:59.999${ARG_TZ_OFFSET}`);
    const dayOfWeek = dayStart.getUTCDay();

    const rules = await this.prisma.doctorAvailability.findMany({
      where: { doctorId, dayOfWeek },
    });
    if (rules.length === 0) return [];

    const existing = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        status: { not: AppointmentStatus.CANCELLED },
        scheduledAt: { gte: dayStart, lte: dayEnd },
      },
      select: { scheduledAt: true },
    });
    const taken = new Set(existing.map((a) => a.scheduledAt.getTime()));

    const now = new Date();
    const slots: string[] = [];

    for (const rule of rules) {
      let cursor = new Date(`${date}T${rule.startTime}:00${ARG_TZ_OFFSET}`);
      const end = new Date(`${date}T${rule.endTime}:00${ARG_TZ_OFFSET}`);

      while (cursor < end) {
        if (cursor > now && !taken.has(cursor.getTime())) {
          slots.push(cursor.toISOString());
        }
        cursor = new Date(cursor.getTime() + rule.slotMinutes * 60_000);
      }
    }

    return slots.sort();
  }
}
