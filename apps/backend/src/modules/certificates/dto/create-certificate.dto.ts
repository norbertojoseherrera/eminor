import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { CertificateType } from '@prisma/client';

export class CreateCertificateDto {
  @IsUUID()
  appointmentId: string;

  @IsEnum(CertificateType)
  type: CertificateType;

  @IsString()
  @MinLength(10)
  content: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  restDays?: number;
}
