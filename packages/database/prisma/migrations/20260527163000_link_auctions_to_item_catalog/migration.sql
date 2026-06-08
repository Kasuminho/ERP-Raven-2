-- AlterTable
ALTER TABLE "Auction" ADD COLUMN "itemCatalogId" TEXT;

-- CreateIndex
CREATE INDEX "Auction_itemCatalogId_idx" ON "Auction"("itemCatalogId");

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_itemCatalogId_fkey" FOREIGN KEY ("itemCatalogId") REFERENCES "ItemCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
