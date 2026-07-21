CREATE TABLE "StaffAreaCoverage" (
  "id" TEXT NOT NULL,
  "area" "LeadershipArea" NOT NULL,
  "primaryUserId" TEXT,
  "backupUserId" TEXT,
  "onCallStartsAt" TEXT NOT NULL,
  "onCallEndsAt" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffAreaCoverage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StaffAvailabilityPeriod" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffAvailabilityPeriod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffAreaCoverage_area_key" ON "StaffAreaCoverage"("area");
CREATE INDEX "StaffAreaCoverage_primaryUserId_idx" ON "StaffAreaCoverage"("primaryUserId");
CREATE INDEX "StaffAreaCoverage_backupUserId_idx" ON "StaffAreaCoverage"("backupUserId");
CREATE INDEX "StaffAreaCoverage_updatedById_idx" ON "StaffAreaCoverage"("updatedById");
CREATE INDEX "StaffAvailabilityPeriod_userId_startsAt_endsAt_idx" ON "StaffAvailabilityPeriod"("userId", "startsAt", "endsAt");
CREATE INDEX "StaffAvailabilityPeriod_startsAt_endsAt_idx" ON "StaffAvailabilityPeriod"("startsAt", "endsAt");
ALTER TABLE "StaffAreaCoverage" ADD CONSTRAINT "StaffAreaCoverage_primaryUserId_fkey" FOREIGN KEY ("primaryUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffAreaCoverage" ADD CONSTRAINT "StaffAreaCoverage_backupUserId_fkey" FOREIGN KEY ("backupUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffAreaCoverage" ADD CONSTRAINT "StaffAreaCoverage_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffAvailabilityPeriod" ADD CONSTRAINT "StaffAvailabilityPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
