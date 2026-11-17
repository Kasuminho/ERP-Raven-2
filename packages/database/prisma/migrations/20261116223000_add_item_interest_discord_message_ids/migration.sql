-- AlterTable
ALTER TABLE "ItemInterestPost" ADD COLUMN "discordChannelId" TEXT;
ALTER TABLE "ItemInterestPost" ADD COLUMN "discordMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ItemInterestPost_discordMessageId_key" ON "ItemInterestPost"("discordMessageId");

-- CreateIndex
CREATE INDEX "ItemInterestPost_discordMessageId_idx" ON "ItemInterestPost"("discordMessageId");
