import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AppointmentStatus, Role } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/decorators/current-user.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(Role.DOCTOR, Role.ADMIN)
  findByDoctorAndDate(
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.findByDoctorAndDate(doctorId, date);
  }

  @Get('my')
  @Roles(Role.PATIENT)
  findMine(@CurrentUser() user: JwtUser) {
    return this.appointmentsService.findForPatient(user.id);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  findAllAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: AppointmentStatus,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.appointmentsService.findAllAdmin({ page, limit, status, doctorId, patientId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.PATIENT)
  @UseInterceptors(AuditLogInterceptor)
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: JwtUser) {
    return this.appointmentsService.create(dto, user);
  }

  @Patch(':id/status')
  @UseInterceptors(AuditLogInterceptor)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.appointmentsService.updateStatus(id, dto.status, user);
  }

  @Get(':id/video-token')
  @Roles(Role.DOCTOR, Role.PATIENT)
  getVideoToken(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.appointmentsService.getVideoToken(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(AuditLogInterceptor)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(AuditLogInterceptor)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.remove(id);
  }
}
