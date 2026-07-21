CREATE TYPE "StaffAutomationAction" AS ENUM ('CREATE_STAFF_TASK');
CREATE TABLE "StaffAutomationRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "action" "StaffAutomationAction" NOT NULL DEFAULT 'CREATE_STAFF_TASK',
  "sourcePattern" TEXT NOT NULL,
  "taskTitle" TEXT NOT NULL,
  "taskDescription" TEXT NOT NULL,
  "taskArea" "LeadershipArea" NOT NULL,
  "taskHref" TEXT NOT NULL,
  "frequencyMinutes" INTEGER NOT NULL,
  "maxRunsPerDay" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "killSwitch" BOOLEAN NOT NULL DEFAULT false,
  "dryRunPreview" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "activatedAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffAutomationRule_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StaffAutomationRun" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "dedupKey" TEXT NOT NULL,
  "taskId" TEXT,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffAutomationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StaffAutomationRule_enabled_killSwitch_lastRunAt_idx" ON "StaffAutomationRule"("enabled", "killSwitch", "lastRunAt");
CREATE INDEX "StaffAutomationRule_sourcePattern_idx" ON "StaffAutomationRule"("sourcePattern");
CREATE INDEX "StaffAutomationRule_createdById_idx" ON "StaffAutomationRule"("createdById");
CREATE UNIQUE INDEX "StaffAutomationRun_dedupKey_key" ON "StaffAutomationRun"("dedupKey");
CREATE INDEX "StaffAutomationRun_ruleId_createdAt_idx" ON "StaffAutomationRun"("ruleId", "createdAt");
ALTER TABLE "StaffAutomationRule" ADD CONSTRAINT "StaffAutomationRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffAutomationRun" ADD CONSTRAINT "StaffAutomationRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "StaffAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
