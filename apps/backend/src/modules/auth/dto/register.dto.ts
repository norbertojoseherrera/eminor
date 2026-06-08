import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
  IsOptional,
} from 'class-validator';

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

  @IsString()
  @Matches(/^\d{7,8}$/, { message: 'DNI must be 7 or 8 digits' })
  dni: string;

  @IsDateString()
  birthDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  medicalInsurance?: string;
}
