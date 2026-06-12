import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PdfModule } from '../../common/pdf/pdf.module';

@Module({
  imports: [PdfModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
