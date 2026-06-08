import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * E2E tests — require DATABASE_TEST_URL env var pointing to an isolated test DB.
 * Run with: DATABASE_URL=$DATABASE_TEST_URL npm run test:e2e
 */
describe('EMINOR API — E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let patientCookies: string[];
  let doctorCookies: string[];
  let adminCookies: string[];
  let patientId: string;
  let doctorId: string;
  let appointmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
  });

  afterAll(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
    await app.close();
  });

  // ─── AUTH ──────────────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('registra un paciente nuevo → 201 + cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'paciente@test.com',
          password: 'Password1!',
          firstName: 'Ana',
          lastName: 'López',
          dni: '12345678',
          birthDate: '1990-01-15',
          medicalInsurance: 'OSDE',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Registration successful');
      expect(res.headers['set-cookie']).toBeDefined();
      patientCookies = res.headers['set-cookie'] as string[];
    });

    it('email duplicado → 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'paciente@test.com',
          password: 'Password1!',
          firstName: 'Otro',
          lastName: 'Paciente',
          dni: '87654321',
          birthDate: '1985-03-20',
        });

      expect(res.status).toBe(409);
    });

    it('contraseña débil → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'nuevo@test.com', password: 'short', firstName: 'X', lastName: 'Y', dni: '11111111', birthDate: '2000-01-01' });
      expect(res.status).toBe(400);
    });

    it('DNI con letras → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'otro@test.com', password: 'Password1!', firstName: 'X', lastName: 'Y', dni: 'ABC12345', birthDate: '2000-01-01' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('credenciales válidas → 200 + cookie SameSite=None en prod', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'paciente@test.com', password: 'Password1!' });

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
      patientCookies = res.headers['set-cookie'] as string[];
    });

    it('contraseña incorrecta → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'paciente@test.com', password: 'WrongPass1!' });
      expect(res.status).toBe(401);
    });

    it('email inexistente → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nadie@test.com', password: 'Password1!' });
      expect(res.status).toBe(401);
    });

    it('respuesta no expone passwordHash', async () => {
      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', patientCookies);
      expect(me.body).not.toHaveProperty('passwordHash');
      expect(me.body).not.toHaveProperty('refreshToken');
      patientId = me.body.patient.id;
    });
  });

  describe('GET /api/auth/me', () => {
    it('sin autenticación → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ─── ADMIN SETUP ───────────────────────────────────────────────────────────

  describe('Admin', () => {
    beforeAll(async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('Admin1234!', 10);
      await prisma.user.create({ data: { email: 'admin@test.com', passwordHash: hash, role: 'ADMIN' } });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin1234!' });
      adminCookies = loginRes.headers['set-cookie'] as string[];
    });

    it('admin crea médico → 201 con rol DOCTOR', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/doctors')
        .set('Cookie', adminCookies)
        .send({ email: 'doctor@test.com', password: 'Doctor1234!', firstName: 'Carlos', lastName: 'García', licenseNumber: 'MN-001', specialty: 'Medicina General' });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('DOCTOR');
    });

    it('paciente intenta acceder a /admin/stats → 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/stats')
        .set('Cookie', patientCookies);
      expect(res.status).toBe(403);
    });

    it('admin no puede acceder a HCE (Ley 26.529 — bloqueo RBAC)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/patients/${patientId}/medical-record`)
        .set('Cookie', adminCookies);
      expect(res.status).toBe(403);
    });

    it('admin ve audit logs → 200 con array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/audit-logs')
        .set('Cookie', adminCookies);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });

    it('admin ve stats → 200 con conteos', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/stats')
        .set('Cookie', adminCookies);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalUsers');
      expect(res.body).toHaveProperty('totalDoctors');
    });
  });

  // ─── APPOINTMENTS ──────────────────────────────────────────────────────────

  describe('Appointments + estado', () => {
    beforeAll(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'doctor@test.com', password: 'Doctor1234!' });
      doctorCookies = loginRes.headers['set-cookie'] as string[];

      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', doctorCookies);
      doctorId = meRes.body.doctor.id;
    });

    it('admin crea turno → 201 con roomUuid y estado PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Cookie', adminCookies)
        .send({ patientId, doctorId, scheduledAt: new Date().toISOString(), notes: 'Consulta e2e' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.roomUuid).toBeDefined();
      appointmentId = res.body.id;
    });

    it('paciente ve su turno en /appointments/my', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/appointments/my')
        .set('Cookie', patientCookies);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('PENDING → COMPLETED es inválido → 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Cookie', patientCookies)
        .send({ status: 'COMPLETED' });
      expect(res.status).toBe(400);
    });

    it('PENDING → WAITING válido → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Cookie', patientCookies)
        .send({ status: 'WAITING' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('WAITING');
    });

    it('WAITING → ACTIVE válido → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Cookie', doctorCookies)
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(200);
    });

    it('médico obtiene video token → 200 con token y roomName', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/appointments/${appointmentId}/video-token`)
        .set('Cookie', doctorCookies);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('roomName');
      expect(res.body).toHaveProperty('domain');
    });
  });

  // ─── EVOLUCIONES / HCE ─────────────────────────────────────────────────────

  describe('Evolutions — SOAP + inmutabilidad', () => {
    let evolutionId: string;

    it('médico crea evolución SOAP válida → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/evolutions')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId,
          soapData: {
            subjective: 'Dolor de cabeza de 3 días de evolución.',
            objective: 'PA 120/80 mmHg. FC 72 lpm.',
            assessment: { text: 'Cefalea tensional', cie10Codes: ['G44.2'] },
            plan: 'Ibuprofeno 400mg c/8hs. Control en 7 días.',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.isSigned).toBe(false);
      evolutionId = res.body.id;
    });

    it('código CIE-10 inválido → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/evolutions')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId,
          soapData: {
            subjective: 'Texto largo suficiente.',
            objective: 'Texto ok.',
            assessment: { text: 'Diagnóstico', cie10Codes: ['ZZZZ999'] },
            plan: 'Plan.',
          },
        });
      expect(res.status).toBe(400);
    });

    it('paciente no puede crear evolución → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/evolutions')
        .set('Cookie', patientCookies)
        .send({ appointmentId, soapData: { subjective: 'X', objective: 'X', assessment: { text: 'X', cie10Codes: ['A09'] }, plan: 'X' } });
      expect(res.status).toBe(403);
    });

    it('médico firma evolución → isSigned:true + _signatureHash SHA-256', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/evolutions/${evolutionId}/sign`)
        .set('Cookie', doctorCookies);

      expect(res.status).toBe(200);
      expect(res.body.isSigned).toBe(true);
      const hash = (res.body.soapData as any)._signatureHash;
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('firmar segunda vez → 409', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/evolutions/${evolutionId}/sign`)
        .set('Cookie', doctorCookies);
      expect(res.status).toBe(409);
    });

    it('editar evolución firmada → 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/evolutions/${evolutionId}`)
        .set('Cookie', doctorCookies)
        .send({ soapData: { subjective: 'Cambiado' } });
      expect(res.status).toBe(403);
    });

    it('médico con turno accede a HCE → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/patients/${patientId}/medical-record`)
        .set('Cookie', doctorCookies);
      expect(res.status).toBe(200);
      expect(res.body.evolutions.length).toBeGreaterThan(0);
    });

    it('paciente accede a su HCE → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/patients/${patientId}/medical-record`)
        .set('Cookie', patientCookies);
      expect(res.status).toBe(200);
    });
  });

  // ─── HEALTH ────────────────────────────────────────────────────────────────

  describe('GET /api/health', () => {
    it('retorna status ok → 200', async () => {
      const res = await request(app.getHttpServer()).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.db).toBe('connected');
    });
  });
});
