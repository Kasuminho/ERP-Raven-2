ALTER TABLE "ItemRequest"
ADD COLUMN "updateProofImageUrl" TEXT,
ADD COLUMN "lastReminderStage" TEXT,
ADD COLUMN "lastReminderAt" TIMESTAMP(3);

CREATE INDEX "ItemRequest_lastReminderStage_idx" ON "ItemRequest"("lastReminderStage");
