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
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

  describe('create — reserva de turno', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    it('paciente reserva para sí mismo, ignorando patientId del body', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.create.mockResolvedValue(makeAppointment());

      await service.create(
        { patientId: 'someone-elses-id', doctorId: 'doctor-1', scheduledAt: futureDate },
        patientUser,
      );

      expect(mockPrisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patientId: 'patient-1' }) }),
      );
    });

    it('admin debe enviar patientId', async () => {
      await expect(
        service.create({ doctorId: 'doctor-1', scheduledAt: futureDate }, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza fecha en el pasado', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'patient-1' });

      await expect(
        service.create(
          { patientId: 'patient-1', doctorId: 'doctor-1', scheduledAt: '2020-01-01T10:00:00Z' },
          patientUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza horario ya ocupado', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.appointment.findFirst.mockResolvedValue(makeAppointment());

      await expect(
        service.create(
          { patientId: 'patient-1', doctorId: 'doctor-1', scheduledAt: futureDate },
          patientUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('admin CRUD', () => {
    it('findAllAdmin pagina y filtra por status', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([makeAppointment()]);
      mockPrisma.appointment.count.mockResolvedValue(1);

      const result = await service.findAllAdmin({ status: AppointmentStatus.PENDING, page: 2, limit: 5 });

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: AppointmentStatus.PENDING }, skip: 5, take: 5 }),
      );
      expect(result.total).toBe(1);
    });

    it('update lanza NotFoundException si no existe', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.update('no-exist', { notes: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('update rechaza reprogramar a un horario ocupado', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(makeAppointment());
      mockPrisma.appointment.findFirst.mockResolvedValue(makeAppointment({ id: 'other-appt' }));

      await expect(
        service.update('appt-1', { scheduledAt: new Date(Date.now() + 86_400_000).toISOString() }),
      ).rejects.toThrow(BadRequestException);
    });

    it('remove elimina el turno', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(makeAppointment());
      mockPrisma.appointment.delete.mockResolvedValue(makeAppointment());

      await expect(service.remove('appt-1')).resolves.toEqual({ id: 'appt-1' });
      expect(mockPrisma.appointment.delete).toHaveBeenCalledWith({ where: { id: 'appt-1' } });
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
