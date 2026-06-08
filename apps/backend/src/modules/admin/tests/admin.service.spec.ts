import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AdminService } from '../admin.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  doctor: { count: jest.fn() },
  patient: { count: jest.fn() },
  appointment: { groupBy: jest.fn() },
  auditLog: { findMany: jest.fn(), count: jest.fn() },
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('createDoctor', () => {
    it('lanza ConflictException si el email ya existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(
        service.createDoctor({
          email: 'existing@test.com',
          password: 'Pass1234!',
          firstName: 'Carlos',
          lastName: 'García',
          licenseNumber: 'MN-001',
          specialty: 'Cardiología',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('crea médico con rol DOCTOR', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-doc',
        email: 'doctor@test.com',
        role: 'DOCTOR',
        createdAt: new Date(),
        doctor: { id: 'doctor-1' },
      });

      const result = await service.createDoctor({
        email: 'doctor@test.com',
        password: 'Pass1234!',
        firstName: 'Carlos',
        lastName: 'García',
        licenseNumber: 'MN-001',
        specialty: 'Cardiología',
      });

      expect(mockPrisma.user.create.mock.calls[0][0].data.role).toBe('DOCTOR');
      expect(result).toHaveProperty('email', 'doctor@test.com');
    });
  });

  describe('toggleUserActive', () => {
    it('desactiva un usuario activo', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: '1', isActive: true });
      mockPrisma.user.update.mockResolvedValue({ id: '1', isActive: false });

      const result = await service.toggleUserActive('1');
      expect(mockPrisma.user.update.mock.calls[0][0].data.isActive).toBe(false);
      expect(result.isActive).toBe(false);
    });

    it('reactiva un usuario inactivo', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: '1', isActive: false });
      mockPrisma.user.update.mockResolvedValue({ id: '1', isActive: true });

      const result = await service.toggleUserActive('1');
      expect(mockPrisma.user.update.mock.calls[0][0].data.isActive).toBe(true);
      expect(result.isActive).toBe(true);
    });
  });

  describe('getStats', () => {
    it('retorna conteos de usuarios, médicos y pacientes', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.doctor.count.mockResolvedValue(3);
      mockPrisma.patient.count.mockResolvedValue(7);
      mockPrisma.appointment.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: { status: 5 } },
        { status: 'PENDING', _count: { status: 2 } },
      ]);

      const stats = await service.getStats();

      expect(stats.totalUsers).toBe(10);
      expect(stats.totalDoctors).toBe(3);
      expect(stats.totalPatients).toBe(7);
      expect(stats.appointmentsByStatus).toHaveLength(2);
    });
  });

  describe('aislamiento de datos clínicos', () => {
    it('AdminService no tiene acceso a Evolutions ni Studies', () => {
      // Verificación estructural: AdminService solo inyecta PrismaService
      // y sus métodos no exponen endpoints clínicos.
      // El aislamiento real se garantiza por el módulo DI de NestJS.
      expect(typeof service.getStats).toBe('function');
      expect(typeof service.getAuditLogs).toBe('function');
      // No debe existir método para acceder a evoluciones o estudios
      expect((service as any).getEvolutions).toBeUndefined();
      expect((service as any).getStudies).toBeUndefined();
    });
  });
});
