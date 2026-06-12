import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('doctors')
  createDoctor(@Body() dto: CreateDoctorDto) {
    return this.adminService.createDoctor(dto);
  }

  @Get('users')
  getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getUsers(page, limit);
  }

  @Patch('users/:id/toggle-active')
  toggleUserActive(@Param('id', ParseUUIDPipe) userId: string) {
    return this.adminService.toggleUserActive(userId);
  }

  @Get('audit-logs')
  getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getAuditLogs(page, limit, userId);
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('patients')
  getPatients(@Query('search') search?: string) {
    return this.adminService.getPatients(search);
  }

  @Get('patients/:id/records')
  getPatientRecords(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getPatientRecords(id);
  }

  @Get('evolutions/:id/pdf')
  async getEvolutionPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.adminService.getEvolutionPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get('prescriptions/:id/pdf')
  async getPrescriptionPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.adminService.getPrescriptionPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get('certificates/:id/pdf')
  async getCertificatePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.adminService.getCertificatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
