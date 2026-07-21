CREATE TYPE "PlayerTrialStatus" AS ENUM ('ACTIVE', 'EXTENDED', 'APPROVED', 'CLOSED');
CREATE TYPE "PlayerTrialDecisionType" AS ENUM ('APPROVE', 'EXTEND', 'CLOSE');

CREATE TABLE "PlayerTrial" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "objectivePt" TEXT NOT NULL,
  "objectiveEn" TEXT NOT NULL,
  "plannedStartAt" TIMESTAMP(3) NOT NULL,
  "plannedEndAt" TIMESTAMP(3) NOT NULL,
  "status" "PlayerTrialStatus" NOT NULL DEFAULT 'ACTIVE',
  "decisionType" "PlayerTrialDecisionType",
  "decisionReasonPt" TEXT,
  "decisionReasonEn" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "decidedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerTrial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerTrialCriterion" (
  "id" TEXT NOT NULL,
  "trialId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "titlePt" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "descriptionPt" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerTrialCriterion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerTrialCheckIn" (
  "id" TEXT NOT NULL,
  "trialId" TEXT NOT NULL,
  "day" INTEGER NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "bodyPt" TEXT,
  "bodyEn" TEXT,
  "internalNote" TEXT,
  "authorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerTrialCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerTrial_playerId_status_plannedStartAt_idx" ON "PlayerTrial"("playerId", "status", "plannedStartAt");
CREATE INDEX "PlayerTrial_status_plannedEndAt_idx" ON "PlayerTrial"("status", "plannedEndAt");
CREATE INDEX "PlayerTrial_createdById_idx" ON "PlayerTrial"("createdById");
CREATE INDEX "PlayerTrial_decidedById_idx" ON "PlayerTrial"("decidedById");
CREATE UNIQUE INDEX "PlayerTrialCriterion_trialId_key_key" ON "PlayerTrialCriterion"("trialId", "key");
CREATE UNIQUE INDEX "PlayerTrialCriterion_trialId_displayOrder_key" ON "PlayerTrialCriterion"("trialId", "displayOrder");
CREATE INDEX "PlayerTrialCriterion_trialId_displayOrder_idx" ON "PlayerTrialCriterion"("trialId", "displayOrder");
CREATE UNIQUE INDEX "PlayerTrialCheckIn_trialId_day_key" ON "PlayerTrialCheckIn"("trialId", "day");
CREATE INDEX "PlayerTrialCheckIn_scheduledAt_completedAt_idx" ON "PlayerTrialCheckIn"("scheduledAt", "completedAt");
CREATE INDEX "PlayerTrialCheckIn_authorId_idx" ON "PlayerTrialCheckIn"("authorId");

ALTER TABLE "PlayerTrial" ADD CONSTRAINT "PlayerTrial_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerTrial" ADD CONSTRAINT "PlayerTrial_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerTrial" ADD CONSTRAINT "PlayerTrial_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerTrialCriterion" ADD CONSTRAINT "PlayerTrialCriterion_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "PlayerTrial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerTrialCheckIn" ADD CONSTRAINT "PlayerTrialCheckIn_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "PlayerTrial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerTrialCheckIn" ADD CONSTRAINT "PlayerTrialCheckIn_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
