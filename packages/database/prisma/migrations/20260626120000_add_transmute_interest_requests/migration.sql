ALTER TABLE "ItemInterestEntry"
  ADD COLUMN "isTransmuteRequest" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ItemInterestEntry"
SET "isTransmuteRequest" = true
WHERE "imageUrl" = '/transmutar.png';

CREATE INDEX "ItemInterestEntry_isTransmuteRequest_idx"
  ON "ItemInterestEntry"("isTransmuteRequest");

CREATE INDEX "ItemInterestEntry_playerId_isTransmuteRequest_idx"
  ON "ItemInterestEntry"("playerId", "isTransmuteRequest");
