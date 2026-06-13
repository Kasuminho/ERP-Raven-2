import { Controller, Get, HttpCode } from '@nestjs/common';
import { HealthReport } from '../health.types';
import { HealthService } from '../services/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(200)
  getHealth(): Promise<HealthReport> {
    return this.healthService.getReport();
  }
}
