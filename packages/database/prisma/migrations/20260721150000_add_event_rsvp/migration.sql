CREATE TYPE "EventRsvpStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'DECLINED');
CREATE TYPE "EventRsvpNoteVisibility" AS ENUM ('STAFF_ONLY', 'PLAYER_PUBLIC');

CREATE TABLE "EventRsvp" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" "EventRsvpStatus" NOT NULL,
    "note" TEXT,
    "noteVisibility" "EventRsvpNoteVisibility" NOT NULL DEFAULT 'STAFF_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRsvp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventRsvp_eventId_playerId_key" ON "EventRsvp"("eventId", "playerId");
CREATE INDEX "EventRsvp_eventId_status_idx" ON "EventRsvp"("eventId", "status");
CREATE INDEX "EventRsvp_playerId_updatedAt_idx" ON "EventRsvp"("playerId", "updatedAt");

ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
