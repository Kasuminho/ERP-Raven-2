import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DaoshiController } from './controllers/daoshi.controller';
import { DaoshiService } from './services/daoshi.service';

@Module({
  imports: [AuditModule],
  controllers: [DaoshiController],
  providers: [DaoshiService, RolesGuard],
  exports: [DaoshiService],
})
export class DaoshiModule {}
