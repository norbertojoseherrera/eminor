import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EvolutionsService } from '../evolutions.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

const mockPrisma = {
  evolution: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  appointment: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
  },
};

const doctorUser = { id: 'user-doctor-1', email: 'doc@test.com', role: 'DOCTOR' };
const patientUser = { id: 'user-patient-1', email: 'pat@test.com', role: 'PATIENT' };
const otherDoctorUser = { id: 'user-doctor-2', email: 'other@test.com', role: 'DOCTOR' };

const makeEvolution = (overrides = {}) => ({
  id: 'evo-1',
  appointmentId: 'appt-1',
  patientId: 'patient-1',
  soapData: {
    subjective: 'Dolor de cabeza intenso',
    objective: 'PA 120/80, FC 72',
    assessment: { text: 'Migraña', cie10Codes: ['G43.9'] },
    plan: 'Ibuprofeno 400mg c/8hs',
  },
  isSigned: false,
  signedAt: null,
  createdAt: new Date('2026-06-08T15:00:00Z'),
  updatedAt: new Date(),
  appointment: {
    doctorId: 'doctor-1',
    patientId: 'patient-1',
    doctor: { userId: 'user-doctor-1' },
  },
  ...overrides,
});

describe('EvolutionsService', () => {
  let service: EvolutionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvolutionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EvolutionsService>(EvolutionsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('lanza NotFoundException si el turno no existe', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { appointmentId: 'bad-id', soapData: {} as any },
          doctorUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el médico no es el tratante', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        patientId: 'patient-1',
        status: 'ACTIVE',
        doctor: { userId: 'user-doctor-1' },
      });

      await expect(
        service.create(
          { appointmentId: 'appt-1', soapData: {} as any },
          otherDoctorUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('crea la evolución con el médico correcto', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        patientId: 'patient-1',
        status: 'ACTIVE',
        doctor: { userId: 'user-doctor-1' },
      });
      mockPrisma.evolution.create.mockResolvedValue(makeEvolution());

      const result = await service.create(
        {
          appointmentId: 'appt-1',
          soapData: {
            subjective: 'Test',
            objective: 'Test',
            assessment: { text: 'Test', cie10Codes: ['A09'] },
            plan: 'Test',
          },
        },
        doctorUser,
      );

      expect(result).toHaveProperty('id', 'evo-1');
    });
  });

  describe('sign — inmutabilidad', () => {
    it('lanza ConflictException si la evolución ya está firmada', async () => {
      mockPrisma.evolution.findUnique.mockResolvedValue(
        makeEvolution({ isSigned: true }),
      );

      await expect(service.sign('evo-1', doctorUser)).rejects.toThrow(ConflictException);
    });

    it('lanza ForbiddenException si otro médico intenta firmar', async () => {
      mockPrisma.evolution.findUnique.mockResolvedValue(makeEvolution());

      await expect(service.sign('evo-1', otherDoctorUser)).rejects.toThrow(ForbiddenException);
    });

    it('firma y genera hash SHA-256 embebido en soapData', async () => {
      mockPrisma.evolution.findUnique.mockResolvedValue(makeEvolution());
      mockPrisma.evolution.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...makeEvolution(), ...data, isSigned: true }),
      );

      const result = await service.sign('evo-1', doctorUser);

      expect(result.isSigned).toBe(true);
      const soap = result.soapData as Record<string, unknown>;
      expect(soap).toHaveProperty('_signatureHash');
      expect(typeof soap._signatureHash).toBe('string');
      expect((soap._signatureHash as string).length).toBe(64); // SHA-256 hex
    });
  });

  describe('update — bloqueo post-firma', () => {
    it('lanza ForbiddenException al intentar editar una evolución firmada', async () => {
      mockPrisma.evolution.findUnique.mockResolvedValue(
        makeEvolution({ isSigned: true }),
      );

      await expect(
        service.update('evo-1', { subjective: 'Cambiado' }, doctorUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite editar una evolución no firmada', async () => {
      mockPrisma.evolution.findUnique.mockResolvedValue(makeEvolution());
      mockPrisma.evolution.update.mockResolvedValue(makeEvolution());

      await expect(
        service.update('evo-1', { subjective: 'Actualizado' }, doctorUser),
      ).resolves.not.toThrow();
    });
  });

  describe('getMedicalRecord — gate relacional (Ley 26.529)', () => {
    it('médico sin turno con el paciente → ForbiddenException', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.getMedicalRecord('patient-1', doctorUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('médico con turno previo → puede acceder', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'appt-1' });
      mockPrisma.patient = {
        ...mockPrisma.patient,
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'patient-1',
          evolutions: [],
          studies: [],
          appointments: [],
        }),
      } as any;
      (mockPrisma as any).patient.findUniqueOrThrow = jest
        .fn()
        .mockResolvedValue({ id: 'patient-1', evolutions: [], studies: [], appointments: [] });

      // Access via the prisma findUniqueOrThrow call
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'patient-1' });

      await expect(
        service.getMedicalRecord('patient-1', doctorUser),
      ).resolves.not.toThrow();
    });

    it('paciente accede a su propio registro', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-1',
        userId: 'user-patient-1',
      });
      (mockPrisma as any).patient.findUniqueOrThrow = jest
        .fn()
        .mockResolvedValue({ id: 'patient-1', evolutions: [], studies: [], appointments: [] });

      await expect(
        service.getMedicalRecord('patient-1', patientUser),
      ).resolves.not.toThrow();
    });

    it('paciente no puede acceder al registro de otro paciente', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-2',
        userId: 'user-patient-1',
      });

      await expect(
        service.getMedicalRecord('patient-otro', patientUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
