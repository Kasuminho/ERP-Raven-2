CREATE TABLE "ItemInterestView" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ItemInterestView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemInterestView_postId_playerId_key" ON "ItemInterestView"("postId", "playerId");
CREATE INDEX "ItemInterestView_playerId_seenAt_idx" ON "ItemInterestView"("playerId", "seenAt");
CREATE INDEX "ItemInterestView_postId_idx" ON "ItemInterestView"("postId");

ALTER TABLE "ItemInterestView"
ADD CONSTRAINT "ItemInterestView_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "ItemInterestPost"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ItemInterestView"
ADD CONSTRAINT "ItemInterestView_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "Player"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
