import { Injectable } from '@nestjs/common';
import { AuctionStatus, EventStatus, ItemInterestStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { StaffMeetingSummary } from '../operations.types';
import { StaffSummaryService } from './staff-summary.service';

@Injectable()
export class MeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffSummary: StaffSummaryService,
  ) {}

  async getStaffMeetingSummary(): Promise<StaffMeetingSummary> {
    const [day, reviewAuctions, votingInterests, openEvents] = await Promise.all([
      this.staffSummary.getStaffDayView(),
      this.prisma.auction.findMany({
        where: { status: AuctionStatus.PENDING_REVIEW },
        select: { id: true, itemName: true, status: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      }),
      this.prisma.itemInterestPost.findMany({
        where: { status: { in: [ItemInterestStatus.VOTING, ItemInterestStatus.READY_FOR_DELIVERY, ItemInterestStatus.CLOSED] } },
        select: { id: true, title: true, status: true, updatedAt: true, entries: { select: { id: true } } },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      }),
      this.prisma.event.findMany({
        where: { status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] } },
        select: { id: true, name: true, type: true, startsAt: true, status: true },
        orderBy: { startsAt: 'asc' },
        take: 10,
      }),
    ]);

    return {
      ...day,
      reviewAuctions,
      votingInterests: votingInterests.map((post) => ({ ...post, entries: post.entries.length })),
      openEventRows: openEvents,
    };
  }
}
