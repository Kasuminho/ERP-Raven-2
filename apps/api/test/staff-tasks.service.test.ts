import assert from "node:assert/strict";
import { test } from "node:test";
import { LeadershipArea, StaffTaskPriority } from "@prisma/client";
import { StaffTasksService } from "../src/modules/staff-tasks/staff-tasks.service";

test("briefing, meeting, and health stay suggestions until explicit task confirmation", async () => {
  const prisma = {
    staffTask: { findMany: async () => [] },
    user: { findMany: async () => [] },
  };
  const briefing = {
    getStaffMorningBriefing: async () => ({
      sections: [
        {
          tasks: [
            {
              id: "b1",
              type: "EVENT_ALERT",
              title: "Revisar evento",
              description: "Contexto",
              href: "/dashboard/admin/events",
              priority: "high",
            },
          ],
        },
      ],
    }),
  };
  const meeting = {
    getStaffMeetingSummary: async () => ({
      sections: [
        {
          items: [
            {
              id: "m1",
              meetingItemKey: "day:m1",
              resolved: false,
              type: "RECRUIT",
              title: "Revisar recruit",
              description: "Contexto",
              href: "/dashboard/staff/recruitment",
              priority: "medium",
            },
          ],
        },
      ],
    }),
  };
  const health = {
    getSignals: async () => ({
      signals: [
        {
          key: "s1",
          subjectLabel: "Aiko",
          explanation: "Queda",
          recommendedAction: "Conversar",
          href: "/dashboard/staff/players/p1",
        },
      ],
    }),
  };
  const result = await new StaffTasksService(
    prisma as never,
    {} as never,
    briefing as never,
    meeting as never,
    health as never,
  ).getWorkspace();
  assert.equal(result.tasks.length, 0);
  assert.equal(result.suggestions.length, 3);
  assert.equal(result.suggestionsRequireConfirmation, true);
  assert.equal(result.automaticTaskCreation, false);
});

test("confirmed task persists owner, substitute, deadline, deep link, and audit source", async () => {
  let data: any;
  const audits: any[] = [];
  const prisma = {
    user: { findFirst: async ({ where }: any) => ({ id: where.id }) },
    staffTask: {
      create: async ({ data: input }: any) => {
        data = input;
        return { id: "t1", ...input, handoffs: [] };
      },
    },
  };
  const service = new StaffTasksService(
    prisma as never,
    { log: async (entry: any) => audits.push(entry) } as never,
    {} as never,
    {} as never,
    {} as never,
  );
  await service.create("creator", {
    title: "Preparar evento",
    description: "Revisar composicao.",
    area: LeadershipArea.EVENTS,
    priority: StaffTaskPriority.HIGH,
    ownerId: "u1",
    substituteId: "u2",
    dueAt: "2026-08-01T12:00:00.000Z",
    href: "/dashboard/admin/events",
    sourceType: "BRIEFING",
    sourceKey: "BRIEFING:b1",
  });
  assert.equal(data.ownerId, "u1");
  assert.equal(data.substituteId, "u2");
  assert.equal(audits[0].metadata.createdByConfirmation, true);
  assert.equal(audits[0].metadata.automaticCreation, false);
});

test("handoff records final context and next step before transferring ownership", async () => {
  const events: string[] = [];
  const prisma = {
    user: { findFirst: async () => ({ id: "u2" }) },
    staffTask: { findUnique: async () => ({ id: "t1" }) },
    $transaction: async (callback: any) =>
      callback({
        staffTaskHandoff: {
          create: async ({ data }: any) => {
            events.push(`handoff:${data.context}:${data.nextStep}`);
            return { id: "h1", ...data };
          },
        },
        staffTask: {
          update: async ({ data }: any) => {
            events.push(`owner:${data.ownerId}`);
          },
        },
      }),
  };
  const service = new StaffTasksService(
    prisma as never,
    { log: async () => ({}) } as never,
    {} as never,
    {} as never,
    {} as never,
  );
  await service.handoff("u1", "t1", {
    context: "Boss configurado.",
    nextStep: "Publicar chamada.",
    toOwnerId: "u2",
  });
  assert.deepEqual(events, [
    "handoff:Boss configurado.:Publicar chamada.",
    "owner:u2",
  ]);
});
