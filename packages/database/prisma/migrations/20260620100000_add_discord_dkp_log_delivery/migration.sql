CREATE TABLE "DiscordDkpLogState" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "backfillCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordDkpLogState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiscordDkpLogDelivery" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordDkpLogDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscordDkpLogDelivery_transactionId_key" ON "DiscordDkpLogDelivery"("transactionId");
CREATE INDEX "DiscordDkpLogDelivery_sentAt_idx" ON "DiscordDkpLogDelivery"("sentAt");

ALTER TABLE "DiscordDkpLogDelivery"
ADD CONSTRAINT "DiscordDkpLogDelivery_transactionId_fkey"
FOREIGN KEY ("transactionId") REFERENCES "DKPTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
