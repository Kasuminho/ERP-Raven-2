-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('ACTIVE', 'SENT', 'CANCELLED');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "channelId" TEXT NOT NULL,
    "mentionRoleId" TEXT,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'ACTIVE',
    "warned4h" BOOLEAN NOT NULL DEFAULT false,
    "warned1h" BOOLEAN NOT NULL DEFAULT false,
    "warned30m" BOOLEAN NOT NULL DEFAULT false,
    "warnedNow" BOOLEAN NOT NULL DEFAULT false,
    "warnedDailyDay" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_status_idx" ON "Announcement"("status");

-- CreateIndex
CREATE INDEX "Announcement_eventTime_idx" ON "Announcement"("eventTime");

-- CreateIndex
CREATE INDEX "Announcement_channelId_idx" ON "Announcement"("channelId");

-- CreateIndex
CREATE INDEX "Announcement_createdById_idx" ON "Announcement"("createdById");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
