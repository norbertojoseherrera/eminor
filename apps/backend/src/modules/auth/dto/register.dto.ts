import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { DocumentType } from '@prisma/client';

export class RegisterPatientDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter and one number',
  })
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsString()
  @Matches(/^[A-Za-z0-9]{6,20}$/, { message: 'Documento inválido' })
  dni: string;

  @IsString()
  @Matches(/^\+?[\d\s-]{8,20}$/, { message: 'Teléfono inválido' })
  phone: string;

  @IsDateString()
  birthDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  medicalInsurance?: string;
}
