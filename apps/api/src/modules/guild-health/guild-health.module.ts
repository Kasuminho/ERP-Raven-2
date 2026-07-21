import { Module } from "@nestjs/common";
import { GuildHealthController } from "./guild-health.controller";
import { GuildHealthService } from "./guild-health.service";
@Module({
  controllers: [GuildHealthController],
  providers: [GuildHealthService],
  exports: [GuildHealthService],
})
export class GuildHealthModule {}
