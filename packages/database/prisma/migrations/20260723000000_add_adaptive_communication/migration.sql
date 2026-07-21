CREATE TYPE "CommunicationChannel" AS ENUM ('WEB', 'DISCORD', 'BOTH', 'NONE');
CREATE TYPE "DigestCadence" AS ENUM ('DAILY', 'WEEKLY', 'NONE');
CREATE TABLE "PlayerCommunicationPreference" (
  "playerId" TEXT NOT NULL,
  "eventChannel" "CommunicationChannel" NOT NULL DEFAULT 'WEB',
  "ownLootChannel" "CommunicationChannel" NOT NULL DEFAULT 'WEB',
  "requestChannel" "CommunicationChannel" NOT NULL DEFAULT 'WEB',
  "progressChannel" "CommunicationChannel" NOT NULL DEFAULT 'WEB',
  "announcementChannel" "CommunicationChannel" NOT NULL DEFAULT 'WEB',
  "reminderChannel" "CommunicationChannel" NOT NULL DEFAULT 'WEB',
  "quietStartsAt" TEXT,
  "quietEndsAt" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "digestCadence" "DigestCadence" NOT NULL DEFAULT 'DAILY',
  "criticalBypassesQuietHours" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerCommunicationPreference_pkey" PRIMARY KEY ("playerId")
);
CREATE TABLE "PlayerDigestDelivery" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "itemKeys" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerDigestDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlayerDigestDelivery_playerId_periodKey_key" ON "PlayerDigestDelivery"("playerId", "periodKey");
CREATE INDEX "PlayerDigestDelivery_periodKey_idx" ON "PlayerDigestDelivery"("periodKey");
CREATE INDEX "PlayerDigestDelivery_playerId_createdAt_idx" ON "PlayerDigestDelivery"("playerId", "createdAt");
ALTER TABLE "PlayerCommunicationPreference" ADD CONSTRAINT "PlayerCommunicationPreference_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerDigestDelivery" ADD CONSTRAINT "PlayerDigestDelivery_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
