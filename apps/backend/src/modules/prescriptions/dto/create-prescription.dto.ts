import { IsUUID, ValidateNested, IsString, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class MedicationItemDto {
  @IsString()
  name: string;

  @IsString()
  dose: string;

  @IsString()
  frequency: string;

  @IsString()
  duration: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MedicationPayloadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicationItemDto)
  medications: MedicationItemDto[];

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreatePrescriptionDto {
  @IsUUID()
  appointmentId: string;

  @ValidateNested()
  @Type(() => MedicationPayloadDto)
  medicationPayload: MedicationPayloadDto;
}
