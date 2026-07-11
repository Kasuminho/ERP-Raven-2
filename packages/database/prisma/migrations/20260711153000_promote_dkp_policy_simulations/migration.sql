ALTER TYPE "DkpPolicySimulationStatus" ADD VALUE IF NOT EXISTS 'PROMOTED';

ALTER TABLE "DkpPolicySimulation"
  ADD COLUMN "promotedById" TEXT,
  ADD COLUMN "promotedAt" TIMESTAMP(3),
  ADD COLUMN "promotionReason" TEXT;

CREATE INDEX "DkpPolicySimulation_promotedById_idx" ON "DkpPolicySimulation"("promotedById");

ALTER TABLE "DkpPolicySimulation"
  ADD CONSTRAINT "DkpPolicySimulation_promotedById_fkey"
  FOREIGN KEY ("promotedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
