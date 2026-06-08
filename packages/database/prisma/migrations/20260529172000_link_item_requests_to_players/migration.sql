ALTER TABLE "ItemRequest" ADD COLUMN "playerId" TEXT;

UPDATE "ItemRequest" ir
SET "playerId" = p."id"
FROM "Player" p
JOIN "User" u ON u."id" = p."userId"
WHERE ir."playerId" IS NULL
  AND ir."discordId" = u."discordId";

CREATE INDEX "ItemRequest_playerId_idx" ON "ItemRequest"("playerId");

ALTER TABLE "ItemRequest"
ADD CONSTRAINT "ItemRequest_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "Player"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
