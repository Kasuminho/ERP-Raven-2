import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { CodexRequestStatus } from "@prisma/client";
import { CodexService } from "../src/modules/codex/services/codex.service";

const request = (status: CodexRequestStatus) => ({
  id: "codex-1",
  playerId: "player-1",
  imageUrl: "/uploads/codex/request.webp",
  note: null,
  status,
  proofImageUrl: null,
  sentById: null,
  sentAt: null,
  confirmedAt: null,
  retryRequestedAt: null,
  queuedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

test("Codex already SENT cannot be sent again or duplicate the immediate charge", async () => {
  let updates = 0;
  const prisma = {
    codexRequest: {
      findUnique: async () => request(CodexRequestStatus.SENT),
      update: async () => {
        updates += 1;
        return request(CodexRequestStatus.SENT);
      },
    },
  };
  const service = new CodexService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  await assert.rejects(
    () => service.markSent("codex-1", "staff-1", {}),
    BadRequestException,
  );
  assert.equal(updates, 0);
});

test("Codex send remains successful and auditable when the immediate Web notification fails", async () => {
  const audits: any[] = [];
  const pending = request(CodexRequestStatus.PENDING);
  const sent = { ...pending, status: CodexRequestStatus.SENT, sentAt: new Date() };
  const prisma = {
    codexRequest: {
      findUnique: async () => pending,
      update: async () => sent,
    },
    player: {
      findUnique: async () => ({
        nickname: "Aiko",
        user: { discordId: "discord-1" },
      }),
    },
  };
  const service = new CodexService(
    prisma as never,
    { log: async (entry: any) => audits.push(entry) } as never,
    { createForPlayer: async () => { throw new Error("web queue unavailable"); } } as never,
    { notifyPlayerDailyReminder: async () => true } as never,
    {} as never,
  );

  const result = await service.markSent("codex-1", "staff-1", {});

  assert.equal(result.status, CodexRequestStatus.SENT);
  assert.equal(audits.some((entry) => entry.action === "CODEX_REQUEST_SENT"), true);
  assert.equal(
    audits.some((entry) => entry.action === "CODEX_REQUEST_SENT_WEB_NOTIFICATION_FAILED"),
    true,
  );
});
