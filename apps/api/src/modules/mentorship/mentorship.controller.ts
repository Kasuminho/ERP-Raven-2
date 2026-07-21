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
  AssignMentorshipDto,
  CreateMentorshipHelpRequestDto,
  TriageMentorshipHelpDto,
  UpdateMentorProfileDto,
  UpdateMentorshipDto,
} from "./dto";
import { MentorshipService } from "./mentorship.service";

type AuthRequest = { user: { userId: string } };
@Controller("mentorship")
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class MentorshipController {
  constructor(private readonly service: MentorshipService) {}
  @Get("me") mine(@Req() req: AuthRequest) {
    return this.service.getMine(req.user.userId);
  }
  @Patch("me/mentor-profile") profile(
    @Req() req: AuthRequest,
    @Body() dto: UpdateMentorProfileDto,
  ) {
    return this.service.updateMentorProfile(req.user.userId, dto);
  }
  @Post("me/help") help(
    @Req() req: AuthRequest,
    @Body() dto: CreateMentorshipHelpRequestDto,
  ) {
    return this.service.createHelpRequest(req.user.userId, dto);
  }
  @Get("staff") @UseGuards(RolesGuard) @Roles("STAFF", "ADMIN") staff() {
    return this.service.getStaffWorkspace();
  }
  @Post("staff/assignments")
  @UseGuards(RolesGuard)
  @Roles("STAFF", "ADMIN")
  assign(@Req() req: AuthRequest, @Body() dto: AssignMentorshipDto) {
    return this.service.assign(req.user.userId, dto);
  }
  @Patch("staff/assignments/:id")
  @UseGuards(RolesGuard)
  @Roles("STAFF", "ADMIN")
  update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() dto: UpdateMentorshipDto,
  ) {
    return this.service.updateAssignment(req.user.userId, id, dto);
  }
  @Patch("staff/help/:id")
  @UseGuards(RolesGuard)
  @Roles("STAFF", "ADMIN")
  triage(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() dto: TriageMentorshipHelpDto,
  ) {
    return this.service.triageHelp(req.user.userId, id, dto);
  }
}
