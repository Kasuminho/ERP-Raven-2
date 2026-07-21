import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { GuildPulseController } from "./guild-pulse.controller";
import { GuildPulseService } from "./guild-pulse.service";
@Module({
  imports: [AuditModule],
  controllers: [GuildPulseController],
  providers: [GuildPulseService],
  exports: [GuildPulseService],
})
export class GuildPulseModule {}
