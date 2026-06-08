-- AlterTable
ALTER TABLE "User" ADD COLUMN "preferredLocale" TEXT NOT NULL DEFAULT 'pt';

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "timezone" TEXT;

-- AlterTable
ALTER TABLE "DropHistory" ALTER COLUMN "legacyId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PlayerProgress" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "level" INTEGER,
    "note" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerProgress_playerId_createdAt_idx" ON "PlayerProgress"("playerId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlayerProgress" ADD CONSTRAINT "PlayerProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
