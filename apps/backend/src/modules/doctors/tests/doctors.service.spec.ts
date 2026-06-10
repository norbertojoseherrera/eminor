import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DoctorsService } from '../doctors.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

const mockPrisma = {
  doctor: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  doctorAvailability: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  appointment: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('DoctorsService', () => {
  let service: DoctorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DoctorsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));
  });

  describe('getAvailableSlots', () => {
    it('lanza NotFoundException si el médico no existe', async () => {
      mockPrisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.getAvailableSlots('doctor-1', '2026-06-15')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve [] si no hay reglas para ese día', async () => {
      mockPrisma.doctor.findUnique.mockResolvedValue({ id: 'doctor-1' });
      mockPrisma.doctorAvailability.findMany.mockResolvedValue([]);

      const slots = await service.getAvailableSlots('doctor-1', '2026-06-15');
      expect(slots).toEqual([]);
    });

    it('genera slots de 15 minutos excluyendo turnos ya tomados', async () => {
      mockPrisma.doctor.findUnique.mockResolvedValue({ id: 'doctor-1' });
      // 2026-06-15 es lunes (dayOfWeek 1)
      mockPrisma.doctorAvailability.findMany.mockResolvedValue([
        { id: 'rule-1', doctorId: 'doctor-1', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', slotMinutes: 15 },
      ]);
      // El primer slot (09:00) ya está ocupado
      mockPrisma.appointment.findMany.mockResolvedValue([
        { scheduledAt: new Date('2026-06-15T09:00:00') },
      ]);

      const slots = await service.getAvailableSlots('doctor-1', '2026-06-15');

      // 09:00-10:00 cada 15min = 4 slots, menos el ocupado = 3
      expect(slots).toHaveLength(3);
      expect(slots).not.toContain(new Date('2026-06-15T09:00:00').toISOString());
      expect(slots).toContain(new Date('2026-06-15T09:15:00').toISOString());
      expect(slots).toContain(new Date('2026-06-15T09:45:00').toISOString());
    });
  });

  describe('setOwnAvailability', () => {
    it('lanza NotFoundException si el usuario no es médico', async () => {
      mockPrisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.setOwnAvailability('user-1', { schedule: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('reemplaza la disponibilidad existente', async () => {
      mockPrisma.doctor.findUnique.mockResolvedValue({ id: 'doctor-1' });
      mockPrisma.doctorAvailability.findMany.mockResolvedValue([]);

      await service.setOwnAvailability('user-1', {
        schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotMinutes: 15 }],
      });

      expect(mockPrisma.doctorAvailability.deleteMany).toHaveBeenCalledWith({
        where: { doctorId: 'doctor-1' },
      });
      expect(mockPrisma.doctorAvailability.createMany).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('filtra por especialidad', async () => {
      mockPrisma.doctor.findMany.mockResolvedValue([]);

      await service.findAll('Cardiología');

      expect(mockPrisma.doctor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ specialty: { equals: 'Cardiología', mode: 'insensitive' } }),
        }),
      );
    });
  });
});
