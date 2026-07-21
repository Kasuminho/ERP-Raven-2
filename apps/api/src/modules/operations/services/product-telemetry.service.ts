import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

type StatusCount = { status: string; count: number };

export type ProductTelemetrySummary = {
  generatedAt: Date;
  window: { days: number; from: Date; to: Date };
  privacy: {
    aggregationOnly: true;
    containsPlayerIdentity: false;
    containsPrivateText: false;
  };
  recruitment: {
    applications: number;
    statuses: StatusCount[];
    reviewed: number;
    converted: number;
    averageReviewHours: number | null;
    averageConversionHours: number | null;
  };
  onboarding: {
    started: number;
    completed: number;
    completionRatePercent: number;
    averageCompletionHours: number | null;
  };
  commitments: {
    events: number;
    responses: number;
    statuses: StatusCount[];
    averageResponseLeadHours: number | null;
  };
  staffWork: {
    created: number;
    completed: number;
    statuses: StatusCount[];
    averageCompletionHours: number | null;
  };
  lootOperations: {
    auctionsCreated: number;
    auctionStatuses: StatusCount[];
    auctionDeliveries: number;
    averageAuctionDeliveryHours: number | null;
    itemRequestsCreated: number;
    itemRequestsFulfilled: number;
    interestsCreated: number;
    interestStatuses: StatusCount[];
  };
};

@Injectable()
export class ProductTelemetryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(days = 30, now = new Date()): Promise<ProductTelemetrySummary> {
    const safeDays = Math.min(90, Math.max(7, Math.trunc(days) || 30));
    const from = new Date(now.getTime() - safeDays * 24 * 60 * 60 * 1000);
    const [applications, onboardingPlans, staffTasks, events, auctions, itemRequests, interests] = await Promise.all([
      this.prisma.recruitmentApplication.findMany({
        where: { createdAt: { gte: from, lte: now } },
        select: { status: true, createdAt: true, reviewedAt: true, convertedAt: true },
      }),
      this.prisma.playerOnboardingPlan.findMany({
        where: { startedAt: { gte: from, lte: now } },
        select: { startedAt: true, completedAt: true },
      }),
      this.prisma.staffTask.findMany({
        where: { createdAt: { gte: from, lte: now } },
        select: { status: true, createdAt: true, completedAt: true },
      }),
      this.prisma.event.findMany({
        where: { startsAt: { gte: from, lte: now } },
        select: {
          startsAt: true,
          rsvps: { select: { status: true, createdAt: true } },
        },
      }),
      this.prisma.auction.findMany({
        where: { createdAt: { gte: from, lte: now } },
        select: {
          status: true,
          createdAt: true,
          dropHistory: { select: { deliveredAt: true } },
        },
      }),
      this.prisma.itemRequest.findMany({
        where: { createdAt: { gte: from, lte: now } },
        select: { remainingQuantity: true },
      }),
      this.prisma.itemInterestPost.findMany({
        where: { createdAt: { gte: from, lte: now } },
        select: { status: true },
      }),
    ]);

    const rsvps = events.flatMap((event) => event.rsvps.map((rsvp) => ({ ...rsvp, startsAt: event.startsAt })));
    const deliveredAuctions = auctions.filter((auction) => auction.dropHistory?.deliveredAt);

    return {
      generatedAt: now,
      window: { days: safeDays, from, to: now },
      privacy: {
        aggregationOnly: true,
        containsPlayerIdentity: false,
        containsPrivateText: false,
      },
      recruitment: {
        applications: applications.length,
        statuses: this.countStatuses(applications),
        reviewed: applications.filter((application) => application.reviewedAt).length,
        converted: applications.filter((application) => application.convertedAt).length,
        averageReviewHours: this.averageHours(applications, (row) => row.createdAt, (row) => row.reviewedAt),
        averageConversionHours: this.averageHours(applications, (row) => row.createdAt, (row) => row.convertedAt),
      },
      onboarding: {
        started: onboardingPlans.length,
        completed: onboardingPlans.filter((plan) => plan.completedAt).length,
        completionRatePercent: this.percent(onboardingPlans.filter((plan) => plan.completedAt).length, onboardingPlans.length),
        averageCompletionHours: this.averageHours(onboardingPlans, (row) => row.startedAt, (row) => row.completedAt),
      },
      commitments: {
        events: events.length,
        responses: rsvps.length,
        statuses: this.countStatuses(rsvps),
        averageResponseLeadHours: this.averagePositiveHours(rsvps.map((row) => row.startsAt.getTime() - row.createdAt.getTime())),
      },
      staffWork: {
        created: staffTasks.length,
        completed: staffTasks.filter((task) => task.completedAt).length,
        statuses: this.countStatuses(staffTasks),
        averageCompletionHours: this.averageHours(staffTasks, (row) => row.createdAt, (row) => row.completedAt),
      },
      lootOperations: {
        auctionsCreated: auctions.length,
        auctionStatuses: this.countStatuses(auctions),
        auctionDeliveries: deliveredAuctions.length,
        averageAuctionDeliveryHours: this.averageHours(deliveredAuctions, (row) => row.createdAt, (row) => row.dropHistory?.deliveredAt),
        itemRequestsCreated: itemRequests.length,
        itemRequestsFulfilled: itemRequests.filter((request) => request.remainingQuantity === 0).length,
        interestsCreated: interests.length,
        interestStatuses: this.countStatuses(interests),
      },
    };
  }

  private countStatuses(rows: Array<{ status: unknown }>): StatusCount[] {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const status = String(row.status);
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => ({ status, count }));
  }

  private averageHours<T>(rows: T[], start: (row: T) => Date, end: (row: T) => Date | null | undefined): number | null {
    return this.averagePositiveHours(rows.map((row) => {
      const endedAt = end(row);
      return endedAt ? endedAt.getTime() - start(row).getTime() : -1;
    }));
  }

  private averagePositiveHours(durationsMs: number[]): number | null {
    const valid = durationsMs.filter((duration) => duration >= 0);
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((sum, duration) => sum + duration, 0) / valid.length / 3_600_000) * 10) / 10;
  }

  private percent(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
  }
}
