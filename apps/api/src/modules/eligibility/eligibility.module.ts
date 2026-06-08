import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DkpModule } from '../dkp/dkp.module';
import { EligibilityController } from './controllers/eligibility.controller';
import { EligibilityService } from './services/eligibility.service';
import { EligibilityRepository } from './repositories/eligibility.repository';

@Module({
  imports: [AuditModule, DkpModule],
  controllers: [EligibilityController],
  providers: [EligibilityService, EligibilityRepository],
  exports: [EligibilityService],
})
export class EligibilityModule {}
