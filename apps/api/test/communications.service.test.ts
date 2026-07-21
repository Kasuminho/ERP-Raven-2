import assert from "node:assert/strict";
import { test } from "node:test";
import { CommunicationsService } from "../src/modules/communications/communications.service";

function service(prisma: any, discord: any = {}) {
  return new CommunicationsService(
    prisma as never,
    {} as never,
    discord as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

test("personal digest queries only the authenticated user/player and groups repeated object changes", async () => {
  let where: any;
  const prisma = {
    player: { findFirst: async () => ({ id: "p1" }) },
    notification: {
      findMany: async (args: any) => {
        where = args.where;
        return [
          {
            id: "n1",
            userId: null,
            playerId: "p1",
            type: "EVENT",
            title: "Evento mudou",
            body: "A",
            href: "/dashboard/attendance",
            metadata: {},
            createdAt: new Date(),
            readAt: null,
          },
          {
            id: "n2",
            userId: null,
            playerId: "p1",
            type: "EVENT",
            title: "Evento mudou",
            body: "B",
            href: "/dashboard/attendance",
            metadata: {},
            createdAt: new Date(),
            readAt: null,
          },
        ];
      },
    },
  };
  const digest = await service(prisma).getDigest("u1");
  assert.deepEqual(where.OR, [{ userId: "u1" }, { playerId: "p1" }]);
  assert.equal(digest.items.length, 1);
  assert.equal(digest.items[0].count, 2);
  assert.equal(digest.thirdPartyDataIncluded, false);
});

test("mirrored Discord commands register RSVP, absence, instruction, and rule actions", () => {
  let names: string[] = [];
  const discord = {
    registerMirroredCommands: (commands: any[]) => {
      names = commands.map((command) => command.name);
    },
  };
  service({}, discord).onModuleInit();
  assert.deepEqual(names, [
    "erp-rsvp",
    "erp-ausencia",
    "erp-instrucao",
    "erp-regra",
  ]);
});

test("quiet hours require a complete interval", async () => {
  const prisma = { player: { findFirst: async () => ({ id: "p1" }) } };
  await assert.rejects(
    () =>
      service(prisma).updateMine("u1", {
        eventChannel: "WEB",
        ownLootChannel: "WEB",
        requestChannel: "WEB",
        progressChannel: "WEB",
        announcementChannel: "WEB",
        reminderChannel: "WEB",
        quietStartsAt: "22:00",
        timezone: "America/Sao_Paulo",
        digestCadence: "DAILY",
        criticalBypassesQuietHours: true,
      } as never),
    /both start and end/,
  );
});
