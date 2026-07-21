CREATE TYPE "EventReminderChannel" AS ENUM ('WEB', 'DISCORD', 'BOTH', 'NONE');

ALTER TABLE "Player"
ADD COLUMN "eventReminderChannel" "EventReminderChannel" NOT NULL DEFAULT 'WEB';

ALTER TABLE "EventRsvp"
ADD COLUMN "noShowDetectedAt" TIMESTAMP(3),
ADD COLUMN "noShowJustification" TEXT,
ADD COLUMN "noShowJustifiedAt" TIMESTAMP(3);

CREATE TABLE "EventReminderDelivery" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "rsvpStatus" TEXT,
  "webNotifiedAt" TIMESTAMP(3),
  "discordClaimedAt" TIMESTAMP(3),
  "discordNotifiedAt" TIMESTAMP(3),
  "discordAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastDiscordError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventReminderDelivery_eventId_playerId_key" ON "EventReminderDelivery"("eventId", "playerId");
CREATE INDEX "EventReminderDelivery_playerId_createdAt_idx" ON "EventReminderDelivery"("playerId", "createdAt");
CREATE INDEX "EventReminderDelivery_discordNotifiedAt_discordClaimedAt_idx" ON "EventReminderDelivery"("discordNotifiedAt", "discordClaimedAt");

ALTER TABLE "EventReminderDelivery"
ADD CONSTRAINT "EventReminderDelivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventReminderDelivery"
ADD CONSTRAINT "EventReminderDelivery_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
