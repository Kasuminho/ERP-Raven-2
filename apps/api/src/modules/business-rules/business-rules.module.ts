import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BusinessRulesController } from './business-rules.controller';
import { BusinessRulesService } from './business-rules.service';
import { GuildPolicyController } from './guild-policy.controller';
import { GuildPolicyService } from './guild-policy.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [BusinessRulesController, GuildPolicyController],
  providers: [BusinessRulesService, GuildPolicyService],
  exports: [BusinessRulesService, GuildPolicyService],
})
export class BusinessRulesModule {}
