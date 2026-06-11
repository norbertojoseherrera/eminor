import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CertificatesService } from '../certificates.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CertificateType } from '@prisma/client';

const mockPrisma = {
  certificate: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  appointment: {
    findUnique: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn().mockReturnValue('test-signing-key'),
};

const doctorUser = { id: 'user-doctor-1', email: 'doc@test.com', role: 'DOCTOR' };
const otherDoctorUser = { id: 'user-doctor-2', email: 'other@test.com', role: 'DOCTOR' };
const patientUser = { id: 'user-patient-1', email: 'pat@test.com', role: 'PATIENT' };

const makeAppointment = (overrides = {}) => ({
  id: 'appt-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  status: 'COMPLETED',
  doctor: { userId: 'user-doctor-1', licenseNumber: 'MN-1000' },
  patient: { userId: 'user-patient-1' },
  ...overrides,
});

describe('CertificatesService', () => {
  let service: CertificatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
    jest.clearAllMocks();
    mockConfig.get.mockReturnValue('test-signing-key');
  });

  describe('create', () => {
    const dto = { appointmentId: 'appt-1', type: CertificateType.REST, content: 'Reposo por 48hs', restDays: 2 };

    it('crea el certificado para el médico tratante con turno COMPLETED', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(makeAppointment());
      mockPrisma.certificate.create.mockResolvedValue({ id: 'cert-1', ...dto });

      const result = await service.create(dto, doctorUser);

      expect(result).toHaveProperty('id', 'cert-1');
      expect(mockPrisma.certificate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            appointmentId: 'appt-1',
            patientId: 'patient-1',
            type: CertificateType.REST,
            content: 'Reposo por 48hs',
            restDays: 2,
          }),
        }),
      );
    });

    it('lanza NotFoundException si el turno no existe', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, doctorUser)).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si no es el médico tratante', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(makeAppointment());

      await expect(service.create(dto, otherDoctorUser)).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si el turno no está COMPLETED', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(makeAppointment({ status: 'ACTIVE' }));

      await expect(service.create(dto, doctorUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByAppointment', () => {
    it('permite acceso al médico tratante', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(makeAppointment());
      mockPrisma.certificate.findUnique.mockResolvedValue({ id: 'cert-1' });

      const result = await service.findByAppointment('appt-1', doctorUser);
      expect(result).toEqual({ id: 'cert-1' });
    });

    it('permite acceso al paciente del turno', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(makeAppointment());
      mockPrisma.certificate.findUnique.mockResolvedValue({ id: 'cert-1' });

      const result = await service.findByAppointment('appt-1', patientUser);
      expect(result).toEqual({ id: 'cert-1' });
    });

    it('lanza ForbiddenException para terceros', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(makeAppointment());

      await expect(service.findByAppointment('appt-1', otherDoctorUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findForPatient', () => {
    it('lanza ForbiddenException si el paciente consulta certificados de otro paciente', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'patient-2' });

      await expect(service.findForPatient('patient-1', patientUser)).rejects.toThrow(ForbiddenException);
    });

    it('devuelve los certificados del paciente', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.certificate.findMany.mockResolvedValue([{ id: 'cert-1' }]);

      const result = await service.findForPatient('patient-1', patientUser);
      expect(result).toEqual([{ id: 'cert-1' }]);
    });
  });
});
