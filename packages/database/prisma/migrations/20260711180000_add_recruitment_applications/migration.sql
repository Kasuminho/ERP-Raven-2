CREATE TYPE "RecruitmentApplicationStatus" AS ENUM ('PENDING', 'TRIAGE', 'ACCEPTED', 'REJECTED', 'CONVERTED', 'ARCHIVED');

CREATE TABLE "RecruitmentApplication" (
  "id" TEXT NOT NULL,
  "nickname" TEXT NOT NULL,
  "discordTag" TEXT,
  "playerClass" "PlayerClass" NOT NULL,
  "combatPower" INTEGER NOT NULL,
  "dimensionalLayer" SMALLINT NOT NULL,
  "availability" TEXT NOT NULL,
  "focus" TEXT NOT NULL,
  "experience" TEXT NOT NULL,
  "proofImageUrl" TEXT,
  "notes" TEXT,
  "rulesAccepted" BOOLEAN NOT NULL,
  "status" "RecruitmentApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "convertedById" TEXT,
  "convertedPlayerId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecruitmentApplication_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RecruitmentApplication"
  ADD CONSTRAINT "RecruitmentApplication_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecruitmentApplication"
  ADD CONSTRAINT "RecruitmentApplication_convertedById_fkey"
  FOREIGN KEY ("convertedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecruitmentApplication"
  ADD CONSTRAINT "RecruitmentApplication_convertedPlayerId_fkey"
  FOREIGN KEY ("convertedPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "RecruitmentApplication_status_createdAt_idx" ON "RecruitmentApplication"("status", "createdAt");
CREATE INDEX "RecruitmentApplication_playerClass_idx" ON "RecruitmentApplication"("playerClass");
CREATE INDEX "RecruitmentApplication_dimensionalLayer_idx" ON "RecruitmentApplication"("dimensionalLayer");
CREATE INDEX "RecruitmentApplication_reviewedById_idx" ON "RecruitmentApplication"("reviewedById");
CREATE UNIQUE INDEX "RecruitmentApplication_convertedPlayerId_key" ON "RecruitmentApplication"("convertedPlayerId");
CREATE INDEX "RecruitmentApplication_convertedById_idx" ON "RecruitmentApplication"("convertedById");
