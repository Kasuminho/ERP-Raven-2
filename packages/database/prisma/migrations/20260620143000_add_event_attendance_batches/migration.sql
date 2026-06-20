ALTER TABLE "Event"
ADD COLUMN "attendanceBatchId" TEXT,
ADD COLUMN "batchOrder" INTEGER;

CREATE INDEX "Event_attendanceBatchId_batchOrder_idx"
ON "Event"("attendanceBatchId", "batchOrder");
