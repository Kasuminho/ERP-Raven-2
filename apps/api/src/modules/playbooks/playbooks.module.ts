import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { WarRoomModule } from "../war-room/war-room.module";
import { PlaybooksController } from "./playbooks.controller";
import { PlaybooksService } from "./playbooks.service";
@Module({
  imports: [AuditModule, WarRoomModule],
  controllers: [PlaybooksController],
  providers: [PlaybooksService],
  exports: [PlaybooksService],
})
export class PlaybooksModule {}
