-- CreateEnum
CREATE TYPE "StorageRequestPurpose" AS ENUM ('USE', 'CODEX', 'CRAFT');

-- CreateEnum
CREATE TYPE "StorageDistributionMode" AS ENUM ('CONTROLLED', 'FREE_DISTRIBUTION');

-- CreateEnum
CREATE TYPE "ItemRequestCraftType" AS ENUM ('RECIPE', 'PURPLE_MATERIAL', 'QUINTESSENCE', 'STANDARD');

-- AlterTable
ALTER TABLE "CodexRequest" ADD COLUMN     "itemCatalogId" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "storageItemId" TEXT,
ALTER COLUMN "imageUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GuildStorageItem" ADD COLUMN     "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "distributionMode" "StorageDistributionMode" NOT NULL DEFAULT 'CONTROLLED',
ADD COLUMN     "isCodex" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GuildStorageRequest" ADD COLUMN     "codexEntryName" TEXT,
ADD COLUMN     "codexRequestId" TEXT,
ADD COLUMN     "isFreeDistribution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purpose" "StorageRequestPurpose" NOT NULL DEFAULT 'USE',
ADD COLUMN     "stockCheckBypassed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ItemRequest" ADD COLUMN     "craftType" "ItemRequestCraftType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "currentQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quintessenceQuantity" INTEGER,
ADD COLUMN     "targetItemCatalogId" TEXT,
ADD COLUMN     "targetQuantity" INTEGER;

-- AlterTable
ALTER TABLE "PlayerCommunicationPreference" ADD COLUMN     "auctionChannel" "CommunicationChannel" NOT NULL DEFAULT 'WEB',
ADD COLUMN     "codexChannel" "CommunicationChannel" NOT NULL DEFAULT 'WEB',
ADD COLUMN     "discordDirectMessageEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "discordEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storageChannel" "CommunicationChannel" NOT NULL DEFAULT 'WEB';

-- CreateIndex
CREATE INDEX "CodexRequest_storageItemId_idx" ON "CodexRequest"("storageItemId");

-- CreateIndex
CREATE INDEX "CodexRequest_itemCatalogId_idx" ON "CodexRequest"("itemCatalogId");

-- CreateIndex
CREATE INDEX "GuildStorageItem_distributionMode_idx" ON "GuildStorageItem"("distributionMode");

-- CreateIndex
CREATE INDEX "GuildStorageItem_isCodex_idx" ON "GuildStorageItem"("isCodex");

-- CreateIndex
CREATE UNIQUE INDEX "GuildStorageRequest_codexRequestId_key" ON "GuildStorageRequest"("codexRequestId");

-- CreateIndex
CREATE INDEX "GuildStorageRequest_purpose_idx" ON "GuildStorageRequest"("purpose");

-- CreateIndex
CREATE INDEX "GuildStorageRequest_isFreeDistribution_idx" ON "GuildStorageRequest"("isFreeDistribution");

-- CreateIndex
CREATE INDEX "ItemRequest_targetItemCatalogId_idx" ON "ItemRequest"("targetItemCatalogId");

-- CreateIndex
CREATE INDEX "ItemRequest_craftType_idx" ON "ItemRequest"("craftType");

-- AddForeignKey
ALTER TABLE "ItemRequest" ADD CONSTRAINT "ItemRequest_targetItemCatalogId_fkey" FOREIGN KEY ("targetItemCatalogId") REFERENCES "ItemCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildStorageRequest" ADD CONSTRAINT "GuildStorageRequest_codexRequestId_fkey" FOREIGN KEY ("codexRequestId") REFERENCES "CodexRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodexRequest" ADD CONSTRAINT "CodexRequest_storageItemId_fkey" FOREIGN KEY ("storageItemId") REFERENCES "GuildStorageItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
