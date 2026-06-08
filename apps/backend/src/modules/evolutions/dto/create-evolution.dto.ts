import {
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
  IsArray,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssessmentDto {
  @IsString()
  @MinLength(5)
  text: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^[A-Z]\d{2}(\.\d)?$/, {
    each: true,
    message: 'CIE-10 code must be in format like "J18.9" or "A09"',
  })
  cie10Codes: string[];
}

export class SoapDataDto {
  @IsString()
  @MinLength(10)
  subjective: string;

  @IsString()
  @MinLength(5)
  objective: string;

  @ValidateNested()
  @Type(() => AssessmentDto)
  assessment: AssessmentDto;

  @IsString()
  @MinLength(5)
  plan: string;
}

export class CreateEvolutionDto {
  @IsUUID()
  appointmentId: string;

  @ValidateNested()
  @Type(() => SoapDataDto)
  soapData: SoapDataDto;
}
