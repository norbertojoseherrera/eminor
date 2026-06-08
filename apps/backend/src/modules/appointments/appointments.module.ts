import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { VideoTokenService } from './video-token.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, VideoTokenService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
