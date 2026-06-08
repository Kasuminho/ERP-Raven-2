-- CreateTable
CREATE TABLE "ItemCatalog" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "itemTier" "ItemTier",
    "itemType" "ItemType",
    "namePt" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "typePt" TEXT NOT NULL,
    "typeEn" TEXT NOT NULL,
    "image1Url" TEXT,
    "image2Url" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "legacyCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemRequest" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER NOT NULL,
    "itemCatalogId" TEXT,
    "discordId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "remainingQuantity" INTEGER NOT NULL,
    "rankPosition" INTEGER NOT NULL,
    "threadId" TEXT NOT NULL,
    "threadChannelId" TEXT NOT NULL,
    "warned3d" BOOLEAN NOT NULL DEFAULT false,
    "warned4d" BOOLEAN NOT NULL DEFAULT false,
    "legacyCreatedAt" TIMESTAMP(3),
    "legacyUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropHistory" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER NOT NULL,
    "itemCatalogId" TEXT,
    "discordId" TEXT,
    "nicknameIngame" TEXT,
    "itemName" TEXT,
    "threadId" TEXT,
    "staffDiscordId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DropHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemCatalog_legacyId_key" ON "ItemCatalog"("legacyId");

-- CreateIndex
CREATE INDEX "ItemCatalog_nameEn_typeEn_idx" ON "ItemCatalog"("nameEn", "typeEn");

-- CreateIndex
CREATE INDEX "ItemCatalog_kind_idx" ON "ItemCatalog"("kind");

-- CreateIndex
CREATE INDEX "ItemCatalog_category_idx" ON "ItemCatalog"("category");

-- CreateIndex
CREATE INDEX "ItemCatalog_itemTier_idx" ON "ItemCatalog"("itemTier");

-- CreateIndex
CREATE INDEX "ItemCatalog_itemType_idx" ON "ItemCatalog"("itemType");

-- CreateIndex
CREATE INDEX "ItemCatalog_isActive_idx" ON "ItemCatalog"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ItemRequest_legacyId_key" ON "ItemRequest"("legacyId");

-- CreateIndex
CREATE INDEX "ItemRequest_itemCatalogId_idx" ON "ItemRequest"("itemCatalogId");

-- CreateIndex
CREATE INDEX "ItemRequest_discordId_idx" ON "ItemRequest"("discordId");

-- CreateIndex
CREATE INDEX "ItemRequest_itemName_idx" ON "ItemRequest"("itemName");

-- CreateIndex
CREATE INDEX "ItemRequest_rankPosition_idx" ON "ItemRequest"("rankPosition");

-- CreateIndex
CREATE INDEX "ItemRequest_threadId_idx" ON "ItemRequest"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "DropHistory_legacyId_key" ON "DropHistory"("legacyId");

-- CreateIndex
CREATE INDEX "DropHistory_itemCatalogId_idx" ON "DropHistory"("itemCatalogId");

-- CreateIndex
CREATE INDEX "DropHistory_discordId_idx" ON "DropHistory"("discordId");

-- CreateIndex
CREATE INDEX "DropHistory_itemName_idx" ON "DropHistory"("itemName");

-- CreateIndex
CREATE INDEX "DropHistory_threadId_idx" ON "DropHistory"("threadId");

-- CreateIndex
CREATE INDEX "DropHistory_deliveredAt_idx" ON "DropHistory"("deliveredAt");

-- AddForeignKey
ALTER TABLE "ItemRequest" ADD CONSTRAINT "ItemRequest_itemCatalogId_fkey" FOREIGN KEY ("itemCatalogId") REFERENCES "ItemCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropHistory" ADD CONSTRAINT "DropHistory_itemCatalogId_fkey" FOREIGN KEY ("itemCatalogId") REFERENCES "ItemCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "ItemRequest" ADD CONSTRAINT "ItemRequest_totalQuantity_check" CHECK ("totalQuantity" >= 0);

-- AddCheckConstraint
ALTER TABLE "ItemRequest" ADD CONSTRAINT "ItemRequest_remainingQuantity_check" CHECK ("remainingQuantity" >= 0);

-- AddCheckConstraint
ALTER TABLE "ItemRequest" ADD CONSTRAINT "ItemRequest_rankPosition_check" CHECK ("rankPosition" >= 1);
