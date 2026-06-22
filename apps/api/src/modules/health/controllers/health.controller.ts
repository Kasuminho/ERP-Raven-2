import { Controller, Get, HttpCode, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { HealthReport, HealthState } from '../health.types';
import { HealthService } from '../services/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(200)
  async getHealth(): Promise<{ status: HealthState; checkedAt: string; version: string }> {
    const report = await this.healthService.getReport();
    return {
      status: report.status,
      checkedAt: report.checkedAt,
      version: process.env.APP_VERSION ?? 'development',
    };
  }

  @Get('details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  getDetails(): Promise<HealthReport> {
    return this.healthService.getReport();
  }
}
