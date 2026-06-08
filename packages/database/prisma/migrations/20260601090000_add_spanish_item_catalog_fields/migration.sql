ALTER TABLE "ItemCatalog" ADD COLUMN "nameEs" TEXT;
ALTER TABLE "ItemCatalog" ADD COLUMN "typeEs" TEXT;

CREATE INDEX "ItemCatalog_nameEs_typeEs_idx" ON "ItemCatalog"("nameEs", "typeEs");
