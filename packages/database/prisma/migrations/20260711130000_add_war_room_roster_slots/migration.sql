-- CreateEnum
CREATE TYPE "WarRoomRosterSlotStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'PRESENT', 'ABSENT', 'JUSTIFIED_ABSENCE');

-- CreateTable
CREATE TABLE "WarRoomRosterSlot" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" "PlayerCombatRole" NOT NULL,
    "status" "WarRoomRosterSlotStatus" NOT NULL DEFAULT 'PENDING',
    "requiredClass" "PlayerClass",
    "requiredLayer" SMALLINT,
    "publicInstructionsPt" TEXT,
    "publicInstructionsEn" TEXT,
    "staffNote" TEXT,
    "playerNote" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "attendanceMarkedAt" TIMESTAMP(3),
    "attendanceMarkedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarRoomRosterSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarRoomRosterSlot_operationId_playerId_key" ON "WarRoomRosterSlot"("operationId", "playerId");

-- CreateIndex
CREATE INDEX "WarRoomRosterSlot_operationId_status_idx" ON "WarRoomRosterSlot"("operationId", "status");

-- CreateIndex
CREATE INDEX "WarRoomRosterSlot_playerId_status_idx" ON "WarRoomRosterSlot"("playerId", "status");

-- CreateIndex
CREATE INDEX "WarRoomRosterSlot_role_idx" ON "WarRoomRosterSlot"("role");

-- CreateIndex
CREATE INDEX "WarRoomRosterSlot_requiredClass_idx" ON "WarRoomRosterSlot"("requiredClass");

-- CreateIndex
CREATE INDEX "WarRoomRosterSlot_attendanceMarkedById_idx" ON "WarRoomRosterSlot"("attendanceMarkedById");

-- CreateIndex
CREATE INDEX "WarRoomRosterSlot_createdById_idx" ON "WarRoomRosterSlot"("createdById");

-- AddForeignKey
ALTER TABLE "WarRoomRosterSlot" ADD CONSTRAINT "WarRoomRosterSlot_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "WarRoomOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarRoomRosterSlot" ADD CONSTRAINT "WarRoomRosterSlot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarRoomRosterSlot" ADD CONSTRAINT "WarRoomRosterSlot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarRoomRosterSlot" ADD CONSTRAINT "WarRoomRosterSlot_attendanceMarkedById_fkey" FOREIGN KEY ("attendanceMarkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
