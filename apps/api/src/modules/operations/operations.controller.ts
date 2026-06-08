import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OperationsService } from './operations.service';
import { PlayerOperationsSummary, StaffHealthSummary, StaffOperationsSummary } from './operations.types';

type AuthRequest = { user: { userId: string } };

@Controller('operations')
@UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(private readonly service: OperationsService) {}

  @Get('me')
  async me(@Req() req: AuthRequest): Promise<PlayerOperationsSummary> {
    return this.service.getPlayerSummary(req.user.userId);
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staff(): Promise<StaffOperationsSummary> {
    return this.service.getStaffSummary();
  }

  @Get('staff/health')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async health(): Promise<StaffHealthSummary> {
    return this.service.getStaffHealth();
  }

  @Get('staff/audit')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async audit(@Query('limit') limit?: string) {
    return this.service.getRecentAudit(Number(limit) || 25);
  }
}

