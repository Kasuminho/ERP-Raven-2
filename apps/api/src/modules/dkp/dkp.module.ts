import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { BusinessRulesModule } from '../business-rules/business-rules.module';
import { DkpController } from './controllers/dkp.controller';
import { DkpService } from './services/dkp.service';
import { DkpRepository } from './repositories/dkp.repository';

@Module({
  imports: [AuditModule, BusinessRulesModule],
  controllers: [DkpController],
  providers: [DkpService, DkpRepository, RolesGuard],
  exports: [DkpService],
})
export class DkpModule {}
