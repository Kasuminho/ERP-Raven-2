import { BadRequestException, Injectable } from "@nestjs/common";
import {
  ProductValidationInterviewProfile,
  RecruitmentApplicationStatus,
} from "@prisma/client";
import { PrismaService } from "@database/prisma.service";
import { AuditService } from "../audit/services/audit.service";
import {
  CaptureProductValidationWeekDto,
  CreateProductValidationInterviewDto,
} from "./dto";

const CAMPAIGN_KEY = "G3X-2026-07";
const CAMPAIGN_TIMEZONE = "America/Sao_Paulo";
const STAFF_PROFILES: ProductValidationInterviewProfile[] = [
  ProductValidationInterviewProfile.STAFF_LEADERSHIP,
  ProductValidationInterviewProfile.STAFF_EVENTS,
  ProductValidationInterviewProfile.STAFF_LOOT,
];
const PLAYER_PROFILES: ProductValidationInterviewProfile[] = [
  ProductValidationInterviewProfile.PLAYER_VETERAN,
  ProductValidationInterviewProfile.PLAYER_NEW,
  ProductValidationInterviewProfile.PLAYER_ACTIVE,
  ProductValidationInterviewProfile.PLAYER_LOW_ACTIVITY,
];

@Injectable()
export class ProductValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getWorkspace() {
    const [interviews, weeks] = await Promise.all([
      this.prisma.productValidationInterview.findMany({
        where: { campaignKey: CAMPAIGN_KEY },
        orderBy: { interviewedAt: "desc" },
        include: {
          recordedBy: {
            select: { id: true, discordUsername: true, discordNickname: true },
          },
        },
      }),
      this.prisma.productValidationWeek.findMany({
        where: { campaignKey: CAMPAIGN_KEY },
        orderBy: { weekStart: "asc" },
        include: {
          capturedBy: {
            select: { id: true, discordUsername: true, discordNickname: true },
          },
        },
      }),
    ]);
    const staffProfilesCovered = STAFF_PROFILES.filter((profile) =>
      interviews.some((interview) => interview.profile === profile),
    );
    const playerInterviews = interviews.filter((interview) =>
      PLAYER_PROFILES.includes(interview.profile),
    );
    const playerProfilesCovered = PLAYER_PROFILES.filter((profile) =>
      playerInterviews.some((interview) => interview.profile === profile),
    );
    const interviewsReady =
      staffProfilesCovered.length === STAFF_PROFILES.length &&
      playerInterviews.length >= 5 &&
      playerProfilesCovered.length === PLAYER_PROFILES.length;
    const consecutiveWeeks = this.longestConsecutiveWeekRun(
      weeks.map((week) => week.weekStart),
    );
    const baselineReady = consecutiveWeeks >= 4;
    const rsvpValidated = interviews.some(
      (interview) => interview.rsvpWouldReduceManualCharge,
    );

    return {
      campaignKey: CAMPAIGN_KEY,
      timezone: CAMPAIGN_TIMEZONE,
      status:
        interviewsReady && baselineReady && rsvpValidated
          ? "READY_FOR_STAFF_DECISION"
          : "COLLECTING_EVIDENCE",
      privacy: {
        staffOnly: true,
        storeParticipantIdentity: false,
        storePrivateVoiceOrDmContent: false,
      },
      gate: {
        interviewsReady,
        baselineReady,
        rsvpValidated,
        staffProfilesCovered,
        requiredStaffProfiles: STAFF_PROFILES,
        playerInterviewCount: playerInterviews.length,
        playerProfilesCovered,
        requiredPlayerInterviewMin: 5,
        recommendedPlayerInterviewMax: 8,
        weeksCaptured: weeks.length,
        consecutiveWeeks,
        requiredWeeks: 4,
      },
      interviews,
      weeks,
    };
  }

  async createInterview(
    actorId: string,
    dto: CreateProductValidationInterviewDto,
  ) {
    const interviewedAt = new Date(dto.interviewedAt);
    if (interviewedAt > new Date()) {
      throw new BadRequestException("A entrevista nao pode estar no futuro.");
    }
    const interview = await this.prisma.productValidationInterview.create({
      data: {
        campaignKey: CAMPAIGN_KEY,
        profile: dto.profile,
        channels: [...new Set(dto.channels)],
        absenceVisibility: dto.absenceVisibility,
        rsvpWouldReduceManualCharge: dto.rsvpWouldReduceManualCharge,
        summary: dto.summary.trim(),
        interviewedAt,
        recordedById: actorId,
      },
    });
    await this.audit.log({
      actorId,
      action: "PRODUCT_VALIDATION_INTERVIEW_RECORDED",
      targetType: "ProductValidationInterview",
      targetId: interview.id,
      metadata: {
        campaignKey: CAMPAIGN_KEY,
        profile: interview.profile,
        channels: interview.channels,
        absenceVisibility: interview.absenceVisibility,
        rsvpWouldReduceManualCharge: interview.rsvpWouldReduceManualCharge,
      },
    });
    return interview;
  }

  async captureWeek(
    actorId: string,
    dto: CaptureProductValidationWeekDto,
  ) {
    const calendarStart = new Date(`${dto.weekStart}T00:00:00.000Z`);
    const weekStart = new Date(`${dto.weekStart}T00:00:00.000-03:00`);
    if (Number.isNaN(calendarStart.getTime()) || Number.isNaN(weekStart.getTime())) {
      throw new BadRequestException("Data inicial da semana invalida.");
    }
    if (calendarStart.getUTCDay() !== 1) {
      throw new BadRequestException("A semana precisa iniciar na segunda-feira.");
    }
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (weekEnd > new Date()) {
      throw new BadRequestException("A semana precisa estar encerrada para ser congelada.");
    }
    const existing = await this.prisma.productValidationWeek.findUnique({
      where: {
        campaignKey_weekStart: { campaignKey: CAMPAIGN_KEY, weekStart },
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException("Esta semana ja foi congelada.");
    }

    const [eventsCreated, events, recruits, singlePersonTasks] = await Promise.all([
      this.prisma.event.count({
        where: { createdAt: { gte: weekStart, lt: weekEnd } },
      }),
      this.prisma.event.findMany({
        where: { startsAt: { gte: weekStart, lt: weekEnd } },
        select: {
          id: true,
          attendances: { select: { playerId: true, attended: true } },
          rsvps: { select: { noShowDetectedAt: true } },
        },
      }),
      this.prisma.recruitmentApplication.findMany({
        where: {
          status: RecruitmentApplicationStatus.CONVERTED,
          convertedAt: { gte: weekStart, lt: weekEnd },
          convertedPlayerId: { not: null },
        },
        select: {
          convertedAt: true,
          convertedPlayer: {
            select: {
              attendances: {
                where: {
                  attended: true,
                  event: { startsAt: { gte: weekStart, lt: weekEnd } },
                },
                select: { event: { select: { startsAt: true } } },
              },
            },
          },
        },
      }),
      this.prisma.staffTask.count({
        where: {
          createdAt: { gte: weekStart, lt: weekEnd },
          ownerId: { not: null },
          substituteId: null,
        },
      }),
    ]);
    const actualAttendance = events.reduce(
      (sum, event) =>
        sum + event.attendances.filter((attendance) => attendance.attended).length,
      0,
    );
    const noShows = events.reduce(
      (sum, event) =>
        sum + event.rsvps.filter((rsvp) => rsvp.noShowDetectedAt).length,
      0,
    );
    const recruitsWithActivity = recruits.filter((recruit) =>
      recruit.convertedPlayer?.attendances.some(
        (attendance) =>
          !recruit.convertedAt ||
          attendance.event.startsAt >= recruit.convertedAt,
      ),
    ).length;
    const week = await this.prisma.productValidationWeek.create({
      data: {
        campaignKey: CAMPAIGN_KEY,
        weekStart,
        weekEnd,
        eventsCreated,
        expectedAttendance: dto.expectedAttendance ?? null,
        actualAttendance,
        noShows,
        staffConfirmationMinutes: dto.staffConfirmationMinutes,
        recruitsConverted: recruits.length,
        recruitsWithActivity,
        singlePersonTasks,
        note: dto.note?.trim() || null,
        capturedById: actorId,
      },
    });
    await this.audit.log({
      actorId,
      action: "PRODUCT_VALIDATION_WEEK_CAPTURED",
      targetType: "ProductValidationWeek",
      targetId: week.id,
      metadata: {
        campaignKey: CAMPAIGN_KEY,
        weekStart: dto.weekStart,
        automaticMetrics: true,
        staffConfirmationMinutesDeclared: true,
        expectedAttendanceDeclared: dto.expectedAttendance !== undefined,
      },
    });
    return week;
  }

  private longestConsecutiveWeekRun(weekStarts: Date[]): number {
    const starts = [...new Set(weekStarts.map((date) => date.getTime()))].sort(
      (left, right) => left - right,
    );
    let longest = 0;
    let current = 0;
    let previous: number | null = null;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    for (const start of starts) {
      current = previous !== null && start - previous === weekMs ? current + 1 : 1;
      longest = Math.max(longest, current);
      previous = start;
    }
    return longest;
  }
}
