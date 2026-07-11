CREATE TYPE "WarRoomOperationType" AS ENUM ('CLASH', 'ANCIENT_FORTRESS', 'ABYSS', 'GUILD_RAID', 'CUSTOM');

CREATE TYPE "WarRoomOperationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSED', 'CANCELLED');

CREATE TYPE "WarRoomOperationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "WarRoomOperation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "WarRoomOperationType" NOT NULL,
  "status" "WarRoomOperationStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" "WarRoomOperationPriority" NOT NULL DEFAULT 'MEDIUM',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "mapRegion" TEXT,
  "objective" TEXT,
  "staffNotes" TEXT,
  "result" TEXT,
  "internalLinks" JSONB NOT NULL DEFAULT '[]',
  "eventId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WarRoomOperation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WarRoomOperation_type_idx" ON "WarRoomOperation"("type");
CREATE INDEX "WarRoomOperation_status_idx" ON "WarRoomOperation"("status");
CREATE INDEX "WarRoomOperation_priority_idx" ON "WarRoomOperation"("priority");
CREATE INDEX "WarRoomOperation_startsAt_idx" ON "WarRoomOperation"("startsAt");
CREATE INDEX "WarRoomOperation_endsAt_idx" ON "WarRoomOperation"("endsAt");
CREATE INDEX "WarRoomOperation_eventId_idx" ON "WarRoomOperation"("eventId");
CREATE INDEX "WarRoomOperation_createdById_idx" ON "WarRoomOperation"("createdById");

ALTER TABLE "WarRoomOperation" ADD CONSTRAINT "WarRoomOperation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarRoomOperation" ADD CONSTRAINT "WarRoomOperation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
