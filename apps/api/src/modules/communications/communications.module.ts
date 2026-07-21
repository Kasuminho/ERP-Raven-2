import { Module } from "@nestjs/common";
import { BusinessRulesModule } from "../business-rules/business-rules.module";
import { DiscordModule } from "../discord/discord.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PlaybooksModule } from "../playbooks/playbooks.module";
import { CommunicationsController } from "./communications.controller";
import { CommunicationsService } from "./communications.service";
@Module({
  imports: [
    DiscordModule,
    NotificationsModule,
    EventsModule,
    PlaybooksModule,
    BusinessRulesModule,
  ],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
})
export class CommunicationsModule {}
