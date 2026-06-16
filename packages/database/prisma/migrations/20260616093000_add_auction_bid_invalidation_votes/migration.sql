CREATE TABLE "AuctionBidInvalidationVote" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuctionBidInvalidationVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuctionBidInvalidationVote_bidId_voterId_key" ON "AuctionBidInvalidationVote"("bidId", "voterId");
CREATE INDEX "AuctionBidInvalidationVote_auctionId_bidId_idx" ON "AuctionBidInvalidationVote"("auctionId", "bidId");
CREATE INDEX "AuctionBidInvalidationVote_voterId_idx" ON "AuctionBidInvalidationVote"("voterId");

ALTER TABLE "AuctionBidInvalidationVote"
  ADD CONSTRAINT "AuctionBidInvalidationVote_auctionId_fkey"
  FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuctionBidInvalidationVote"
  ADD CONSTRAINT "AuctionBidInvalidationVote_bidId_fkey"
  FOREIGN KEY ("bidId") REFERENCES "AuctionBid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuctionBidInvalidationVote"
  ADD CONSTRAINT "AuctionBidInvalidationVote_voterId_fkey"
  FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
