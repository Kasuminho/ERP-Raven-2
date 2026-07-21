import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { LeadershipHealthController } from "./leadership-health.controller";
import { LeadershipHealthService } from "./leadership-health.service";
@Module({
  imports: [AuditModule],
  controllers: [LeadershipHealthController],
  providers: [LeadershipHealthService],
})
export class LeadershipHealthModule {}
