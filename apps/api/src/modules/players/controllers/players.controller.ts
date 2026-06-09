import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PlayerClass, ProgressCategory } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PlayersService } from '../services/players.service';

type AuthRequest = {
  user: {
    userId: string;
  };
};

@Controller('players')
export class PlayersController {
  constructor(private readonly service: PlayersService) {}

  @Get('health')
  health(): { module: string; ready: boolean } {
    return this.service.health();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async listPlayers() {
    return this.service.listPlayers();
  }

  @Get('audit/identities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async listAuditIdentities() {
    return this.service.listAuditIdentities();
  }

  @Get('audit/discord/:discordId/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffDiscordHistory(@Param('discordId') discordId: string) {
    return this.service.getStaffDiscordHistory(discordId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthRequest) {
    return this.service.getMe(req.user.userId);
  }

  @Patch('me/preferences')
  @UseGuards(JwtAuthGuard)
  async preferences(@Req() req: AuthRequest, @Body() dto: { timezone?: string; locale?: string }) {
    return this.service.updatePreferences(req.user.userId, dto);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() dto: { nickname?: string; class?: PlayerClass; dimensionalLayer?: number; timezone?: string; locale?: string },
  ) {
    return this.service.updatePrimaryPlayerProfile(req.user.userId, dto);
  }

  @Post('me/progress')
  @UseGuards(JwtAuthGuard)
  async createProgress(
    @Req() req: AuthRequest,
    @Body() dto: {
      category?: ProgressCategory;
      level?: number;
      note?: string;
      imageUrl?: string;
      imageUrls?: string[];
      combatPower?: number;
      dimensionalLayer?: number;
    },
  ) {
    return this.service.createProgress(req.user.userId, dto);
  }

  @Get('progress/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async pendingProgressReviews() {
    return this.service.listPendingProgressReviews();
  }

  @Post('progress/:progressId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async approveProgress(
    @Param('progressId') progressId: string,
    @Req() req: AuthRequest,
    @Body() dto: { combatPower?: number; dimensionalLayer?: number; reviewNote?: string },
  ) {
    return this.service.approveProgressReview(progressId, req.user.userId, dto);
  }

  @Post('progress/:progressId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async rejectProgress(
    @Param('progressId') progressId: string,
    @Req() req: AuthRequest,
    @Body() dto: { reviewNote?: string },
  ) {
    return this.service.rejectProgressReview(progressId, req.user.userId, dto.reviewNote);
  }

  @Post('progress/:progressId/comments')
  @UseGuards(JwtAuthGuard)
  async commentProgress(
    @Param('progressId') progressId: string,
    @Req() req: AuthRequest,
    @Body() dto: { body?: string },
  ) {
    return this.service.createProgressComment(progressId, req.user.userId, dto.body);
  }

  @Post('me/progress/:progressId/read-comments')
  @UseGuards(JwtAuthGuard)
  async readProgressComments(
    @Param('progressId') progressId: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.markProgressCommentsRead(req.user.userId, progressId);
  }

  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  async myHistory(@Req() req: AuthRequest) {
    return this.service.getMyHistory(req.user.userId);
  }

  @Get(':playerId/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffPlayerHistory(@Param('playerId') playerId: string) {
    return this.service.getStaffPlayerHistory(playerId);
  }
}
