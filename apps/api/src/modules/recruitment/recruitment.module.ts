import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RecruitmentController } from './controllers/recruitment.controller';
import { RecruitmentService } from './services/recruitment.service';

@Module({
  imports: [AuditModule],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
})
export class RecruitmentModule {}
