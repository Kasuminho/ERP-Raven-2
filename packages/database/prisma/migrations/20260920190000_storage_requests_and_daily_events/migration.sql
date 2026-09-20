-- CreateEnum
CREATE TYPE "StorageRequestStatus" AS ENUM ('PENDING', 'DELIVERED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "notifyDaily" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "announcedToDiscordAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EventSeries" ADD COLUMN "recurrenceType" TEXT NOT NULL DEFAULT 'WEEKLY',
ADD COLUMN "intervalDays" INTEGER DEFAULT 1,
ADD COLUMN "notifyDaily" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "GuildStorageEntry" (
    "id" TEXT NOT NULL,
    "storageItemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionInfo" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildStorageEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildStorageRequest" (
    "id" TEXT NOT NULL,
    "storageItemId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "StorageRequestStatus" NOT NULL DEFAULT 'PENDING',
    "playerNote" TEXT,
    "staffNote" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "deliveredById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildStorageRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuildStorageEntry_storageItemId_idx" ON "GuildStorageEntry"("storageItemId");

-- CreateIndex
CREATE INDEX "GuildStorageEntry_acquisitionDate_idx" ON "GuildStorageEntry"("acquisitionDate");

-- CreateIndex
CREATE UNIQUE INDEX "GuildStorageEntry_storageItemId_acquisitionDate_acquisitionInfo_key" ON "GuildStorageEntry"("storageItemId", "acquisitionDate", "acquisitionInfo");

-- CreateIndex
CREATE INDEX "GuildStorageRequest_storageItemId_idx" ON "GuildStorageRequest"("storageItemId");

-- CreateIndex
CREATE INDEX "GuildStorageRequest_playerId_idx" ON "GuildStorageRequest"("playerId");

-- CreateIndex
CREATE INDEX "GuildStorageRequest_status_idx" ON "GuildStorageRequest"("status");

-- CreateIndex
CREATE INDEX "GuildStorageRequest_createdAt_idx" ON "GuildStorageRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "GuildStorageEntry" ADD CONSTRAINT "GuildStorageEntry_storageItemId_fkey" FOREIGN KEY ("storageItemId") REFERENCES "GuildStorageItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildStorageRequest" ADD CONSTRAINT "GuildStorageRequest_storageItemId_fkey" FOREIGN KEY ("storageItemId") REFERENCES "GuildStorageItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildStorageRequest" ADD CONSTRAINT "GuildStorageRequest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildStorageRequest" ADD CONSTRAINT "GuildStorageRequest_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildStorageRequest" ADD CONSTRAINT "GuildStorageRequest_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
