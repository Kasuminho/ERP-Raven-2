CREATE TYPE "ProgressCategory" AS ENUM (
  'STELLAS_AMPLIFICATION',
  'EQUIPMENT',
  'RELICS',
  'STIGMA',
  'ITEM_COLLECTION',
  'SKILLS',
  'PARADISE_STONES',
  'STATUS',
  'DIMENSIONAL_RIFT'
);

CREATE TYPE "ProgressReviewStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'APPROVED',
  'REJECTED'
);

ALTER TABLE "Player" ADD COLUMN "combatPower" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PlayerProgress" ADD COLUMN "category" "ProgressCategory" NOT NULL DEFAULT 'STATUS';
ALTER TABLE "PlayerProgress" ADD COLUMN "imageUrls" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "PlayerProgress" ADD COLUMN "reviewStatus" "ProgressReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "PlayerProgress" ADD COLUMN "requiresStaffReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlayerProgress" ADD COLUMN "combatPower" INTEGER;
ALTER TABLE "PlayerProgress" ADD COLUMN "dimensionalLayer" SMALLINT;
ALTER TABLE "PlayerProgress" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "PlayerProgress" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "PlayerProgress" ADD COLUMN "reviewNote" TEXT;

UPDATE "PlayerProgress"
SET "imageUrls" = CASE
  WHEN "imageUrl" IS NULL OR "imageUrl" = '' THEN '[]'::jsonb
  ELSE jsonb_build_array("imageUrl")
END;

CREATE INDEX "PlayerProgress_category_idx" ON "PlayerProgress"("category");
CREATE INDEX "PlayerProgress_reviewStatus_idx" ON "PlayerProgress"("reviewStatus");
CREATE INDEX "PlayerProgress_reviewedById_idx" ON "PlayerProgress"("reviewedById");

ALTER TABLE "PlayerProgress"
  ADD CONSTRAINT "PlayerProgress_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
