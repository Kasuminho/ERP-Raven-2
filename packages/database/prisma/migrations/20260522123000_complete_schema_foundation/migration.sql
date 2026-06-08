-- CreateEnum
CREATE TYPE "PlayerClass" AS ENUM ('GUNSLINGER', 'BERSERKER', 'DESTROYER', 'DEATHBRINGER', 'ASSASSIN', 'DIVINE_CASTER', 'NIGHT_RANGER', 'VANGUARD', 'ELEMENTALIST', 'WARLORD');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('LUNOS', 'RIGRETO', 'GARDRON', 'BELLAMONICA', 'SION', 'ISTERIA', 'NIDROK', 'MORGON', 'GUILD_DUNGEON', 'SATURDAY_EVENT', 'ABYSS_1', 'ABYSS_1_2', 'FLOUD', 'KRATERIUS', 'T3_ROTATION');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('OPEN', 'ATTENDANCE_REGISTRATION', 'FINALIZED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('OPEN', 'PENDING_REVIEW', 'FINISHED', 'CANCELLED', 'RELISTED');

-- CreateEnum
CREATE TYPE "AuctionMode" AS ENUM ('STANDARD', 'ALL_IN', 'STAFF_REVIEW');

-- CreateEnum
CREATE TYPE "ItemTier" AS ENUM ('T2', 'T3', 'T4', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('WEAPON', 'ARMOR', 'ACCESSORY', 'CELESTIAL_STONE');

-- CreateEnum
CREATE TYPE "DKPTransactionType" AS ENUM ('EVENT_REWARD', 'AUCTION_LOCK', 'AUCTION_REFUND', 'AUCTION_WIN', 'ADMIN_ADJUSTMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "avatar" TEXT,
    "discordGuildId" TEXT,
    "discordNickname" TEXT,
    "discordRoles" JSONB,
    "lastDiscordSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "class" "PlayerClass" NOT NULL,
    "dimensionalLayer" SMALLINT NOT NULL,
    "attendancePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GuildRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRole" (
    "playerId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "PlayerRole_pkey" PRIMARY KEY ("playerId","roleId")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'OPEN',
    "dkpReward" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "dkpDistributedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAttendance" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DKPTransaction" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "DKPTransactionType" NOT NULL,
    "referenceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DKPTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DKPLock" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "released" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DKPLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "itemTier" "ItemTier" NOT NULL,
    "minimumBid" INTEGER NOT NULL,
    "auctionMode" "AuctionMode" NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'OPEN',
    "requiresStaffReview" BOOLEAN NOT NULL DEFAULT false,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reopensAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionBid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "bidAmount" INTEGER NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityRule" (
    "id" TEXT NOT NULL,
    "itemTier" "ItemTier" NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "minimumLayer" SMALLINT NOT NULL,
    "minimumDKP" INTEGER NOT NULL,
    "requiresStaffReview" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EligibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE INDEX "User_discordUsername_idx" ON "User"("discordUsername");

-- CreateIndex
CREATE INDEX "User_discordGuildId_idx" ON "User"("discordGuildId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_nickname_key" ON "Player"("nickname");

-- CreateIndex
CREATE INDEX "Player_userId_idx" ON "Player"("userId");

-- CreateIndex
CREATE INDEX "Player_class_idx" ON "Player"("class");

-- CreateIndex
CREATE INDEX "Player_dimensionalLayer_idx" ON "Player"("dimensionalLayer");

-- CreateIndex
CREATE INDEX "Player_attendancePercentage_idx" ON "Player"("attendancePercentage");

-- CreateIndex
CREATE INDEX "Player_isActive_idx" ON "Player"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GuildRole_name_key" ON "GuildRole"("name");

-- CreateIndex
CREATE INDEX "PlayerRole_roleId_idx" ON "PlayerRole"("roleId");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE INDEX "Event_finalizedAt_idx" ON "Event"("finalizedAt");

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");

-- CreateIndex
CREATE INDEX "EventAttendance_playerId_idx" ON "EventAttendance"("playerId");

-- CreateIndex
CREATE INDEX "EventAttendance_attended_idx" ON "EventAttendance"("attended");

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendance_eventId_playerId_key" ON "EventAttendance"("eventId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "DKPTransaction_playerId_type_referenceId_key" ON "DKPTransaction"("playerId", "type", "referenceId");

-- CreateIndex
CREATE INDEX "DKPTransaction_playerId_createdAt_idx" ON "DKPTransaction"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "DKPTransaction_type_idx" ON "DKPTransaction"("type");

-- CreateIndex
CREATE INDEX "DKPTransaction_referenceId_idx" ON "DKPTransaction"("referenceId");

-- CreateIndex
CREATE INDEX "DKPTransaction_createdById_idx" ON "DKPTransaction"("createdById");

-- CreateIndex
CREATE INDEX "DKPLock_auctionId_idx" ON "DKPLock"("auctionId");

-- CreateIndex
CREATE INDEX "DKPLock_released_idx" ON "DKPLock"("released");

-- CreateIndex
CREATE UNIQUE INDEX "DKPLock_playerId_auctionId_key" ON "DKPLock"("playerId", "auctionId");

-- CreateIndex
CREATE INDEX "Auction_itemType_idx" ON "Auction"("itemType");

-- CreateIndex
CREATE INDEX "Auction_itemTier_idx" ON "Auction"("itemTier");

-- CreateIndex
CREATE INDEX "Auction_auctionMode_idx" ON "Auction"("auctionMode");

-- CreateIndex
CREATE INDEX "Auction_status_idx" ON "Auction"("status");

-- CreateIndex
CREATE INDEX "Auction_endsAt_idx" ON "Auction"("endsAt");

-- CreateIndex
CREATE INDEX "Auction_reopensAt_idx" ON "Auction"("reopensAt");

-- CreateIndex
CREATE INDEX "Auction_createdById_idx" ON "Auction"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionBid_auctionId_playerId_key" ON "AuctionBid"("auctionId", "playerId");

-- CreateIndex
CREATE INDEX "AuctionBid_auctionId_createdAt_idx" ON "AuctionBid"("auctionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuctionBid_playerId_idx" ON "AuctionBid"("playerId");

-- CreateIndex
CREATE INDEX "AuctionBid_isValid_idx" ON "AuctionBid"("isValid");

-- CreateIndex
CREATE INDEX "EligibilityRule_itemType_idx" ON "EligibilityRule"("itemType");

-- CreateIndex
CREATE INDEX "EligibilityRule_requiresStaffReview_idx" ON "EligibilityRule"("requiresStaffReview");

-- CreateIndex
CREATE UNIQUE INDEX "EligibilityRule_itemTier_itemType_minimumLayer_key" ON "EligibilityRule"("itemTier", "itemType", "minimumLayer");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRole" ADD CONSTRAINT "PlayerRole_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRole" ADD CONSTRAINT "PlayerRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "GuildRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DKPTransaction" ADD CONSTRAINT "DKPTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DKPTransaction" ADD CONSTRAINT "DKPTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DKPLock" ADD CONSTRAINT "DKPLock_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DKPLock" ADD CONSTRAINT "DKPLock_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "Player" ADD CONSTRAINT "Player_dimensionalLayer_check" CHECK ("dimensionalLayer" BETWEEN 1 AND 10);

-- AddCheckConstraint
ALTER TABLE "Player" ADD CONSTRAINT "Player_attendancePercentage_check" CHECK ("attendancePercentage" BETWEEN 0 AND 100);

-- AddCheckConstraint
ALTER TABLE "EligibilityRule" ADD CONSTRAINT "EligibilityRule_minimumLayer_check" CHECK ("minimumLayer" BETWEEN 1 AND 10);

-- AddCheckConstraint
ALTER TABLE "Event" ADD CONSTRAINT "Event_dkpReward_check" CHECK ("dkpReward" >= 0);

-- AddCheckConstraint
ALTER TABLE "DKPLock" ADD CONSTRAINT "DKPLock_amount_check" CHECK ("amount" >= 0);

-- AddCheckConstraint
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_minimumBid_check" CHECK ("minimumBid" >= 0);

-- AddCheckConstraint
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_bidAmount_check" CHECK ("bidAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "EligibilityRule" ADD CONSTRAINT "EligibilityRule_minimumDKP_check" CHECK ("minimumDKP" >= 0);

