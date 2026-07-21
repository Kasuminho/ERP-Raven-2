import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AddGuildCaseMessageDto, CreateGuildCaseDto, ListGuildCasesQueryDto, RespondGuildCaseDto, TriageGuildCaseDto } from './dto';
import { GuildCasesService } from './guild-cases.service';

type AuthRequest = { user: { userId: string } };

@Controller('guild-cases')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class GuildCasesController {
  constructor(private readonly service: GuildCasesService) {}

  @Get('me')
  listMine(@Req() req: AuthRequest) {
    return this.service.listMine(req.user.userId);
  }

  @Post('me')
  create(@Req() req: AuthRequest, @Body() dto: CreateGuildCaseDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Post('me/:caseId/messages')
  addMessage(@Req() req: AuthRequest, @Param('caseId') caseId: string, @Body() dto: AddGuildCaseMessageDto) {
    return this.service.addPlayerMessage(req.user.userId, caseId, dto);
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  staffWorkspace(@Query() query: ListGuildCasesQueryDto) {
    return this.service.getStaffWorkspace(query.status);
  }

  @Patch('staff/:caseId')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  triage(@Req() req: AuthRequest, @Param('caseId') caseId: string, @Body() dto: TriageGuildCaseDto) {
    return this.service.triage(caseId, req.user.userId, dto);
  }

  @Post('staff/:caseId/respond')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  respond(@Req() req: AuthRequest, @Param('caseId') caseId: string, @Body() dto: RespondGuildCaseDto) {
    return this.service.respond(caseId, req.user.userId, dto);
  }
}
