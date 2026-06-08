import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { EvolutionsService } from './evolutions.service';
import { CreateEvolutionDto } from './dto/create-evolution.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/decorators/current-user.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvolutionsController {
  constructor(private readonly evolutionsService: EvolutionsService) {}

  @Post('evolutions')
  @Roles(Role.DOCTOR)
  @UseInterceptors(AuditLogInterceptor)
  create(@Body() dto: CreateEvolutionDto, @CurrentUser() user: JwtUser) {
    return this.evolutionsService.create(dto, user);
  }

  @Patch('evolutions/:id/sign')
  @Roles(Role.DOCTOR)
  @UseInterceptors(AuditLogInterceptor)
  sign(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.evolutionsService.sign(id, user);
  }

  @Patch('evolutions/:id')
  @Roles(Role.DOCTOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { soapData: object },
    @CurrentUser() user: JwtUser,
  ) {
    return this.evolutionsService.update(id, body.soapData, user);
  }

  @Get('patients/:id/medical-record')
  @Roles(Role.DOCTOR, Role.PATIENT)
  @UseInterceptors(AuditLogInterceptor)
  getMedicalRecord(
    @Param('id', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.evolutionsService.getMedicalRecord(patientId, user);
  }
}
