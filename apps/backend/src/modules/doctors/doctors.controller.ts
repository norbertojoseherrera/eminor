import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { DoctorsService } from './doctors.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/decorators/current-user.decorator';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  findAll(@Query('specialty') specialty?: string) {
    return this.doctorsService.findAll(specialty);
  }

  @Get('me/availability')
  @Roles(Role.DOCTOR)
  getOwnAvailability(@CurrentUser() user: JwtUser) {
    return this.doctorsService.getOwnAvailability(user.id);
  }

  @Put('me/availability')
  @Roles(Role.DOCTOR)
  setOwnAvailability(@CurrentUser() user: JwtUser, @Body() dto: SetAvailabilityDto) {
    return this.doctorsService.setOwnAvailability(user.id, dto);
  }

  @Get(':id/availability')
  getAvailableSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date: string,
  ) {
    return this.doctorsService.getAvailableSlots(id, date);
  }
}
