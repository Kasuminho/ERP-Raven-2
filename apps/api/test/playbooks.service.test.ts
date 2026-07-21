import assert from "node:assert/strict";
import { test } from "node:test";
import { PlaybooksService } from "../src/modules/playbooks/playbooks.service";

test("assignment requires exactly one canonical operation or event", async () => {
  const service = new PlaybooksService({} as never, {} as never, {} as never);
  await assert.rejects(
    () => service.assign("actor", { versionId: "v1" }),
    /exactly one/,
  );
  await assert.rejects(
    () =>
      service.assign("actor", {
        versionId: "v1",
        eventId: "e1",
        operationId: "o1",
      }),
    /exactly one/,
  );
});

test("player receives only public bilingual brief and own role instruction", async () => {
  const prisma = {
    player: {
      findFirst: async () => ({
        id: "p1",
        combatProfile: { preferredRole: "SUPPORT" },
      }),
    },
    guildPlaybookAssignment: {
      findMany: async () => [
        {
          id: "a1",
          assignedAt: new Date(),
          event: null,
          operation: {
            id: "o1",
            name: "Clash",
            startsAt: new Date(),
            rosterSlots: [{ role: "SUPPORT" }],
          },
          receipts: [],
          version: {
            version: 2,
            objectivePt: "Objetivo",
            objectiveEn: "Objective",
            publicBriefPt: "Publico",
            publicBriefEn: "Public",
            staffNotes: "SEGREDO",
            playbook: { title: "Clash" },
            roleInstructions: [
              {
                roleKey: "SUPPORT",
                titlePt: "Cura",
                titleEn: "Heal",
                bodyPt: "Cure o grupo",
                bodyEn: "Heal the group",
              },
              {
                roleKey: "CALLER",
                titlePt: "Interno",
                titleEn: "Internal",
                bodyPt: "Nao mostrar",
                bodyEn: "Do not show",
              },
            ],
          },
        },
      ],
    },
  };
  const result = await new PlaybooksService(
    prisma as never,
    {} as never,
    {} as never,
  ).getMine("u1");
  assert.equal(result.assignments[0].instruction?.roleKey, "SUPPORT");
  assert.equal((result.assignments[0] as any).staffNotes, undefined);
  assert.equal(result.staffNotesExposed, false);
  assert.equal(result.assignments[0].instruction?.bodyPt, "Cure o grupo");
});

test("discarded after-action lesson keeps owner and review date without creating a version", async () => {
  let versions = 0;
  const prisma = {
    user: { findUnique: async () => ({ id: "owner" }) },
    guildPlaybookLesson: {
      create: async ({ data }: any) => ({ id: "l1", ...data }),
    },
    guildPlaybookVersion: {
      findFirst: async () => {
        versions += 1;
        return null;
      },
    },
  };
  const audits: any[] = [];
  const service = new PlaybooksService(
    prisma as never,
    { log: async (entry: any) => audits.push(entry) } as never,
    {} as never,
  );
  const lesson = await service.decideLesson("actor", {
    operationId: "o1",
    sourceKey: "wipe",
    title: "Posicionamento",
    lessonPt: "Descartar hipotese",
    lessonEn: "Discard hypothesis",
    disposition: "DISCARD" as never,
    ownerId: "owner",
    reviewAt: "2026-08-10T12:00:00.000Z",
  });
  assert.equal(lesson.promotedVersionId, null);
  assert.equal(versions, 0);
  assert.equal(audits[0].metadata.ownerId, "owner");
});
