import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditController } from './controllers/audit.controller';
import { AuditService } from './services/audit.service';
import { AuditRepository } from './repositories/audit.repository';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository, RolesGuard],
  exports: [AuditService],
})
export class AuditModule {}
