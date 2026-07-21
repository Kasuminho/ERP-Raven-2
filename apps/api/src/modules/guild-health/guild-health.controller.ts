import { Controller, Get, UseGuards } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { GuildHealthService } from "./guild-health.service";
@Controller("guild-health")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STAFF", "ADMIN")
export class GuildHealthController {
  constructor(private readonly service: GuildHealthService) {}
  @Get("signals") signals() {
    return this.service.getSignals();
  }
}
