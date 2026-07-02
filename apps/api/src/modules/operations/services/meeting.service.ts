import { Injectable } from '@nestjs/common';
import { OperationsService } from '../operations.service';
import { StaffMeetingSummary } from '../operations.types';

@Injectable()
export class MeetingService {
  constructor(private readonly operations: OperationsService) {}

  getStaffMeetingSummary(): Promise<StaffMeetingSummary> {
    return this.operations.getStaffMeetingSummary();
  }
}
