CREATE TYPE "LeadershipArea" AS ENUM ('EVENTS', 'LOOT', 'RECRUITMENT', 'DISCORD', 'DEPLOY', 'TREASURY', 'PLAYER_CARE');
CREATE TABLE "LeadershipCheckIn" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "area" "LeadershipArea" NOT NULL, "workload" SMALLINT NOT NULL, "availableOnCall" BOOLEAN NOT NULL, "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LeadershipCheckIn_pkey" PRIMARY KEY ("id"));
CREATE INDEX "LeadershipCheckIn_area_createdAt_idx" ON "LeadershipCheckIn"("area", "createdAt");
CREATE INDEX "LeadershipCheckIn_userId_area_createdAt_idx" ON "LeadershipCheckIn"("userId", "area", "createdAt");
ALTER TABLE "LeadershipCheckIn" ADD CONSTRAINT "LeadershipCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
