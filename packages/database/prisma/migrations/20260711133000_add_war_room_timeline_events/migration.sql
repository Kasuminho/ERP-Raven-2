-- CreateEnum
CREATE TYPE "WarRoomTimelineEventType" AS ENUM ('NOTE', 'CALL', 'ENGAGE', 'WIPE', 'OBJECTIVE_CAPTURED', 'BOSS', 'TARGET_SWAP', 'SUBSTITUTION', 'RISK', 'CLOSED');

-- CreateTable
CREATE TABLE "WarRoomTimelineEvent" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "type" "WarRoomTimelineEventType" NOT NULL DEFAULT 'NOTE',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarRoomTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarRoomTimelineEvent_operationId_occurredAt_idx" ON "WarRoomTimelineEvent"("operationId", "occurredAt");

-- CreateIndex
CREATE INDEX "WarRoomTimelineEvent_type_idx" ON "WarRoomTimelineEvent"("type");

-- CreateIndex
CREATE INDEX "WarRoomTimelineEvent_createdById_idx" ON "WarRoomTimelineEvent"("createdById");

-- AddForeignKey
ALTER TABLE "WarRoomTimelineEvent" ADD CONSTRAINT "WarRoomTimelineEvent_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "WarRoomOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarRoomTimelineEvent" ADD CONSTRAINT "WarRoomTimelineEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
