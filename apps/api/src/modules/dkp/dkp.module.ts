import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DkpController } from './controllers/dkp.controller';
import { DkpService } from './services/dkp.service';
import { DkpRepository } from './repositories/dkp.repository';

@Module({
  imports: [AuditModule],
  controllers: [DkpController],
  providers: [DkpService, DkpRepository, RolesGuard],
  exports: [DkpService],
})
export class DkpModule {}
