import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { StaffAutomationController } from "./staff-automation.controller";
import { StaffAutomationService } from "./staff-automation.service";

@Module({
  imports: [AuditModule],
  controllers: [StaffAutomationController],
  providers: [StaffAutomationService],
})
export class StaffAutomationModule {}
