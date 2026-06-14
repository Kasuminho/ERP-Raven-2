-- CreateEnum
CREATE TYPE "AuctionBidCancellationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AuctionBidCancellationRequest" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AuctionBidCancellationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuctionBidCancellationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuctionBidCancellationRequest_auctionId_idx" ON "AuctionBidCancellationRequest"("auctionId");

-- CreateIndex
CREATE INDEX "AuctionBidCancellationRequest_bidId_idx" ON "AuctionBidCancellationRequest"("bidId");

-- CreateIndex
CREATE INDEX "AuctionBidCancellationRequest_playerId_createdAt_idx" ON "AuctionBidCancellationRequest"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "AuctionBidCancellationRequest_status_createdAt_idx" ON "AuctionBidCancellationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuctionBidCancellationRequest_reviewedById_idx" ON "AuctionBidCancellationRequest"("reviewedById");

-- AddForeignKey
ALTER TABLE "AuctionBidCancellationRequest" ADD CONSTRAINT "AuctionBidCancellationRequest_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBidCancellationRequest" ADD CONSTRAINT "AuctionBidCancellationRequest_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "AuctionBid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBidCancellationRequest" ADD CONSTRAINT "AuctionBidCancellationRequest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBidCancellationRequest" ADD CONSTRAINT "AuctionBidCancellationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Normalize the duplicated legacy skill blueprint aliases back into one queue.
UPDATE "ItemRequest"
SET "itemName" = 'heroic skill crafting blueprint fragment'
WHERE "itemName" IN ('heroic skill crafting blueprint fragment', 'heroic skill book blueprint fragment');

UPDATE "ItemRequest" request
SET
  "legacyUpdatedAt" = CURRENT_TIMESTAMP,
  "warned3d" = false,
  "warned4d" = false,
  "lastReminderStage" = NULL,
  "lastReminderAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE request."itemName" = 'heroic skill crafting blueprint fragment';

INSERT INTO "AuditLog" ("id", "action", "targetType", "targetId", "metadata", "createdAt")
VALUES (
  md5(random()::text || clock_timestamp()::text),
  'ITEM_REQUEST_QUEUE_REPAIRED',
  'ItemRequest',
  'heroic skill crafting blueprint fragment',
  '{"reason":"Repair stale reminder/delivery refresh bug after completed delivery. Manual rank correction intentionally left to staff."}'::jsonb,
  CURRENT_TIMESTAMP
);
