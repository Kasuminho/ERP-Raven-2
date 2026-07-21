CREATE TYPE "OnboardingCompletionType" AS ENUM ('MANUAL', 'RULES_ACK', 'PROFILE', 'TIMEZONE', 'BUILD', 'WISHLIST', 'FIRST_EVENT');

CREATE TABLE "OnboardingTemplate" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "dueDays" INTEGER NOT NULL DEFAULT 30, "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OnboardingTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OnboardingTemplateStep" (
  "id" TEXT NOT NULL, "templateId" TEXT NOT NULL, "key" TEXT NOT NULL,
  "titlePt" TEXT NOT NULL, "titleEn" TEXT NOT NULL, "descriptionPt" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL, "href" TEXT NOT NULL, "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "completionType" "OnboardingCompletionType" NOT NULL DEFAULT 'MANUAL', "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingTemplateStep_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlayerOnboardingPlan" (
  "id" TEXT NOT NULL, "playerId" TEXT NOT NULL, "templateId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "dueAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3), "staffNote" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PlayerOnboardingPlan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlayerOnboardingStep" (
  "id" TEXT NOT NULL, "planId" TEXT NOT NULL, "key" TEXT NOT NULL, "titlePt" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL, "descriptionPt" TEXT NOT NULL, "descriptionEn" TEXT NOT NULL,
  "href" TEXT NOT NULL, "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "completionType" "OnboardingCompletionType" NOT NULL, "displayOrder" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3), "completedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PlayerOnboardingStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingTemplate_version_key" ON "OnboardingTemplate"("version");
CREATE INDEX "OnboardingTemplate_isActive_version_idx" ON "OnboardingTemplate"("isActive", "version");
CREATE INDEX "OnboardingTemplate_createdById_idx" ON "OnboardingTemplate"("createdById");
CREATE UNIQUE INDEX "OnboardingTemplateStep_templateId_key_key" ON "OnboardingTemplateStep"("templateId", "key");
CREATE INDEX "OnboardingTemplateStep_templateId_displayOrder_idx" ON "OnboardingTemplateStep"("templateId", "displayOrder");
CREATE UNIQUE INDEX "PlayerOnboardingPlan_playerId_key" ON "PlayerOnboardingPlan"("playerId");
CREATE INDEX "PlayerOnboardingPlan_templateId_completedAt_idx" ON "PlayerOnboardingPlan"("templateId", "completedAt");
CREATE INDEX "PlayerOnboardingPlan_dueAt_completedAt_idx" ON "PlayerOnboardingPlan"("dueAt", "completedAt");
CREATE UNIQUE INDEX "PlayerOnboardingStep_planId_key_key" ON "PlayerOnboardingStep"("planId", "key");
CREATE INDEX "PlayerOnboardingStep_planId_displayOrder_idx" ON "PlayerOnboardingStep"("planId", "displayOrder");
CREATE INDEX "PlayerOnboardingStep_completedById_idx" ON "PlayerOnboardingStep"("completedById");

ALTER TABLE "OnboardingTemplate" ADD CONSTRAINT "OnboardingTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingTemplateStep" ADD CONSTRAINT "OnboardingTemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerOnboardingPlan" ADD CONSTRAINT "PlayerOnboardingPlan_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerOnboardingPlan" ADD CONSTRAINT "PlayerOnboardingPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerOnboardingStep" ADD CONSTRAINT "PlayerOnboardingStep_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlayerOnboardingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerOnboardingStep" ADD CONSTRAINT "PlayerOnboardingStep_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
