CREATE TYPE "EventReserveStatus" AS ENUM ('RESERVE', 'PROMOTION_PENDING', 'PROMOTED', 'DECLINED', 'REMOVED');

ALTER TABLE "Event"
ADD COLUMN "eventSeriesId" TEXT,
ADD COLUMN "seriesOccurrence" INTEGER,
ADD COLUMN "compositionTargets" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "seriesExceptionSkipped" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EventSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "operationalCategory" "EventOperationalCategory" NOT NULL DEFAULT 'BOSS',
    "priority" "WarRoomOperationPriority" NOT NULL DEFAULT 'MEDIUM',
    "dkpReward" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "firstStartsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "intervalWeeks" INTEGER NOT NULL DEFAULT 1,
    "horizonDays" INTEGER NOT NULL DEFAULT 56,
    "exceptionDates" JSONB NOT NULL DEFAULT '[]',
    "compositionTargets" JSONB NOT NULL DEFAULT '[]',
    "pausedAt" TIMESTAMP(3),
    "materializedThrough" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventSeries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventReserveEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "EventReserveStatus" NOT NULL DEFAULT 'RESERVE',
    "promotionRequestedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "promotedAt" TIMESTAMP(3),
    "playerResponseNote" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventReserveEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Event_eventSeriesId_seriesOccurrence_key" ON "Event"("eventSeriesId", "seriesOccurrence");
CREATE INDEX "Event_eventSeriesId_startsAt_idx" ON "Event"("eventSeriesId", "startsAt");
CREATE INDEX "EventSeries_pausedAt_idx" ON "EventSeries"("pausedAt");
CREATE INDEX "EventSeries_firstStartsAt_idx" ON "EventSeries"("firstStartsAt");
CREATE INDEX "EventSeries_createdById_idx" ON "EventSeries"("createdById");
CREATE UNIQUE INDEX "EventReserveEntry_eventId_playerId_key" ON "EventReserveEntry"("eventId", "playerId");
CREATE INDEX "EventReserveEntry_eventId_status_position_idx" ON "EventReserveEntry"("eventId", "status", "position");
CREATE INDEX "EventReserveEntry_playerId_status_idx" ON "EventReserveEntry"("playerId", "status");
CREATE INDEX "EventReserveEntry_createdById_idx" ON "EventReserveEntry"("createdById");
CREATE INDEX "EventReserveEntry_updatedById_idx" ON "EventReserveEntry"("updatedById");

ALTER TABLE "Event" ADD CONSTRAINT "Event_eventSeriesId_fkey" FOREIGN KEY ("eventSeriesId") REFERENCES "EventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventSeries" ADD CONSTRAINT "EventSeries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventReserveEntry" ADD CONSTRAINT "EventReserveEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventReserveEntry" ADD CONSTRAINT "EventReserveEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventReserveEntry" ADD CONSTRAINT "EventReserveEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventReserveEntry" ADD CONSTRAINT "EventReserveEntry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
