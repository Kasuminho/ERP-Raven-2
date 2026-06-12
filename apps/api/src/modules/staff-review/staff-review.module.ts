import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { AuctionsModule } from '../auctions/auctions.module';
import { DkpModule } from '../dkp/dkp.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { StaffReviewController } from './controllers/staff-review.controller';
import { StaffReviewRepository } from './repositories/staff-review.repository';
import { StaffReviewService } from './services/staff-review.service';

@Module({
  imports: [AuditModule, AuctionsModule, DkpModule, EligibilityModule],
  controllers: [StaffReviewController],
  providers: [StaffReviewService, StaffReviewRepository, RolesGuard],
  exports: [StaffReviewService],
})
export class StaffReviewModule {}
