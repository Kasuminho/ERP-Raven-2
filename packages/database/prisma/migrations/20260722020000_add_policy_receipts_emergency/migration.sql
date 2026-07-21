ALTER TABLE "GuildPolicyVersion"
ADD COLUMN "isEmergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emergencyReason" TEXT;

CREATE TABLE "GuildPolicyReceipt" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "openedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuildPolicyReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuildPolicyReceipt_policyId_playerId_key" ON "GuildPolicyReceipt"("policyId", "playerId");
CREATE INDEX "GuildPolicyReceipt_policyId_openedAt_acknowledgedAt_idx" ON "GuildPolicyReceipt"("policyId", "openedAt", "acknowledgedAt");
CREATE INDEX "GuildPolicyReceipt_playerId_acknowledgedAt_idx" ON "GuildPolicyReceipt"("playerId", "acknowledgedAt");

ALTER TABLE "GuildPolicyReceipt"
ADD CONSTRAINT "GuildPolicyReceipt_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "GuildPolicyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuildPolicyReceipt"
ADD CONSTRAINT "GuildPolicyReceipt_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
