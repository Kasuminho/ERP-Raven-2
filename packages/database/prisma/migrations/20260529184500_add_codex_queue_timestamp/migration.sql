ALTER TABLE "CodexRequest" ADD COLUMN "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "CodexRequest"
SET "queuedAt" = COALESCE("retryRequestedAt", "createdAt", CURRENT_TIMESTAMP);

CREATE INDEX "CodexRequest_queuedAt_idx" ON "CodexRequest"("queuedAt");
