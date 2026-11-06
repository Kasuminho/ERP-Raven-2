-- AlterTable
ALTER TABLE "Player" ADD COLUMN "guildName" TEXT NOT NULL DEFAULT 'AlcatraZ';

-- CreateIndex
CREATE INDEX "Player_guildName_idx" ON "Player"("guildName");
