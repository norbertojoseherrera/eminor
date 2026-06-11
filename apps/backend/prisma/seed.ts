import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

// Próxima fecha (a partir de mañana) que cae en dayOfWeek (0=Domingo..6=Sábado), a la hora indicada (HH:mm, AR UTC-3)
function nextDateForDayAndTime(dayOfWeek: number, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  while (date.getUTCDay() !== dayOfWeek) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  date.setUTCHours(hours + 3, minutes, 0, 0); // AR es UTC-3
  return date;
}

async function main() {
  console.log('Seeding database...');

  const adminHash = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@eminor.com' },
    update: {},
    create: {
      email: 'admin@eminor.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });
  console.log('Admin created:', admin.email);

  const doctorHash = await bcrypt.hash('Doctor1234!', 12);
  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@eminor.com' },
    update: {},
    create: {
      email: 'doctor@eminor.com',
      passwordHash: doctorHash,
      role: Role.DOCTOR,
      doctor: {
        create: {
          licenseNumber: 'MN-12345',
          specialty: 'Medicina General',
          isVerified: true,
          firstName: 'Carlos',
          lastName: 'García',
        },
      },
    },
  });
  console.log('Doctor created:', doctor.email);

  // Médicos adicionales con distintas especialidades y disponibilidad horaria
  // dayOfWeek: 0=Domingo .. 6=Sábado
  const extraDoctors = [
    {
      email: 'cardiologia@eminor.com',
      licenseNumber: 'MN-20001',
      specialty: 'Cardiología',
      firstName: 'Laura',
      lastName: 'Fernández',
      availability: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotMinutes: 30 },
        { dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotMinutes: 30 },
        { dayOfWeek: 5, startTime: '09:00', endTime: '12:00', slotMinutes: 30 },
      ],
    },
    {
      email: 'pediatria@eminor.com',
      licenseNumber: 'MN-20002',
      specialty: 'Pediatría',
      firstName: 'Martín',
      lastName: 'Pérez',
      availability: [
        { dayOfWeek: 2, startTime: '14:00', endTime: '18:00', slotMinutes: 20 },
        { dayOfWeek: 4, startTime: '14:00', endTime: '18:00', slotMinutes: 20 },
      ],
    },
    {
      email: 'dermatologia@eminor.com',
      licenseNumber: 'MN-20003',
      specialty: 'Dermatología',
      firstName: 'Sofía',
      lastName: 'Gómez',
      availability: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '12:00', slotMinutes: 15 },
        { dayOfWeek: 2, startTime: '10:00', endTime: '12:00', slotMinutes: 15 },
        { dayOfWeek: 3, startTime: '10:00', endTime: '12:00', slotMinutes: 15 },
        { dayOfWeek: 4, startTime: '10:00', endTime: '12:00', slotMinutes: 15 },
        { dayOfWeek: 5, startTime: '10:00', endTime: '12:00', slotMinutes: 15 },
      ],
    },
    {
      email: 'ginecologia@eminor.com',
      licenseNumber: 'MN-20004',
      specialty: 'Ginecología',
      firstName: 'Diego',
      lastName: 'Torres',
      availability: [
        { dayOfWeek: 1, startTime: '15:00', endTime: '19:00', slotMinutes: 30 },
        { dayOfWeek: 3, startTime: '15:00', endTime: '19:00', slotMinutes: 30 },
      ],
    },
    {
      email: 'traumatologia@eminor.com',
      licenseNumber: 'MN-20005',
      specialty: 'Traumatología',
      firstName: 'Valeria',
      lastName: 'Ruiz',
      availability: [
        { dayOfWeek: 2, startTime: '08:00', endTime: '12:00', slotMinutes: 20 },
        { dayOfWeek: 4, startTime: '08:00', endTime: '12:00', slotMinutes: 20 },
        { dayOfWeek: 6, startTime: '08:00', endTime: '12:00', slotMinutes: 20 },
      ],
    },
  ];

  for (const d of extraDoctors) {
    const hash = await bcrypt.hash('Doctor1234!', 12);
    const created = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        passwordHash: hash,
        role: Role.DOCTOR,
        doctor: {
          create: {
            licenseNumber: d.licenseNumber,
            specialty: d.specialty,
            isVerified: true,
            firstName: d.firstName,
            lastName: d.lastName,
            availability: { create: d.availability },
          },
        },
      },
    });
    console.log(`Doctor created: ${created.email} (${d.specialty})`);
  }

  const patientHash = await bcrypt.hash('Patient1234!', 12);
  const patient = await prisma.user.upsert({
    where: { email: 'paciente@eminor.com' },
    update: {},
    create: {
      email: 'paciente@eminor.com',
      passwordHash: patientHash,
      role: Role.PATIENT,
      patient: {
        create: {
          dni: '12345678',
          firstName: 'Ana',
          lastName: 'López',
          birthDate: new Date('1990-05-15'),
          medicalInsurance: 'OSDE',
        },
      },
    },
  });
  console.log('Patient created:', patient.email);

  // Asignar al menos un turno (con la paciente de prueba) a cada médico
  const anaPatient = await prisma.patient.findUnique({ where: { dni: '12345678' } });
  const allDoctors = await prisma.doctor.findMany({
    where: {
      licenseNumber: { in: ['MN-12345', ...extraDoctors.map((d) => d.licenseNumber)] },
    },
    include: { availability: true },
  });

  if (anaPatient) {
    for (const doc of allDoctors) {
      const existing = await prisma.appointment.findFirst({ where: { doctorId: doc.id } });
      if (existing) continue;

      const slot = doc.availability[0];
      const scheduledAt = slot
        ? nextDateForDayAndTime(slot.dayOfWeek, slot.startTime)
        : nextDateForDayAndTime(1, '10:00');

      await prisma.appointment.create({
        data: {
          patientId: anaPatient.id,
          doctorId: doc.id,
          scheduledAt,
          status: 'PENDING',
        },
      });
      console.log(`Appointment created: ${doc.firstName} ${doc.lastName} (${doc.specialty}) <-> ${anaPatient.firstName} ${anaPatient.lastName} @ ${scheduledAt.toISOString()}`);
    }
  }

  console.log('Seed complete!');
  console.log('─────────────────────────────────────');
  console.log('Test credentials:');
  console.log('  Admin:   admin@eminor.com         / Admin1234!');
  console.log('  Doctor:  doctor@eminor.com        / Doctor1234!  (Medicina General)');
  console.log('  Doctor:  cardiologia@eminor.com   / Doctor1234!  (Cardiología)');
  console.log('  Doctor:  pediatria@eminor.com     / Doctor1234!  (Pediatría)');
  console.log('  Doctor:  dermatologia@eminor.com  / Doctor1234!  (Dermatología)');
  console.log('  Doctor:  ginecologia@eminor.com   / Doctor1234!  (Ginecología)');
  console.log('  Doctor:  traumatologia@eminor.com / Doctor1234!  (Traumatología)');
  console.log('  Patient: paciente@eminor.com      / Patient1234!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
