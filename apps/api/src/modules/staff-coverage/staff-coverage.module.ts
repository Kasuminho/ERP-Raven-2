import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { StaffCoverageController } from "./staff-coverage.controller";
import { StaffCoverageService } from "./staff-coverage.service";

@Module({
  imports: [AuditModule],
  controllers: [StaffCoverageController],
  providers: [StaffCoverageService],
})
export class StaffCoverageModule {}
