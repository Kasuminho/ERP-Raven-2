ALTER TABLE "Player"
ADD COLUMN "deactivatedAt" TIMESTAMP(3),
ADD COLUMN "deactivatedById" TEXT,
ADD COLUMN "deactivationReason" TEXT,
ADD COLUMN "reactivationRequestedAt" TIMESTAMP(3);

CREATE INDEX "Player_reactivationRequestedAt_idx" ON "Player"("reactivationRequestedAt");
