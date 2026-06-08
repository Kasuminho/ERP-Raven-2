-- CreateEnum
CREATE TYPE "ItemInterestStatus" AS ENUM ('OPEN', 'CLOSED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CodexRequestStatus" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'NEEDS_RETRY', 'CANCELLED');

-- CreateTable
CREATE TABLE "ItemInterestPost" (
    "id" TEXT NOT NULL,
    "itemCatalogId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'PvE',
    "title" TEXT NOT NULL,
    "criteriaPt" TEXT NOT NULL,
    "criteriaEn" TEXT NOT NULL,
    "status" "ItemInterestStatus" NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "proofImageUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemInterestPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemInterestEntry" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "note" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemInterestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodexRequest" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "note" TEXT,
    "status" "CodexRequestStatus" NOT NULL DEFAULT 'PENDING',
    "proofImageUrl" TEXT,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "retryRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodexRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemInterestPost_itemCatalogId_idx" ON "ItemInterestPost"("itemCatalogId");

-- CreateIndex
CREATE INDEX "ItemInterestPost_status_idx" ON "ItemInterestPost"("status");

-- CreateIndex
CREATE INDEX "ItemInterestPost_closesAt_idx" ON "ItemInterestPost"("closesAt");

-- CreateIndex
CREATE INDEX "ItemInterestPost_createdById_idx" ON "ItemInterestPost"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "ItemInterestEntry_postId_playerId_key" ON "ItemInterestEntry"("postId", "playerId");

-- CreateIndex
CREATE INDEX "ItemInterestEntry_playerId_idx" ON "ItemInterestEntry"("playerId");

-- CreateIndex
CREATE INDEX "CodexRequest_playerId_idx" ON "CodexRequest"("playerId");

-- CreateIndex
CREATE INDEX "CodexRequest_status_idx" ON "CodexRequest"("status");

-- CreateIndex
CREATE INDEX "CodexRequest_sentById_idx" ON "CodexRequest"("sentById");

-- CreateIndex
CREATE INDEX "CodexRequest_createdAt_idx" ON "CodexRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "ItemInterestPost" ADD CONSTRAINT "ItemInterestPost_itemCatalogId_fkey" FOREIGN KEY ("itemCatalogId") REFERENCES "ItemCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemInterestPost" ADD CONSTRAINT "ItemInterestPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemInterestEntry" ADD CONSTRAINT "ItemInterestEntry_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ItemInterestPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemInterestEntry" ADD CONSTRAINT "ItemInterestEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodexRequest" ADD CONSTRAINT "CodexRequest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodexRequest" ADD CONSTRAINT "CodexRequest_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
