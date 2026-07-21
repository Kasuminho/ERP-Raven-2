import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { GuildHealthModule } from "../guild-health/guild-health.module";
import { OperationsModule } from "../operations/operations.module";
import { StaffTasksController } from "./staff-tasks.controller";
import { StaffTasksService } from "./staff-tasks.service";
@Module({
  imports: [AuditModule, GuildHealthModule, OperationsModule],
  controllers: [StaffTasksController],
  providers: [StaffTasksService],
})
export class StaffTasksModule {}
