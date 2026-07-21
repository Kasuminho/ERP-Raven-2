import assert from "node:assert/strict";
import { test } from "node:test";
import { LeadershipArea } from "@prisma/client";
import { StaffAutomationService } from "../src/modules/staff-automation/staff-automation.service";

test("only patterns with at least three completed tasks become proposals", async () => {
  const repeated = [1, 2, 3].map((id) => ({
    id: String(id),
    sourceType: "BRIEFING",
    area: LeadershipArea.EVENTS,
    title: "Revisar evento",
    description: "Contexto",
    href: "/dashboard/admin/events",
  }));
  const prisma = {
    staffAutomationRule: { findMany: async () => [] },
    staffTask: {
      findMany: async () => [
        ...repeated,
        {
          ...repeated[0],
          id: "4",
          sourceType: "MEETING",
          area: LeadershipArea.LOOT,
        },
      ],
    },
  };
  const result = await new StaffAutomationService(
    prisma as never,
    {} as never,
  ).getWorkspace();
  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0].observedCount, 3);
  assert.deepEqual(result.forbiddenActions, [
    "APPROVE_LOOT",
    "REMOVE_PLAYER",
    "CHANGE_SOCIAL_POLICY",
  ]);
});

test("dry-run persists disabled rule and activation requires explicit confirmation", async () => {
  const audits: any[] = [];
  let enabled = false;
  const rule = {
    id: "r1",
    sourcePattern: "BRIEFING:EVENTS",
    action: "CREATE_STAFF_TASK",
    killSwitch: false,
  };
  const prisma = {
    staffTask: { count: async () => 3 },
    staffAutomationRule: {
      create: async ({ data }: any) => ({ ...rule, ...data, enabled: false }),
      findUnique: async () => ({ ...rule, enabled }),
      update: async ({ data }: any) => ({
        ...rule,
        ...data,
        enabled: (enabled = data.enabled),
      }),
    },
  };
  const service = new StaffAutomationService(
    prisma as never,
    { log: async (entry: any) => audits.push(entry) } as never,
  );
  const draft = await service.createDryRun("actor", {
    name: "Rotina eventos",
    sourcePattern: "BRIEFING:EVENTS",
    taskTitle: "Revisar evento",
    taskDescription: "Abra e revise.",
    taskArea: LeadershipArea.EVENTS,
    taskHref: "/dashboard/admin/events",
    frequencyMinutes: 1440,
    maxRunsPerDay: 1,
  });
  assert.equal(draft.enabled, false);
  await assert.rejects(
    () => service.activate("actor", "r1", false),
    /confirmation/,
  );
  const active = await service.activate("actor", "r1", true);
  assert.equal(active.enabled, true);
  assert.equal(audits[0].metadata.enabled, false);
});

test("executor creates only a Staff task with idempotency metadata", async () => {
  const created: any[] = [];
  const rule = {
    id: "r1",
    name: "Rotina",
    action: "CREATE_STAFF_TASK",
    sourcePattern: "BRIEFING:EVENTS",
    taskTitle: "Revisar evento",
    taskDescription: "Contexto",
    taskArea: LeadershipArea.EVENTS,
    taskHref: "/dashboard/admin/events",
    frequencyMinutes: 60,
    maxRunsPerDay: 1,
    enabled: true,
    killSwitch: false,
    lastRunAt: null,
    createdById: "actor",
  };
  const prisma = {
    staffAutomationRule: { findMany: async () => [rule] },
    staffAutomationRun: { count: async () => 0 },
    $transaction: async (callback: any) =>
      callback({
        staffTask: {
          create: async ({ data }: any) => {
            created.push(data);
            return { id: "t1", ...data };
          },
        },
        staffAutomationRun: {
          create: async ({ data }: any) => created.push(data),
        },
        staffAutomationRule: { update: async () => ({}) },
      }),
  };
  await new StaffAutomationService(
    prisma as never,
    { log: async () => ({}) } as never,
  ).executeDue(new Date("2026-08-01T12:00:00.000Z"));
  assert.equal(created[0].sourceType, "STAFF_AUTOMATION");
  assert.match(created[0].sourceKey, /^AUTOMATION:r1:/);
  assert.equal(created[0].ownerId, undefined);
});
