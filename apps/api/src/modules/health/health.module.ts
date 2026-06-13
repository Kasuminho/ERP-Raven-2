import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { HealthController } from './controllers/health.controller';
import { HealthMonitorService } from './services/health-monitor.service';
import { HealthService } from './services/health.service';

@Module({
  imports: [DatabaseModule, AuditModule, DiscordModule],
  controllers: [HealthController],
  providers: [HealthService, HealthMonitorService],
  exports: [HealthService],
})
export class HealthModule {}
