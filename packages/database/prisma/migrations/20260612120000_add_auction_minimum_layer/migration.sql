ALTER TABLE "Auction" ADD COLUMN "minimumLayer" SMALLINT;

CREATE INDEX "Auction_minimumLayer_idx" ON "Auction"("minimumLayer");
