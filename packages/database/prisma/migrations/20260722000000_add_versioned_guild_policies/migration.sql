CREATE TYPE "GuildPolicyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "GuildPolicyVersion" (
  "id" TEXT NOT NULL,
  "version" INTEGER,
  "status" "GuildPolicyStatus" NOT NULL DEFAULT 'DRAFT',
  "titlePt" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "summaryPt" TEXT NOT NULL,
  "summaryEn" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "snapshot" JSONB NOT NULL,
  "diffPt" JSONB NOT NULL DEFAULT '[]',
  "diffEn" JSONB NOT NULL DEFAULT '[]',
  "createdById" TEXT NOT NULL,
  "publishedById" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuildPolicyVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuildPolicyVersion_version_key" ON "GuildPolicyVersion"("version");
CREATE INDEX "GuildPolicyVersion_status_effectiveAt_idx" ON "GuildPolicyVersion"("status", "effectiveAt");
CREATE INDEX "GuildPolicyVersion_createdById_idx" ON "GuildPolicyVersion"("createdById");
CREATE INDEX "GuildPolicyVersion_publishedById_idx" ON "GuildPolicyVersion"("publishedById");

ALTER TABLE "GuildPolicyVersion"
ADD CONSTRAINT "GuildPolicyVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GuildPolicyVersion"
ADD CONSTRAINT "GuildPolicyVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
