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
  ConfirmStaffAutomationDto,
  CreateStaffAutomationDryRunDto,
  SetStaffAutomationKillSwitchDto,
} from "./dto";
import { StaffAutomationService } from "./staff-automation.service";
type AuthRequest = { user: { userId: string } };

@Controller("staff-automations")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STAFF", "ADMIN")
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class StaffAutomationController {
  constructor(private readonly service: StaffAutomationService) {}
  @Get() get() {
    return this.service.getWorkspace();
  }
  @Post("dry-runs") dryRun(
    @Req() req: AuthRequest,
    @Body() dto: CreateStaffAutomationDryRunDto,
  ) {
    return this.service.createDryRun(req.user.userId, dto);
  }
  @Post(":id/activate") activate(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() dto: ConfirmStaffAutomationDto,
  ) {
    return this.service.activate(req.user.userId, id, dto.confirm);
  }
  @Patch(":id/kill-switch") killSwitch(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() dto: SetStaffAutomationKillSwitchDto,
  ) {
    return this.service.setKillSwitch(req.user.userId, id, dto.killSwitch);
  }
}
