import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MentorshipController } from "./mentorship.controller";
import { MentorshipService } from "./mentorship.service";

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [MentorshipController],
  providers: [MentorshipService],
})
export class MentorshipModule {}
