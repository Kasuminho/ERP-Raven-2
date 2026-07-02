import { Injectable } from '@nestjs/common';
import { OperationsService } from '../operations.service';
import { StaffMorningBriefing } from '../operations.types';

@Injectable()
export class OperationalBriefingService {
  constructor(private readonly operations: OperationsService) {}

  getStaffMorningBriefing(): Promise<StaffMorningBriefing> {
    return this.operations.getStaffMorningBriefing();
  }
}
