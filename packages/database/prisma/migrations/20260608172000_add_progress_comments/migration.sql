-- AlterTable
ALTER TABLE "PlayerProgress" ADD COLUMN "playerReadCommentsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlayerProgressComment" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerProgressComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerProgressComment_progressId_createdAt_idx" ON "PlayerProgressComment"("progressId", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerProgressComment_authorId_idx" ON "PlayerProgressComment"("authorId");

-- AddForeignKey
ALTER TABLE "PlayerProgressComment" ADD CONSTRAINT "PlayerProgressComment_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "PlayerProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProgressComment" ADD CONSTRAINT "PlayerProgressComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
