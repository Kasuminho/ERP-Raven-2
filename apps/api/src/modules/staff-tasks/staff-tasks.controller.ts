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
  CreateStaffTaskDto,
  CreateStaffTaskHandoffDto,
  UpdateStaffTaskDto,
} from "./dto";
import { StaffTasksService } from "./staff-tasks.service";
type AuthRequest = { user: { userId: string } };
@Controller("staff-tasks")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STAFF", "ADMIN")
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class StaffTasksController {
  constructor(private readonly service: StaffTasksService) {}
  @Get() get() {
    return this.service.getWorkspace();
  }
  @Post() create(@Req() req: AuthRequest, @Body() dto: CreateStaffTaskDto) {
    return this.service.create(req.user.userId, dto);
  }
  @Patch(":id") update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() dto: UpdateStaffTaskDto,
  ) {
    return this.service.update(req.user.userId, id, dto);
  }
  @Post(":id/handoffs") handoff(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() dto: CreateStaffTaskHandoffDto,
  ) {
    return this.service.handoff(req.user.userId, id, dto);
  }
}
