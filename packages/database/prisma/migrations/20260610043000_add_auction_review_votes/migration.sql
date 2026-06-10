CREATE TABLE "AuctionReviewVote" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "playerId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuctionReviewVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuctionReviewVote_auctionId_voterId_key" ON "AuctionReviewVote"("auctionId", "voterId");
CREATE INDEX "AuctionReviewVote_auctionId_action_idx" ON "AuctionReviewVote"("auctionId", "action");
CREATE INDEX "AuctionReviewVote_playerId_idx" ON "AuctionReviewVote"("playerId");
CREATE INDEX "AuctionReviewVote_voterId_idx" ON "AuctionReviewVote"("voterId");

ALTER TABLE "AuctionReviewVote"
  ADD CONSTRAINT "AuctionReviewVote_auctionId_fkey"
  FOREIGN KEY ("auctionId") REFERENCES "Auction"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuctionReviewVote"
  ADD CONSTRAINT "AuctionReviewVote_voterId_fkey"
  FOREIGN KEY ("voterId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
