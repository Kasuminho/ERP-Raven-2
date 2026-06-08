ALTER TABLE "DropHistory" ADD COLUMN "itemInterestEntryId" TEXT;

CREATE UNIQUE INDEX "DropHistory_itemInterestEntryId_key" ON "DropHistory"("itemInterestEntryId");
CREATE INDEX "DropHistory_itemInterestEntryId_idx" ON "DropHistory"("itemInterestEntryId");

ALTER TABLE "DropHistory" ADD CONSTRAINT "DropHistory_itemInterestEntryId_fkey" FOREIGN KEY ("itemInterestEntryId") REFERENCES "ItemInterestEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
