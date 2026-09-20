-- CreateTable
CREATE TABLE "GuildStorageItem" (
    "id" TEXT NOT NULL,
    "itemCatalogId" TEXT,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'common',
    "itemTier" "ItemTier",
    "itemType" "ItemType",
    "kind" TEXT NOT NULL DEFAULT 'equipment',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "lastImportAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildStorageItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuildStorageItem_itemName_idx" ON "GuildStorageItem"("itemName");

-- CreateIndex
CREATE INDEX "GuildStorageItem_itemCatalogId_idx" ON "GuildStorageItem"("itemCatalogId");

-- CreateIndex
CREATE INDEX "GuildStorageItem_category_idx" ON "GuildStorageItem"("category");

-- CreateIndex
CREATE INDEX "GuildStorageItem_itemTier_idx" ON "GuildStorageItem"("itemTier");

-- CreateIndex
CREATE INDEX "GuildStorageItem_itemType_idx" ON "GuildStorageItem"("itemType");

-- AddForeignKey
ALTER TABLE "GuildStorageItem" ADD CONSTRAINT "GuildStorageItem_itemCatalogId_fkey" FOREIGN KEY ("itemCatalogId") REFERENCES "ItemCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
