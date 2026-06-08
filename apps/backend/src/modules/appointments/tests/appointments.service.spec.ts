import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from '../appointments.service';
import { VideoTokenService } from '../video-token.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

const mockPrisma = {
  appointment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
  },
};

const mockVideoToken = {
  generateToken: jest.fn().mockReturnValue('jitsi-jwt'),
};

const makeAppointment = (overrides = {}) => ({
  id: 'appt-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  scheduledAt: new Date('2026-06-08T18:00:00Z'),
  status: AppointmentStatus.PENDING,
  roomUuid: 'room-uuid-1',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: { userId: 'user-patient-1' },
  doctor: { userId: 'user-doctor-1' },
  ...overrides,
});

describe('AppointmentsService — máquina de estados', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: VideoTokenService, useValue: mockVideoToken },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();
  });

  const adminUser = { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' };
  const doctorUser = { id: 'user-doctor-1', email: 'doc@test.com', role: 'DOCTOR' };
  const patientUser = { id: 'user-patient-1', email: 'pat@test.com', role: 'PATIENT' };
  const otherUser = { id: 'other-1', email: 'other@test.com', role: 'PATIENT' };

  describe('transiciones válidas', () => {
    const validCases: [AppointmentStatus, AppointmentStatus][] = [
      [AppointmentStatus.PENDING, AppointmentStatus.WAITING],
      [AppointmentStatus.PENDING, AppointmentStatus.CANCELLED],
      [AppointmentStatus.WAITING, AppointmentStatus.ACTIVE],
      [AppointmentStatus.WAITING, AppointmentStatus.CANCELLED],
      [AppointmentStatus.ACTIVE, AppointmentStatus.COMPLETED],
      [AppointmentStatus.ACTIVE, AppointmentStatus.CANCELLED],
    ];

    test.each(validCases)('%s → %s permitido', async (from, to) => {
      mockPrisma.appointment.findUnique.mockResolvedValue(makeAppointment({ status: from }));
      mockPrisma.appointment.update.mockResolvedValue(makeAppointment({ status: to }));

      await expect(service.updateStatus('appt-1', to, adminUser)).resolves.not.toThrow();
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: to } }),
      );
    });
  });

  describe('transiciones inválidas', () => {
    const invalidCases: [AppointmentStatus, AppointmentStatus][] = [
      [AppointmentStatus.COMPLETED, AppointmentStatus.ACTIVE],
      [AppointmentStatus.COMPLETED, AppointmentStatus.PENDING],
      [AppointmentStatus.CANCELLED, AppointmentStatus.ACTIVE],
      [AppointmentStatus.ACTIVE, AppointmentStatus.PENDING],
      [AppointmentStatus.WAITING, AppointmentStatus.COMPLETED],
    ];

    test.each(invalidCases)('%s → %s debe lanzar BadRequestException', async (from, to) => {
      mockPrisma.appointment.findUnique.mockResolvedValue(makeAppointment({ status: from }));

      await expect(service.updateStatus('appt-1', to, adminUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('control de acceso', () => {
    it('admin puede modificar cualquier turno', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(
        makeAppointment({ status: AppointmentStatus.PENDING }),
      );
      mockPrisma.appointment.update.mockResolvedValue(makeAppointment());

      await expect(
        service.updateStatus('appt-1', AppointmentStatus.WAITING, adminUser),
      ).resolves.not.toThrow();
    });

    it('médico propietario puede modificar su turno', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(
        makeAppointment({ status: AppointmentStatus.WAITING }),
      );
      mockPrisma.appointment.update.mockResolvedValue(makeAppointment());

      await expect(
        service.updateStatus('appt-1', AppointmentStatus.ACTIVE, doctorUser),
      ).resolves.not.toThrow();
    });

    it('paciente propietario puede pasar a WAITING', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(
        makeAppointment({ status: AppointmentStatus.PENDING }),
      );
      mockPrisma.appointment.update.mockResolvedValue(makeAppointment());

      await expect(
        service.updateStatus('appt-1', AppointmentStatus.WAITING, patientUser),
      ).resolves.not.toThrow();
    });

    it('usuario ajeno lanza ForbiddenException', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(
        makeAppointment({ status: AppointmentStatus.PENDING }),
      );

      await expect(
        service.updateStatus('appt-1', AppointmentStatus.WAITING, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getVideoToken', () => {
    it('bloquea token para turno COMPLETED', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(
        makeAppointment({ status: AppointmentStatus.COMPLETED }),
      );

      await expect(service.getVideoToken('appt-1', doctorUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('permite token para turno ACTIVE', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(
        makeAppointment({ status: AppointmentStatus.ACTIVE }),
      );

      const result = await service.getVideoToken('appt-1', doctorUser);
      expect(result).toHaveProperty('token', 'jitsi-jwt');
      expect(result).toHaveProperty('roomName', 'room-uuid-1');
    });

    it('lanza NotFoundException para turno inexistente', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.getVideoToken('no-exist', doctorUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByDoctorAndDate — timezone', () => {
    it('incluye turnos a las 18:00 UTC cuando se busca 2026-06-08 en Argentina (UTC-3)', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([makeAppointment()]);

      await service.findByDoctorAndDate('doctor-1', '2026-06-08');

      const call = mockPrisma.appointment.findMany.mock.calls[0][0];
      const start: Date = call.where.scheduledAt.gte;
      const end: Date = call.where.scheduledAt.lte;
      const apptTime = new Date('2026-06-08T18:00:00Z');

      expect(apptTime >= start && apptTime <= end).toBe(true);
    });
  });
});
