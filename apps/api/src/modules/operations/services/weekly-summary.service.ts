import { Injectable } from '@nestjs/common';
import { OperationsService } from '../operations.service';
import { SeasonMonthlySummary, WeeklyGuildSummary } from '../operations.types';

@Injectable()
export class WeeklySummaryService {
  constructor(private readonly operations: OperationsService) {}

  getSeasonSummary(month?: string): Promise<SeasonMonthlySummary> {
    return this.operations.getSeasonSummary(month);
  }

  getWeeklySummary(): Promise<WeeklyGuildSummary> {
    return this.operations.getWeeklySummary();
  }

  postWeeklySummary(): Promise<{ posted: boolean; summary: WeeklyGuildSummary }> {
    return this.operations.postWeeklySummary();
  }
}
