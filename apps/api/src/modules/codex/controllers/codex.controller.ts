import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CodexRequest, CodexRequestStatus } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateCodexRequestDto, SendCodexRequestDto } from '../dto';
import { CodexRequestDetails, CodexService } from '../services/codex.service';

type AuthRequest = { user: { userId: string } };

@Controller('codex')
@UseGuards(JwtAuthGuard)
export class CodexController {
  constructor(private readonly service: CodexService) {}

  @Get('me')
  async mine(@Req() req: AuthRequest): Promise<CodexRequestDetails[]> {
    return this.service.listForCurrentUser(req.user.userId);
  }

  @Post('me')
  async createMine(@Body() dto: CreateCodexRequestDto, @Req() req: AuthRequest): Promise<CodexRequest> {
    return this.service.createForCurrentUser(req.user.userId, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async list(@Query('status') status?: CodexRequestStatus): Promise<CodexRequestDetails[]> {
    return this.service.listForStaff(status);
  }

  @Post(':id/send')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async send(@Param('id') id: string, @Body() dto: SendCodexRequestDto, @Req() req: AuthRequest): Promise<CodexRequest> {
    return this.service.markSent(id, req.user.userId, dto);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async cancel(@Param('id') id: string, @Req() req: AuthRequest): Promise<CodexRequest> {
    return this.service.cancel(id, req.user.userId);
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string, @Req() req: AuthRequest): Promise<CodexRequest> {
    return this.service.confirm(id, req.user.userId);
  }

  @Post(':id/retry')
  async retry(@Param('id') id: string, @Req() req: AuthRequest): Promise<CodexRequest> {
    return this.service.requestRetry(id, req.user.userId);
  }
}
