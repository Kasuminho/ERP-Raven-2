-- Link delivered drops back to auction winners and store proof images.
ALTER TABLE "DropHistory" ADD COLUMN "auctionId" TEXT;
ALTER TABLE "DropHistory" ADD COLUMN "playerId" TEXT;
ALTER TABLE "DropHistory" ADD COLUMN "proofImageUrl" TEXT;

CREATE UNIQUE INDEX "DropHistory_auctionId_key" ON "DropHistory"("auctionId");
CREATE INDEX "DropHistory_playerId_idx" ON "DropHistory"("playerId");

ALTER TABLE "DropHistory"
  ADD CONSTRAINT "DropHistory_auctionId_fkey"
  FOREIGN KEY ("auctionId") REFERENCES "Auction"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DropHistory"
  ADD CONSTRAINT "DropHistory_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
