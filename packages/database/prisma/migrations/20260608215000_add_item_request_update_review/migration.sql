CREATE TYPE "ItemRequestUpdateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "ItemRequest"
  ADD COLUMN "updateProofNote" TEXT,
  ADD COLUMN "updateProofStatus" "ItemRequestUpdateStatus",
  ADD COLUMN "updateProofSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "updateProofReviewedAt" TIMESTAMP(3),
  ADD COLUMN "updateProofReviewedById" TEXT;

CREATE INDEX "ItemRequest_updateProofStatus_idx" ON "ItemRequest"("updateProofStatus");
CREATE INDEX "ItemRequest_updateProofSubmittedAt_idx" ON "ItemRequest"("updateProofSubmittedAt");
