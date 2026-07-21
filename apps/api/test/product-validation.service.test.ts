import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import {
  ProductValidationAbsenceVisibility,
  ProductValidationInterviewProfile,
} from "@prisma/client";
import {
  CaptureProductValidationWeekDto,
  CreateProductValidationInterviewDto,
} from "../src/modules/product-validation/dto";
import { ProductValidationService } from "../src/modules/product-validation/product-validation.service";

const strictPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

describe("ProductValidationService", () => {
  it("opens the gate only with full interview coverage and four consecutive weeks", async () => {
    const interviews = [
      ProductValidationInterviewProfile.STAFF_LEADERSHIP,
      ProductValidationInterviewProfile.STAFF_EVENTS,
      ProductValidationInterviewProfile.STAFF_LOOT,
      ProductValidationInterviewProfile.PLAYER_VETERAN,
      ProductValidationInterviewProfile.PLAYER_NEW,
      ProductValidationInterviewProfile.PLAYER_ACTIVE,
      ProductValidationInterviewProfile.PLAYER_LOW_ACTIVITY,
      ProductValidationInterviewProfile.PLAYER_ACTIVE,
    ].map((profile, index) => ({
      id: `i${index}`,
      profile,
      rsvpWouldReduceManualCharge: index === 3,
    }));
    const prisma = {
      productValidationInterview: { findMany: async () => interviews },
      productValidationWeek: { findMany: async () => [
        { weekStart: new Date("2026-06-01T00:00:00.000Z") },
        { weekStart: new Date("2026-06-08T00:00:00.000Z") },
        { weekStart: new Date("2026-06-15T00:00:00.000Z") },
        { weekStart: new Date("2026-06-22T00:00:00.000Z") },
      ] },
    };
    const workspace = await new ProductValidationService(
      prisma as never,
      {} as never,
    ).getWorkspace();

    assert.equal(workspace.gate.interviewsReady, true);
    assert.equal(workspace.gate.baselineReady, true);
    assert.equal(workspace.gate.consecutiveWeeks, 4);
    assert.equal(workspace.gate.rsvpValidated, true);
    assert.equal(workspace.status, "READY_FOR_STAFF_DECISION");
    assert.equal(workspace.privacy.storeParticipantIdentity, false);
  });

  it("keeps the gate pending when one player profile is missing", async () => {
    const interviews = [
      ProductValidationInterviewProfile.STAFF_LEADERSHIP,
      ProductValidationInterviewProfile.STAFF_EVENTS,
      ProductValidationInterviewProfile.STAFF_LOOT,
      ProductValidationInterviewProfile.PLAYER_VETERAN,
      ProductValidationInterviewProfile.PLAYER_NEW,
      ProductValidationInterviewProfile.PLAYER_ACTIVE,
      ProductValidationInterviewProfile.PLAYER_ACTIVE,
      ProductValidationInterviewProfile.PLAYER_VETERAN,
    ].map((profile, index) => ({
      id: `i${index}`,
      profile,
      rsvpWouldReduceManualCharge: true,
    }));
    const prisma = {
      productValidationInterview: { findMany: async () => interviews },
      productValidationWeek: { findMany: async () => [
        { weekStart: new Date("2026-06-01T00:00:00.000Z") },
        { weekStart: new Date("2026-06-08T00:00:00.000Z") },
        { weekStart: new Date("2026-06-15T00:00:00.000Z") },
        { weekStart: new Date("2026-06-22T00:00:00.000Z") },
      ] },
    };
    const workspace = await new ProductValidationService(
      prisma as never,
      {} as never,
    ).getWorkspace();

    assert.equal(workspace.gate.playerInterviewCount, 5);
    assert.equal(workspace.gate.playerProfilesCovered.length, 3);
    assert.equal(workspace.gate.interviewsReady, false);
    assert.equal(workspace.status, "COLLECTING_EVIDENCE");
  });

  it("freezes automatic weekly metrics separately from declared Staff time", async () => {
    let created: any;
    const audits: any[] = [];
    const prisma = {
      productValidationWeek: {
        findUnique: async () => null,
        create: async ({ data }: any) => {
          created = data;
          return { id: "week-1", ...data };
        },
      },
      event: {
        count: async () => 3,
        findMany: async () => [
          {
            attendances: [
              { playerId: "p1", attended: true },
              { playerId: "p2", attended: false },
            ],
            rsvps: [{ noShowDetectedAt: new Date() }, { noShowDetectedAt: null }],
          },
        ],
      },
      recruitmentApplication: {
        findMany: async () => [
          {
            convertedAt: new Date("2026-06-02T00:00:00.000Z"),
            convertedPlayer: {
              attendances: [
                { event: { startsAt: new Date("2026-06-03T00:00:00.000Z") } },
              ],
            },
          },
        ],
      },
      staffTask: { count: async () => 2 },
    };
    const service = new ProductValidationService(
      prisma as never,
      { log: async (entry: any) => audits.push(entry) } as never,
    );
    await service.captureWeek("staff-1", {
      weekStart: "2026-06-01",
      expectedAttendance: 5,
      staffConfirmationMinutes: 42,
      note: "Semana regular.",
    });

    assert.equal(created.eventsCreated, 3);
    assert.equal(created.weekStart.toISOString(), "2026-06-01T03:00:00.000Z");
    assert.equal(created.weekEnd.toISOString(), "2026-06-08T03:00:00.000Z");
    assert.equal(created.actualAttendance, 1);
    assert.equal(created.noShows, 1);
    assert.equal(created.staffConfirmationMinutes, 42);
    assert.equal(created.recruitsWithActivity, 1);
    assert.equal(created.singlePersonTasks, 2);
    assert.equal(audits[0].metadata.automaticMetrics, true);
  });

  it("validates bounded anonymized inputs and rejects client extras", async () => {
    const interview = await strictPipe.transform(
      {
        profile: ProductValidationInterviewProfile.PLAYER_NEW,
        channels: ["DISCORD", "WEB"],
        absenceVisibility: ProductValidationAbsenceVisibility.STAFF_ONLY,
        rsvpWouldReduceManualCharge: true,
        summary: "Prefere lembrete curto antes do evento.",
        interviewedAt: "2026-07-20T20:00:00.000Z",
      },
      { type: "body", metatype: CreateProductValidationInterviewDto },
    );
    assert.equal(interview.channels.length, 2);

    await assert.rejects(
      () =>
        strictPipe.transform(
          { weekStart: "2026-07-01", staffConfirmationMinutes: 10, playerId: "secret" },
          { type: "body", metatype: CaptureProductValidationWeekDto },
        ),
      BadRequestException,
    );
  });

  it("rejects a baseline window that does not begin on Monday", async () => {
    const service = new ProductValidationService({} as never, {} as never);
    await assert.rejects(
      () => service.captureWeek("staff-1", {
        weekStart: "2026-06-02",
        staffConfirmationMinutes: 10,
      }),
      BadRequestException,
    );
  });
});
