-- AlterEnum
ALTER TYPE "WarRoomTimelineEventType" ADD VALUE IF NOT EXISTS 'CONTRIBUTION';

-- AlterTable
ALTER TABLE "WarRoomOperation" ADD COLUMN "score" TEXT,
ADD COLUMN "improvementNotes" TEXT;
