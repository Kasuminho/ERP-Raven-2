import { Injectable } from '@nestjs/common';
import { AnnouncementStatus, EventStatus, ProgressReviewStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
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
  constructor(
    private readonly operations: OperationsService,
    private readonly prisma: PrismaService,
  ) {}

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

  async getStaffDayView(): Promise<StaffDayViewSummary> {
    const staff = await this.getStaffSummary();
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [todaysAnnouncements, openEvents, pendingProgressReviews] = await Promise.all([
      this.prisma.announcement.count({
        where: { status: AnnouncementStatus.ACTIVE, eventTime: { gte: start, lt: end } },
      }),
      this.prisma.event.count({
        where: { status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] }, startsAt: { gte: start, lt: end } },
      }),
      this.prisma.playerProgress.count({ where: { reviewStatus: ProgressReviewStatus.PENDING } }),
    ]);

    return {
      generatedAt: now,
      todaysAnnouncements,
      openEvents,
      pendingStaffVotes: staff.counts.reviews + staff.counts.interests,
      pendingDeliveries: staff.counts.deliveries,
      pendingProgressReviews,
      urgentTasks: staff.tasks.filter((task) => task.priority !== 'low').slice(0, 10),
    };
  }
}
