import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { EvolutionsModule } from './modules/evolutions/evolutions.module';
import { StudiesModule } from './modules/studies/studies.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { AdminModule } from './modules/admin/admin.module';
import { DoctorsModule } from './modules/doctors/doctors.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60_000, limit: 200 },
    ]),
    PrismaModule,
    AuthModule,
    AppointmentsModule,
    EvolutionsModule,
    StudiesModule,
    PrescriptionsModule,
    AdminModule,
    DoctorsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
