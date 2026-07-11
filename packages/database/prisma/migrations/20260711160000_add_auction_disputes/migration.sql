CREATE TYPE "AuctionDisputeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "AuctionDispute" (
  "id" TEXT NOT NULL,
  "auctionId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "proofImageUrl" TEXT,
  "status" "AuctionDisputeStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "externalNotePt" TEXT,
  "externalNoteEn" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuctionDispute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuctionDispute_auctionId_playerId_key" ON "AuctionDispute"("auctionId", "playerId");
CREATE INDEX "AuctionDispute_auctionId_status_createdAt_idx" ON "AuctionDispute"("auctionId", "status", "createdAt");
CREATE INDEX "AuctionDispute_playerId_status_createdAt_idx" ON "AuctionDispute"("playerId", "status", "createdAt");
CREATE INDEX "AuctionDispute_reviewedById_idx" ON "AuctionDispute"("reviewedById");

ALTER TABLE "AuctionDispute"
  ADD CONSTRAINT "AuctionDispute_auctionId_fkey"
  FOREIGN KEY ("auctionId") REFERENCES "Auction"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuctionDispute"
  ADD CONSTRAINT "AuctionDispute_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuctionDispute"
  ADD CONSTRAINT "AuctionDispute_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
