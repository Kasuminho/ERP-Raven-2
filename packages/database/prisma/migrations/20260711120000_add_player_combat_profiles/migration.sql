CREATE TYPE "PlayerCombatRole" AS ENUM ('FRONTLINE', 'BACKLINE', 'SUPPORT', 'CALLER', 'SCOUT', 'FLEX', 'RESERVE');

CREATE TYPE "PlayerCombatAvailability" AS ENUM ('UNSET', 'WEEKDAYS', 'WEEKENDS', 'DAILY', 'FLEX', 'LOW');

CREATE TYPE "PlayerCombatProfileChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "PlayerCombatProfile" (
  "playerId" TEXT NOT NULL,
  "primaryClass" "PlayerClass" NOT NULL,
  "secondaryClass" "PlayerClass",
  "declaredBuild" TEXT,
  "preferredRole" "PlayerCombatRole",
  "acceptedRoles" "PlayerCombatRole"[] DEFAULT ARRAY[]::"PlayerCombatRole"[],
  "availability" "PlayerCombatAvailability" NOT NULL DEFAULT 'UNSET',
  "publicNote" TEXT,
  "staffNote" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerCombatProfile_pkey" PRIMARY KEY ("playerId")
);

CREATE TABLE "PlayerCombatProfileChangeRequest" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "primaryClass" "PlayerClass",
  "secondaryClass" "PlayerClass",
  "declaredBuild" TEXT,
  "preferredRole" "PlayerCombatRole",
  "acceptedRoles" "PlayerCombatRole"[] DEFAULT ARRAY[]::"PlayerCombatRole"[],
  "availability" "PlayerCombatAvailability",
  "proofImageUrl" TEXT,
  "note" TEXT,
  "status" "PlayerCombatProfileChangeStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerCombatProfileChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerCombatProfile_primaryClass_idx" ON "PlayerCombatProfile"("primaryClass");
CREATE INDEX "PlayerCombatProfile_secondaryClass_idx" ON "PlayerCombatProfile"("secondaryClass");
CREATE INDEX "PlayerCombatProfile_preferredRole_idx" ON "PlayerCombatProfile"("preferredRole");
CREATE INDEX "PlayerCombatProfile_availability_idx" ON "PlayerCombatProfile"("availability");
CREATE INDEX "PlayerCombatProfile_updatedById_idx" ON "PlayerCombatProfile"("updatedById");
CREATE INDEX "PlayerCombatProfileChangeRequest_playerId_status_createdAt_idx" ON "PlayerCombatProfileChangeRequest"("playerId", "status", "createdAt");
CREATE INDEX "PlayerCombatProfileChangeRequest_status_createdAt_idx" ON "PlayerCombatProfileChangeRequest"("status", "createdAt");
CREATE INDEX "PlayerCombatProfileChangeRequest_reviewedById_idx" ON "PlayerCombatProfileChangeRequest"("reviewedById");

ALTER TABLE "PlayerCombatProfile" ADD CONSTRAINT "PlayerCombatProfile_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerCombatProfile" ADD CONSTRAINT "PlayerCombatProfile_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerCombatProfileChangeRequest" ADD CONSTRAINT "PlayerCombatProfileChangeRequest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerCombatProfileChangeRequest" ADD CONSTRAINT "PlayerCombatProfileChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
