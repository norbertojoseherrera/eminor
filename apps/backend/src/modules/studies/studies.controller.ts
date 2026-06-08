import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { StudiesService } from './studies.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/decorators/current-user.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@Controller('studies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT, Role.DOCTOR)
export class StudiesController {
  constructor(private readonly studiesService: StudiesService) {}

  @Post('presigned-url')
  @UseInterceptors(AuditLogInterceptor)
  createPresignedUpload(
    @Body() dto: PresignedUrlDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.studiesService.createPresignedUpload(dto, user);
  }

  @Get(':id/download-url')
  @UseInterceptors(AuditLogInterceptor)
  getDownloadUrl(
    @Param('id', ParseUUIDPipe) studyId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.studiesService.getDownloadUrl(studyId, user);
  }

  @Get('patient/:patientId')
  listForPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.studiesService.listForPatient(patientId, user);
  }
}
