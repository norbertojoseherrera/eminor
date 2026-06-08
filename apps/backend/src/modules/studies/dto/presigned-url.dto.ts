import { IsEnum, IsString, IsUUID, MaxLength, Matches } from 'class-validator';
import { FileType } from '@prisma/client';

export class PresignedUrlDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsString()
  @MaxLength(200)
  @Matches(/^[a-zA-Z0-9_\-. ]+\.(pdf|jpg|jpeg|png)$/i, {
    message: 'Invalid file name. Allowed: pdf, jpg, jpeg, png',
  })
  fileName: string;

  @IsEnum(FileType)
  fileType: FileType;
}
