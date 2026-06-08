import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

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

  console.log('Seed complete!');
  console.log('─────────────────────────────────────');
  console.log('Test credentials:');
  console.log('  Admin:   admin@eminor.com    / Admin1234!');
  console.log('  Doctor:  doctor@eminor.com   / Doctor1234!');
  console.log('  Patient: paciente@eminor.com / Patient1234!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
