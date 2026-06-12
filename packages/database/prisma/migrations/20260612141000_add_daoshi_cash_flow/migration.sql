CREATE TYPE "DaoshiReceiptStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "DaoshiCashReceipt" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "proofImageUrl" TEXT NOT NULL,
  "purchaseCents" INTEGER NOT NULL,
  "approvedCents" INTEGER,
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "couponCode" TEXT NOT NULL DEFAULT 'AACD',
  "status" "DaoshiReceiptStatus" NOT NULL DEFAULT 'PENDING',
  "playerNote" TEXT,
  "reviewNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DaoshiCashReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DaoshiRaffle" (
  "id" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "prizeUsdCents" INTEGER NOT NULL DEFAULT 5000,
  "totalCents" INTEGER NOT NULL,
  "totalCoupons" INTEGER NOT NULL,
  "winnerPlayerId" TEXT,
  "winnerCoupon" INTEGER,
  "entries" JSONB NOT NULL,
  "executedById" TEXT NOT NULL,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DaoshiRaffle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DaoshiRaffle_month_key" ON "DaoshiRaffle"("month");
CREATE INDEX "DaoshiCashReceipt_playerId_purchaseDate_idx" ON "DaoshiCashReceipt"("playerId", "purchaseDate");
CREATE INDEX "DaoshiCashReceipt_status_idx" ON "DaoshiCashReceipt"("status");
CREATE INDEX "DaoshiCashReceipt_purchaseDate_idx" ON "DaoshiCashReceipt"("purchaseDate");
CREATE INDEX "DaoshiCashReceipt_reviewedById_idx" ON "DaoshiCashReceipt"("reviewedById");
CREATE INDEX "DaoshiRaffle_winnerPlayerId_idx" ON "DaoshiRaffle"("winnerPlayerId");
CREATE INDEX "DaoshiRaffle_executedById_idx" ON "DaoshiRaffle"("executedById");
CREATE INDEX "DaoshiRaffle_executedAt_idx" ON "DaoshiRaffle"("executedAt");

ALTER TABLE "DaoshiCashReceipt" ADD CONSTRAINT "DaoshiCashReceipt_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DaoshiCashReceipt" ADD CONSTRAINT "DaoshiCashReceipt_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DaoshiRaffle" ADD CONSTRAINT "DaoshiRaffle_winnerPlayerId_fkey" FOREIGN KEY ("winnerPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DaoshiRaffle" ADD CONSTRAINT "DaoshiRaffle_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
