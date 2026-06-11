CREATE TYPE "PlayerStaffNoteSeverity" AS ENUM ('INFO', 'WARNING', 'STRIKE');

CREATE TABLE "PlayerStaffNote" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "severity" "PlayerStaffNoteSeverity" NOT NULL DEFAULT 'INFO',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStaffNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerStaffNote_playerId_createdAt_idx" ON "PlayerStaffNote"("playerId", "createdAt");
CREATE INDEX "PlayerStaffNote_authorId_idx" ON "PlayerStaffNote"("authorId");
CREATE INDEX "PlayerStaffNote_severity_idx" ON "PlayerStaffNote"("severity");

ALTER TABLE "PlayerStaffNote" ADD CONSTRAINT "PlayerStaffNote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerStaffNote" ADD CONSTRAINT "PlayerStaffNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
