import assert from "node:assert/strict";
import { test } from "node:test";
import { LeadershipArea } from "@prisma/client";
import { StaffCoverageService } from "../src/modules/staff-coverage/staff-coverage.service";

test("coverage escalates to backup only for a current declared unavailability", async () => {
  const now = new Date();
  const primary = {
    id: "primary",
    discordUsername: "primario",
    discordNickname: null,
  };
  const backup = {
    id: "backup",
    discordUsername: "backup",
    discordNickname: null,
  };
  const prisma = {
    staffAreaCoverage: {
      findMany: async () => [
        {
          id: "c1",
          area: LeadershipArea.EVENTS,
          primaryUserId: primary.id,
          backupUserId: backup.id,
          primaryUser: primary,
          backupUser: backup,
          onCallStartsAt: "18:00",
          onCallEndsAt: "23:00",
          timezone: "America/Sao_Paulo",
        },
      ],
    },
    user: { findMany: async () => [primary, backup] },
    staffAvailabilityPeriod: {
      findMany: async () => [
        {
          id: "a1",
          userId: primary.id,
          startsAt: new Date(now.getTime() - 60_000),
          endsAt: new Date(now.getTime() + 60_000),
          reason: null,
          user: primary,
        },
      ],
    },
  };
  const result = await new StaffCoverageService(
    prisma as never,
    {} as never,
  ).getWorkspace(primary.id);
  const events = result.coverage.find(
    (item) => item.area === LeadershipArea.EVENTS,
  )!;
  assert.equal(events.effectiveResponsible?.id, backup.id);
  assert.equal(events.escalationReason, "DECLARED_UNAVAILABILITY");
  assert.equal(result.silenceNeverTriggersEscalation, true);
  assert.equal(result.permissionsSeparateFromResponsibility, true);
  assert.equal(result.declaredUnavailability[0].isMine, true);
});

test("saving coverage audits that responsibility does not change permissions", async () => {
  const audits: any[] = [];
  const prisma = {
    user: { findFirst: async ({ where }: any) => ({ id: where.id }) },
    staffAreaCoverage: {
      upsert: async ({ create }: any) => ({ id: "c1", ...create }),
    },
  };
  const service = new StaffCoverageService(
    prisma as never,
    { log: async (entry: any) => audits.push(entry) } as never,
  );
  await service.upsert("actor", {
    area: LeadershipArea.LOOT,
    primaryUserId: "p1",
    backupUserId: "p2",
    onCallStartsAt: "19:00",
    onCallEndsAt: "23:30",
    timezone: "America/Sao_Paulo",
  });
  assert.equal(audits[0].metadata.permissionChanged, false);
  assert.equal(audits[0].metadata.primaryUserId, "p1");
  assert.equal(audits[0].metadata.backupUserId, "p2");
});

test("declared unavailability rejects inverted dates", async () => {
  const prisma = { user: { findFirst: async () => ({ id: "actor" }) } };
  const service = new StaffCoverageService(prisma as never, {} as never);
  await assert.rejects(
    () =>
      service.declareUnavailable("actor", {
        startsAt: "2026-08-02T00:00:00.000Z",
        endsAt: "2026-08-01T00:00:00.000Z",
      }),
    /after start/,
  );
});
