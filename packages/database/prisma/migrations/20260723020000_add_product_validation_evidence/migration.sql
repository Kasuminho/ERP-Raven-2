CREATE TYPE "ProductValidationInterviewProfile" AS ENUM (
  'STAFF_LEADERSHIP',
  'STAFF_EVENTS',
  'STAFF_LOOT',
  'PLAYER_VETERAN',
  'PLAYER_NEW',
  'PLAYER_ACTIVE',
  'PLAYER_LOW_ACTIVITY'
);

CREATE TYPE "ProductValidationAbsenceVisibility" AS ENUM (
  'PUBLIC',
  'STAFF_ONLY',
  'ANONYMOUS',
  'DEPENDS_ON_REASON'
);

CREATE TABLE "ProductValidationInterview" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'G3X-2026-07',
  "profile" "ProductValidationInterviewProfile" NOT NULL,
  "channels" TEXT[] NOT NULL,
  "absenceVisibility" "ProductValidationAbsenceVisibility" NOT NULL,
  "rsvpWouldReduceManualCharge" BOOLEAN NOT NULL,
  "summary" TEXT NOT NULL,
  "interviewedAt" TIMESTAMP(3) NOT NULL,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductValidationInterview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductValidationWeek" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'G3X-2026-07',
  "weekStart" TIMESTAMP(3) NOT NULL,
  "weekEnd" TIMESTAMP(3) NOT NULL,
  "eventsCreated" INTEGER NOT NULL,
  "expectedAttendance" INTEGER,
  "actualAttendance" INTEGER NOT NULL,
  "noShows" INTEGER NOT NULL,
  "staffConfirmationMinutes" INTEGER NOT NULL,
  "recruitsConverted" INTEGER NOT NULL,
  "recruitsWithActivity" INTEGER NOT NULL,
  "singlePersonTasks" INTEGER NOT NULL,
  "note" TEXT,
  "capturedById" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductValidationWeek_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductValidationInterview_campaignKey_profile_idx" ON "ProductValidationInterview"("campaignKey", "profile");
CREATE INDEX "ProductValidationInterview_interviewedAt_idx" ON "ProductValidationInterview"("interviewedAt");
CREATE INDEX "ProductValidationInterview_recordedById_idx" ON "ProductValidationInterview"("recordedById");
CREATE UNIQUE INDEX "ProductValidationWeek_campaignKey_weekStart_key" ON "ProductValidationWeek"("campaignKey", "weekStart");
CREATE INDEX "ProductValidationWeek_campaignKey_weekEnd_idx" ON "ProductValidationWeek"("campaignKey", "weekEnd");
CREATE INDEX "ProductValidationWeek_capturedById_idx" ON "ProductValidationWeek"("capturedById");

ALTER TABLE "ProductValidationInterview" ADD CONSTRAINT "ProductValidationInterview_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductValidationWeek" ADD CONSTRAINT "ProductValidationWeek_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
