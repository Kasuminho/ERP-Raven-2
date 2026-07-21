import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateLeadershipCheckInDto } from "./dto";
import { LeadershipHealthService } from "./leadership-health.service";
type AuthRequest = { user: { userId: string } };
@Controller("leadership-health")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STAFF", "ADMIN")
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class LeadershipHealthController {
  constructor(private readonly service: LeadershipHealthService) {}
  @Get() get() {
    return this.service.getWorkspace();
  }
  @Post("check-ins") create(
    @Req() req: AuthRequest,
    @Body() dto: CreateLeadershipCheckInDto,
  ) {
    return this.service.createCheckIn(req.user.userId, dto);
  }
}
