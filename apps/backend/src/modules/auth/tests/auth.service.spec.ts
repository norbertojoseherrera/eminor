import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      'jwt.secret': 'test-secret',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.expiresIn': '15m',
      'jwt.refreshExpiresIn': '7d',
    };
    return values[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('registerPatient', () => {
    it('lanza ConflictException si el email ya existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });

      await expect(
        service.registerPatient({
          email: 'test@test.com',
          password: 'Password1!',
          firstName: 'Ana',
          lastName: 'López',
          dni: '12345678',
          birthDate: '1990-01-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('crea el usuario con bcrypt cost 12', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: 'new@test.com',
        role: 'PATIENT',
        passwordHash: 'hashed',
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.registerPatient({
        email: 'new@test.com',
        password: 'Password1!',
        firstName: 'Ana',
        lastName: 'López',
        dni: '12345678',
        birthDate: '1990-01-01',
      });

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      const hash = createCall.data.passwordHash;
      const isValidBcrypt = await bcrypt.compare('Password1!', hash);
      expect(isValidBcrypt).toBe(true);
    });

    it('retorna accessToken y refreshToken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: 'new@test.com',
        role: 'PATIENT',
        passwordHash: 'hashed',
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.registerPatient({
        email: 'new@test.com',
        password: 'Password1!',
        firstName: 'Ana',
        lastName: 'López',
        dni: '12345678',
        birthDate: '1990-01-01',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('login', () => {
    it('lanza UnauthorizedException con email inexistente', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nope@test.com', password: 'Password1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException con usuario inactivo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        isActive: false,
        passwordHash: await bcrypt.hash('Password1!', 10),
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'Password1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException con contraseña incorrecta', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        isActive: true,
        passwordHash: await bcrypt.hash('CorrectPass1!', 10),
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'WrongPass1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('retorna tokens con credenciales válidas', async () => {
      const hash = await bcrypt.hash('Password1!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@test.com',
        isActive: true,
        passwordHash: hash,
        role: 'PATIENT',
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.login({
        email: 'test@test.com',
        password: 'Password1!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('refresh', () => {
    it('lanza UnauthorizedException con token inválido', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('invalid'); });

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el refresh token no coincide con el guardado', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'uuid-1', email: 'test@test.com', role: 'PATIENT' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        isActive: true,
        refreshToken: await bcrypt.hash('different-token', 10),
        role: 'PATIENT',
        email: 'test@test.com',
      });

      await expect(service.refresh('my-refresh-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
