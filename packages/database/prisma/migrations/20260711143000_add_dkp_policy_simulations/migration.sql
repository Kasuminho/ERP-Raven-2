-- CreateEnum
CREATE TYPE "DkpPolicySimulationType" AS ENUM ('DECAY');

-- CreateEnum
CREATE TYPE "DkpPolicySimulationStatus" AS ENUM ('DRAFT', 'ARCHIVED');

-- CreateTable
CREATE TABLE "DkpPolicySimulation" (
    "id" TEXT NOT NULL,
    "type" "DkpPolicySimulationType" NOT NULL,
    "status" "DkpPolicySimulationStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DkpPolicySimulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DkpPolicySimulation_type_status_createdAt_idx" ON "DkpPolicySimulation"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DkpPolicySimulation_createdById_idx" ON "DkpPolicySimulation"("createdById");

-- AddForeignKey
ALTER TABLE "DkpPolicySimulation" ADD CONSTRAINT "DkpPolicySimulation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
