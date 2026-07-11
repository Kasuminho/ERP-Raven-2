CREATE TYPE "WishlistPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "WishlistStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FULFILLED', 'REMOVED');

CREATE TABLE "PlayerWishlistItem" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "itemCatalogId" TEXT NOT NULL,
  "priority" "WishlistPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "WishlistStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT NOT NULL,
  "build" TEXT,
  "note" TEXT,
  "proofImageUrl" TEXT,
  "fulfilledById" TEXT,
  "fulfilledAt" TIMESTAMP(3),
  "fulfilledNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerWishlistItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlayerWishlistItem"
  ADD CONSTRAINT "PlayerWishlistItem_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerWishlistItem"
  ADD CONSTRAINT "PlayerWishlistItem_itemCatalogId_fkey"
  FOREIGN KEY ("itemCatalogId") REFERENCES "ItemCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PlayerWishlistItem_playerId_status_priority_idx" ON "PlayerWishlistItem"("playerId", "status", "priority");
CREATE INDEX "PlayerWishlistItem_itemCatalogId_status_priority_idx" ON "PlayerWishlistItem"("itemCatalogId", "status", "priority");
CREATE INDEX "PlayerWishlistItem_status_updatedAt_idx" ON "PlayerWishlistItem"("status", "updatedAt");
CREATE INDEX "PlayerWishlistItem_fulfilledById_idx" ON "PlayerWishlistItem"("fulfilledById");
