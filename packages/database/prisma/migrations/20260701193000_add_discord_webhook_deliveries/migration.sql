-- CreateEnum
CREATE TYPE "DiscordWebhookDeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "DiscordWebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookKey" TEXT NOT NULL,
    "channelLabel" TEXT NOT NULL,
    "action" TEXT,
    "targetId" TEXT,
    "status" "DiscordWebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "retryable" BOOLEAN NOT NULL DEFAULT true,
    "payloadPreview" JSONB NOT NULL,
    "lastError" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "retriedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscordWebhookDelivery_status_queuedAt_idx" ON "DiscordWebhookDelivery"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "DiscordWebhookDelivery_webhookKey_queuedAt_idx" ON "DiscordWebhookDelivery"("webhookKey", "queuedAt");

-- CreateIndex
CREATE INDEX "DiscordWebhookDelivery_action_idx" ON "DiscordWebhookDelivery"("action");

-- CreateIndex
CREATE INDEX "DiscordWebhookDelivery_targetId_idx" ON "DiscordWebhookDelivery"("targetId");
