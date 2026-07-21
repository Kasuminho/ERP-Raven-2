import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateGuildPolicyDraftDto, UpdateGuildPolicyDraftDto } from './dto';
import { GuildPolicyService } from './guild-policy.service';

type AuthRequest = { user: { userId: string } };

@Controller('guild-policies')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class GuildPolicyController {
  constructor(private readonly service: GuildPolicyService) {}

  @Get()
  async publicWorkspace(@Req() req: AuthRequest) {
    return this.service.getPublicWorkspace(new Date(), req.user.userId);
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffWorkspace() {
    return this.service.getStaffWorkspace();
  }

  @Post('drafts')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async createDraft(@Body() dto: CreateGuildPolicyDraftDto, @Req() req: AuthRequest) {
    return this.service.createDraft(dto, req.user.userId);
  }

  @Patch('drafts/:policyId')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async updateDraft(@Param('policyId') policyId: string, @Body() dto: UpdateGuildPolicyDraftDto, @Req() req: AuthRequest) {
    return this.service.updateDraft(policyId, dto, req.user.userId);
  }

  @Post('drafts/:policyId/refresh-snapshot')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async refreshSnapshot(@Param('policyId') policyId: string, @Req() req: AuthRequest) {
    return this.service.refreshDraftSnapshot(policyId, req.user.userId);
  }

  @Post('drafts/:policyId/publish')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async publish(@Param('policyId') policyId: string, @Req() req: AuthRequest) {
    return this.service.publish(policyId, req.user.userId);
  }

  @Post(':policyId/open')
  async markOpened(@Param('policyId') policyId: string, @Req() req: AuthRequest) {
    return this.service.markOpened(policyId, req.user.userId);
  }

  @Post(':policyId/acknowledge')
  async acknowledge(@Param('policyId') policyId: string, @Req() req: AuthRequest) {
    return this.service.acknowledge(policyId, req.user.userId);
  }
}
