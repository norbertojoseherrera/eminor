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

    // Append local time (no Z) so dayOfWeek and slot times match Argentina local time
    const day = new Date(`${date}T00:00:00`);
    const dayOfWeek = day.getDay();

    const rules = await this.prisma.doctorAvailability.findMany({
      where: { doctorId, dayOfWeek },
    });
    if (rules.length === 0) return [];

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);

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
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);

      let cursor = new Date(`${date}T00:00:00`);
      cursor.setHours(startH, startM, 0, 0);
      const end = new Date(`${date}T00:00:00`);
      end.setHours(endH, endM, 0, 0);

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
