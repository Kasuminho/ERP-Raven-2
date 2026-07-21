import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  CreateGuildPulseDto,
  ModerateGuildPulseDto,
  SetGuildPulseStatusDto,
  SubmitGuildPulseDto,
} from "./dto";
import { GuildPulseService } from "./guild-pulse.service";
type AuthRequest = { user: { userId: string } };
@Controller("guild-pulse")
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class GuildPulseController {
  constructor(private readonly service: GuildPulseService) {}
  @Get("me") mine(@Req() req: AuthRequest) {
    return this.service.getMine(req.user.userId);
  }
  @Post("me/:cycleId/submit") submit(
    @Req() req: AuthRequest,
    @Param("cycleId") cycleId: string,
    @Body() dto: SubmitGuildPulseDto,
  ) {
    return this.service.submit(req.user.userId, cycleId, dto);
  }
  @Post("me/:cycleId/skip") skip(
    @Req() req: AuthRequest,
    @Param("cycleId") cycleId: string,
  ) {
    return this.service.skip(req.user.userId, cycleId);
  }
  @Get("staff") @UseGuards(RolesGuard) @Roles("STAFF", "ADMIN") staff() {
    return this.service.getStaffWorkspace();
  }
  @Post("staff") @UseGuards(RolesGuard) @Roles("STAFF", "ADMIN") create(
    @Req() req: AuthRequest,
    @Body() dto: CreateGuildPulseDto,
  ) {
    return this.service.create(req.user.userId, dto);
  }
  @Patch("staff/:cycleId/status")
  @UseGuards(RolesGuard)
  @Roles("STAFF", "ADMIN")
  status(
    @Req() req: AuthRequest,
    @Param("cycleId") cycleId: string,
    @Body() dto: SetGuildPulseStatusDto,
  ) {
    return this.service.setStatus(req.user.userId, cycleId, dto);
  }
  @Patch("staff/responses/:responseId/moderation")
  @UseGuards(RolesGuard)
  @Roles("STAFF", "ADMIN")
  moderate(
    @Req() req: AuthRequest,
    @Param("responseId") responseId: string,
    @Body() dto: ModerateGuildPulseDto,
  ) {
    return this.service.moderate(req.user.userId, responseId, dto);
  }
}
