CREATE TYPE "GuildCaseCategory" AS ENUM ('QUESTION', 'OPERATIONAL_REPORT', 'APPEAL');
CREATE TYPE "GuildCaseSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "GuildCaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'WAITING_PLAYER', 'RESOLVED', 'CLOSED');
CREATE TYPE "GuildCaseEntryKind" AS ENUM ('CREATED', 'PLAYER_MESSAGE', 'STAFF_RESPONSE', 'INTERNAL_NOTE', 'STATUS_CHANGED', 'ASSIGNED');
CREATE TYPE "GuildCaseEntryVisibility" AS ENUM ('PLAYER', 'STAFF');

CREATE TABLE "GuildCase" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "category" "GuildCaseCategory" NOT NULL,
  "severity" "GuildCaseSeverity" NOT NULL DEFAULT 'MEDIUM',
  "status" "GuildCaseStatus" NOT NULL DEFAULT 'OPEN',
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "assignedToId" TEXT,
  "dueAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuildCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuildCaseEntry" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "actorId" TEXT,
  "kind" "GuildCaseEntryKind" NOT NULL,
  "visibility" "GuildCaseEntryVisibility" NOT NULL,
  "bodyPt" TEXT,
  "bodyEn" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuildCaseEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuildCase_playerId_status_createdAt_idx" ON "GuildCase"("playerId", "status", "createdAt");
CREATE INDEX "GuildCase_status_severity_dueAt_idx" ON "GuildCase"("status", "severity", "dueAt");
CREATE INDEX "GuildCase_assignedToId_status_idx" ON "GuildCase"("assignedToId", "status");
CREATE INDEX "GuildCaseEntry_caseId_createdAt_idx" ON "GuildCaseEntry"("caseId", "createdAt");
CREATE INDEX "GuildCaseEntry_actorId_createdAt_idx" ON "GuildCaseEntry"("actorId", "createdAt");

ALTER TABLE "GuildCase" ADD CONSTRAINT "GuildCase_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuildCase" ADD CONSTRAINT "GuildCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuildCaseEntry" ADD CONSTRAINT "GuildCaseEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "GuildCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuildCaseEntry" ADD CONSTRAINT "GuildCaseEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
