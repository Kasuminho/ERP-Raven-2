ALTER TYPE "ItemInterestStatus" ADD VALUE IF NOT EXISTS 'VOTING';
ALTER TYPE "ItemInterestStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_DELIVERY';

ALTER TABLE "ItemInterestPost"
  ADD COLUMN IF NOT EXISTS "votingRound" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "votingCandidateEntryIds" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "selectedEntryId" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryEnabledAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ItemInterestVote" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "round" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ItemInterestVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItemInterestVote_postId_voterId_round_key" ON "ItemInterestVote"("postId", "voterId", "round");
CREATE INDEX IF NOT EXISTS "ItemInterestVote_postId_round_idx" ON "ItemInterestVote"("postId", "round");
CREATE INDEX IF NOT EXISTS "ItemInterestVote_entryId_idx" ON "ItemInterestVote"("entryId");
CREATE INDEX IF NOT EXISTS "ItemInterestVote_voterId_idx" ON "ItemInterestVote"("voterId");
CREATE INDEX IF NOT EXISTS "ItemInterestPost_selectedEntryId_idx" ON "ItemInterestPost"("selectedEntryId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ItemInterestVote_postId_fkey'
  ) THEN
    ALTER TABLE "ItemInterestVote"
      ADD CONSTRAINT "ItemInterestVote_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "ItemInterestPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ItemInterestVote_entryId_fkey'
  ) THEN
    ALTER TABLE "ItemInterestVote"
      ADD CONSTRAINT "ItemInterestVote_entryId_fkey"
      FOREIGN KEY ("entryId") REFERENCES "ItemInterestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ItemInterestVote_voterId_fkey'
  ) THEN
    ALTER TABLE "ItemInterestVote"
      ADD CONSTRAINT "ItemInterestVote_voterId_fkey"
      FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
