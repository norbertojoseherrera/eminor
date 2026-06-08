import { Controller, Post, Get, Body, Param, UseGuards, UseInterceptors, ParseUUIDPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/decorators/current-user.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Roles(Role.DOCTOR)
  @UseInterceptors(AuditLogInterceptor)
  create(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: JwtUser) {
    return this.prescriptionsService.create(dto, user);
  }

  @Get('appointment/:appointmentId')
  @Roles(Role.DOCTOR, Role.PATIENT)
  findByAppointment(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.prescriptionsService.findByAppointment(appointmentId, user);
  }

  @Get('patient/:patientId')
  @Roles(Role.DOCTOR, Role.PATIENT)
  findForPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.prescriptionsService.findForPatient(patientId, user);
  }
}
