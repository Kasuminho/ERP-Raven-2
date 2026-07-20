CREATE TYPE "DiamondSaleBuyerType" AS ENUM ('GUILD_MEMBER', 'EXTERNAL');
CREATE TYPE "DiamondSaleRecipientMode" AS ENUM ('ALL_ACTIVE', 'EXCLUDE_SELECTED');
CREATE TYPE "DiamondSaleStatus" AS ENUM ('OPEN', 'COMPLETED');

ALTER TABLE "ItemCatalog"
ADD COLUMN "diamondSaleEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DiamondSale" (
    "id" TEXT NOT NULL,
    "itemCatalogId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "buyerType" "DiamondSaleBuyerType" NOT NULL,
    "buyerPlayerId" TEXT,
    "buyerName" TEXT NOT NULL,
    "diamondCustodian" TEXT NOT NULL,
    "diamondTotal" INTEGER NOT NULL,
    "itemProofImageUrl" TEXT NOT NULL,
    "saleProofImageUrl" TEXT NOT NULL,
    "recipientMode" "DiamondSaleRecipientMode" NOT NULL,
    "shareAmount" INTEGER NOT NULL,
    "remainderAmount" INTEGER NOT NULL,
    "activePlayerCount" INTEGER NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "status" "DiamondSaleStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "discordPublishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiamondSale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiamondSaleRecipient" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerNickname" TEXT NOT NULL,
    "diamondAmount" INTEGER NOT NULL,
    "proofImageUrl" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "deliveredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiamondSaleRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiamondSale_itemCatalogId_openedAt_idx" ON "DiamondSale"("itemCatalogId", "openedAt");
CREATE INDEX "DiamondSale_buyerPlayerId_idx" ON "DiamondSale"("buyerPlayerId");
CREATE INDEX "DiamondSale_status_openedAt_idx" ON "DiamondSale"("status", "openedAt");
CREATE INDEX "DiamondSale_createdById_idx" ON "DiamondSale"("createdById");
CREATE INDEX "DiamondSaleRecipient_playerId_deliveredAt_idx" ON "DiamondSaleRecipient"("playerId", "deliveredAt");
CREATE INDEX "DiamondSaleRecipient_saleId_deliveredAt_idx" ON "DiamondSaleRecipient"("saleId", "deliveredAt");
CREATE INDEX "DiamondSaleRecipient_deliveredById_idx" ON "DiamondSaleRecipient"("deliveredById");
CREATE UNIQUE INDEX "DiamondSaleRecipient_saleId_playerId_key" ON "DiamondSaleRecipient"("saleId", "playerId");

ALTER TABLE "DiamondSale" ADD CONSTRAINT "DiamondSale_itemCatalogId_fkey" FOREIGN KEY ("itemCatalogId") REFERENCES "ItemCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiamondSale" ADD CONSTRAINT "DiamondSale_buyerPlayerId_fkey" FOREIGN KEY ("buyerPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiamondSale" ADD CONSTRAINT "DiamondSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiamondSale" ADD CONSTRAINT "DiamondSale_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiamondSaleRecipient" ADD CONSTRAINT "DiamondSaleRecipient_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "DiamondSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiamondSaleRecipient" ADD CONSTRAINT "DiamondSaleRecipient_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiamondSaleRecipient" ADD CONSTRAINT "DiamondSaleRecipient_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
