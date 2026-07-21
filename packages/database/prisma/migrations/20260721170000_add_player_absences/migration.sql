CREATE TYPE "PlayerAbsenceReasonVisibility" AS ENUM ('STAFF_ONLY', 'PLAYER_PUBLIC');

CREATE TABLE "PlayerAbsence" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "reasonVisibility" "PlayerAbsenceReasonVisibility" NOT NULL DEFAULT 'STAFF_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerAbsence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerAbsence_playerId_startsAt_endsAt_idx" ON "PlayerAbsence"("playerId", "startsAt", "endsAt");
CREATE INDEX "PlayerAbsence_startsAt_endsAt_idx" ON "PlayerAbsence"("startsAt", "endsAt");

ALTER TABLE "PlayerAbsence" ADD CONSTRAINT "PlayerAbsence_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
