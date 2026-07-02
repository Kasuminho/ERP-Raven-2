import { Injectable } from '@nestjs/common';
import { OperationsService } from '../operations.service';
import { IntegritySummary, LegacyAuditSummary } from '../operations.types';

@Injectable()
export class IntegrityService {
  constructor(private readonly operations: OperationsService) {}

  getIntegritySummary(): Promise<IntegritySummary> {
    return this.operations.getIntegritySummary();
  }

  getLegacyAudit(): Promise<LegacyAuditSummary> {
    return this.operations.getLegacyAudit();
  }
}
