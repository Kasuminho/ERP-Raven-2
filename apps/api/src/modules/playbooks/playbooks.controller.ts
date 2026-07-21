import {
  Body,
  Controller,
  Get,
  Param,
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
  AssignPlaybookDto,
  ConfirmPlaybookInstructionDto,
  CreatePlaybookVersionDto,
  DecidePlaybookLessonDto,
} from "./dto";
import { PlaybooksService } from "./playbooks.service";
type AuthRequest = { user: { userId: string } };

@Controller("playbooks")
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class PlaybooksController {
  constructor(private readonly service: PlaybooksService) {}
  @Get("staff") @Roles("STAFF", "ADMIN") staff() {
    return this.service.getStaffWorkspace();
  }
  @Get("staff/operations/:operationId/lesson-candidates")
  @Roles("STAFF", "ADMIN")
  candidates(@Param("operationId") operationId: string) {
    return this.service.getLessonCandidates(operationId);
  }
  @Post("staff") @Roles("STAFF", "ADMIN") create(
    @Req() req: AuthRequest,
    @Body() dto: CreatePlaybookVersionDto,
  ) {
    return this.service.createPlaybook(req.user.userId, dto);
  }
  @Post("staff/:playbookId/versions") @Roles("STAFF", "ADMIN") version(
    @Req() req: AuthRequest,
    @Param("playbookId") playbookId: string,
    @Body() dto: CreatePlaybookVersionDto,
  ) {
    return this.service.createVersion(req.user.userId, playbookId, dto);
  }
  @Post("staff/assignments") @Roles("STAFF", "ADMIN") assign(
    @Req() req: AuthRequest,
    @Body() dto: AssignPlaybookDto,
  ) {
    return this.service.assign(req.user.userId, dto);
  }
  @Post("staff/lessons") @Roles("STAFF", "ADMIN") lesson(
    @Req() req: AuthRequest,
    @Body() dto: DecidePlaybookLessonDto,
  ) {
    return this.service.decideLesson(req.user.userId, dto);
  }
  @Get("me") @Roles("PLAYER", "STAFF", "ADMIN") mine(@Req() req: AuthRequest) {
    return this.service.getMine(req.user.userId);
  }
  @Post("me/assignments/:assignmentId/confirm")
  @Roles("PLAYER", "STAFF", "ADMIN")
  confirm(
    @Req() req: AuthRequest,
    @Param("assignmentId") assignmentId: string,
    @Body() dto: ConfirmPlaybookInstructionDto,
  ) {
    return this.service.confirmInstruction(
      req.user.userId,
      assignmentId,
      dto.confirm,
    );
  }
}
