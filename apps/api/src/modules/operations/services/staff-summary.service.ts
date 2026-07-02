import { Injectable } from '@nestjs/common';
import { OperationsService } from '../operations.service';
import {
  DeploymentPanelSummary,
  OperationalHealthSummary,
  StaffDayViewSummary,
  StaffHealthSummary,
  StaffOperationsSummary,
} from '../operations.types';

@Injectable()
export class StaffSummaryService {
  constructor(private readonly operations: OperationsService) {}

  getStaffSummary(): Promise<StaffOperationsSummary> {
    return this.operations.getStaffSummary();
  }

  getStaffHealth(): Promise<StaffHealthSummary> {
    return this.operations.getStaffHealth();
  }

  getOperationalHealth(): Promise<OperationalHealthSummary> {
    return this.operations.getOperationalHealth();
  }

  getDeploymentPanel(): Promise<DeploymentPanelSummary> {
    return this.operations.getDeploymentPanel();
  }

  getStaffDayView(): Promise<StaffDayViewSummary> {
    return this.operations.getStaffDayView();
  }
}
