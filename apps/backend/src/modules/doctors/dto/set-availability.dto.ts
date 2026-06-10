import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  Max,
  Min,
  Matches,
  ValidateNested,
} from 'class-validator';

export class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime debe tener formato HH:mm' })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime debe tener formato HH:mm' })
  endTime: string;

  @IsInt()
  @Min(5)
  @Max(120)
  slotMinutes: number;
}

export class SetAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  schedule: AvailabilitySlotDto[];
}
