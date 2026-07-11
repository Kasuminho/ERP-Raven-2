-- Add optional operational planning metadata to events without changing legacy event semantics.
CREATE TYPE "EventOperationalCategory" AS ENUM ('BOSS', 'ABYSS', 'GUILD_RAID', 'FARM', 'TRAINING', 'CLASH', 'CUSTOM');

ALTER TABLE "Event"
  ADD COLUMN "operationalCategory" "EventOperationalCategory" NOT NULL DEFAULT 'BOSS',
  ADD COLUMN "priority" "WarRoomOperationPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "endsAt" TIMESTAMP(3),
  ADD COLUMN "responsibleUserId" TEXT,
  ADD COLUMN "checklist" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "operationalNotes" TEXT;

CREATE INDEX "Event_operationalCategory_idx" ON "Event"("operationalCategory");
CREATE INDEX "Event_priority_idx" ON "Event"("priority");
CREATE INDEX "Event_endsAt_idx" ON "Event"("endsAt");
CREATE INDEX "Event_responsibleUserId_idx" ON "Event"("responsibleUserId");
