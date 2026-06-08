import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { JwtUser } from '../../common/decorators/current-user.decorator';

const MIME_MAP: Record<string, string> = {
  PDF: 'application/pdf',
  JPG: 'image/jpeg',
  PNG: 'image/png',
};

@Injectable()
export class StudiesService {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const accountId = config.get<string>('r2.accountId');
    this.bucket = config.get<string>('r2.bucket') ?? 'eminor-studies';

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: accountId
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : 'http://localhost:9000',
      credentials: {
        accessKeyId: config.get<string>('r2.accessKeyId') ?? 'minioadmin',
        secretAccessKey: config.get<string>('r2.secretAccessKey') ?? 'minioadmin',
      },
    });
  }

  async createPresignedUpload(dto: PresignedUrlDto, user: JwtUser) {
    await this.assertPatientAccess(dto.patientId, user);

    const fileKey = `patients/${dto.patientId}/${uuidv4()}/${dto.fileName}`;
    const contentType = MIME_MAP[dto.fileType] ?? 'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 });

    const study = await this.prisma.study.create({
      data: {
        patientId: dto.patientId,
        title: dto.title,
        fileKey,
        fileType: dto.fileType,
      },
    });

    return { uploadUrl, studyId: study.id, expiresIn: 900 };
  }

  async getDownloadUrl(studyId: string, user: JwtUser) {
    const study = await this.prisma.study.findUnique({ where: { id: studyId } });
    if (!study) throw new NotFoundException('Study not found');

    await this.assertPatientAccess(study.patientId, user);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: study.fileKey,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    return { url, expiresAt: new Date(Date.now() + 900_000) };
  }

  async listForPatient(patientId: string, user: JwtUser) {
    await this.assertPatientAccess(patientId, user);

    return this.prisma.study.findMany({
      where: { patientId },
      orderBy: { uploadedAt: 'desc' },
      select: { id: true, title: true, fileType: true, uploadedAt: true },
    });
  }

  private async assertPatientAccess(patientId: string, user: JwtUser) {
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Admins cannot access clinical study files');
    }

    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: user.id },
      });
      if (!patient || patient.id !== patientId) {
        throw new ForbiddenException('Access denied');
      }
    }

    if (user.role === Role.DOCTOR) {
      const hasRelation = await this.prisma.appointment.findFirst({
        where: { patientId, doctor: { userId: user.id } },
      });
      if (!hasRelation) {
        throw new ForbiddenException('No appointment relationship with this patient');
      }
    }
  }
}
