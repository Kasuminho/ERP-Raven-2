ALTER TABLE "Notification"
ADD COLUMN "deduplicationKey" TEXT;

CREATE UNIQUE INDEX "Notification_deduplicationKey_key" ON "Notification"("deduplicationKey");

CREATE TABLE "PlayerReminderDelivery" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "reminderDate" TEXT NOT NULL,
    "signals" JSONB NOT NULL,
    "webNotifiedAt" TIMESTAMP(3),
    "discordClaimedAt" TIMESTAMP(3),
    "discordNotifiedAt" TIMESTAMP(3),
    "discordAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastDiscordError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerReminderDelivery_playerId_reminderDate_key" ON "PlayerReminderDelivery"("playerId", "reminderDate");
CREATE INDEX "PlayerReminderDelivery_reminderDate_idx" ON "PlayerReminderDelivery"("reminderDate");
CREATE INDEX "PlayerReminderDelivery_discordNotifiedAt_discordClaimedAt_idx" ON "PlayerReminderDelivery"("discordNotifiedAt", "discordClaimedAt");

ALTER TABLE "PlayerReminderDelivery"
ADD CONSTRAINT "PlayerReminderDelivery_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
