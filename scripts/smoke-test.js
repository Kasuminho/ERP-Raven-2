const fs = require('node:fs');
const jwt = require('jsonwebtoken');
const { PrismaClient, AuctionStatus, DKPTransactionType } = require('@prisma/client');

const API_URL = process.env.SMOKE_API_URL ?? 'http://localhost:3000/api/v1';
const prisma = new PrismaClient();

function envValue(key) {
  if (process.env[key]) return process.env[key];
  if (!fs.existsSync('.env')) return undefined;
  const line = fs.readFileSync('.env', 'utf8').split(/\r?\n/).find((row) => row.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

async function request(path, token) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const text = await response.text();
  return { path, status: response.status, text };
}

async function main() {
  const health = await Promise.all([
    request('/auctions/health'),
    request('/items/health'),
    request('/eligibility/health'),
    request('/audit/health'),
  ]);
  const failedHealth = health.filter((item) => item.status !== 200);

  if (failedHealth.length > 0) {
    throw new Error(`Health checks failed: ${JSON.stringify(failedHealth)}`);
  }

  const staffUser = await prisma.user.findFirst({
    where: { players: { some: { roles: { some: { role: { name: { in: ['STAFF', 'ADMIN'] } } } } } } },
  });
  const secret = envValue('JWT_ACCESS_SECRET');

  if (!staffUser || !secret) {
    throw new Error('Smoke test requires a STAFF/ADMIN user and JWT_ACCESS_SECRET.');
  }

  const token = jwt.sign(
    { sub: staffUser.id, discordId: staffUser.discordId, username: staffUser.discordUsername },
    secret,
    { expiresIn: '15m' },
  );
  const protectedChecks = await Promise.all([
    request('/players/me', token),
    request('/staff/reviews', token),
    request('/drops/pending-auction-deliveries', token),
    request('/announcements', token),
  ]);
  const failedProtected = protectedChecks.filter((item) => item.status !== 200);

  if (failedProtected.length > 0) {
    throw new Error(`Protected checks failed: ${JSON.stringify(failedProtected)}`);
  }

  const activeLocks = await prisma.dKPLock.findMany({
    where: { released: false },
    select: { id: true, auctionId: true, playerId: true, amount: true },
    take: 500,
  });
  const badLocks = [];

  for (const lock of activeLocks) {
    const bid = await prisma.auctionBid.findUnique({
      where: { auctionId_playerId: { auctionId: lock.auctionId, playerId: lock.playerId } },
    });

    if (!bid || !bid.isValid || bid.bidAmount !== lock.amount) {
      badLocks.push({ lock, bid });
    }
  }

  const invalidActiveLocks = await prisma.dKPLock.count({
    where: {
      released: false,
      auction: { status: { in: [AuctionStatus.FINISHED, AuctionStatus.CANCELLED, AuctionStatus.RELISTED] } },
    },
  });
  const wins = await prisma.dKPTransaction.findMany({
    where: { type: DKPTransactionType.AUCTION_WIN, referenceId: { not: null } },
    select: { referenceId: true },
    take: 500,
  });
  const deliveredDrops = await prisma.dropHistory.findMany({
    where: { auctionId: { not: null } },
    select: { auctionId: true },
  });
  const deliveredAuctionIds = new Set(deliveredDrops.map((drop) => drop.auctionId));
  const pendingDeliveries = wins.filter((win) => win.referenceId && !deliveredAuctionIds.has(win.referenceId)).length;

  if (badLocks.length > 0 || invalidActiveLocks > 0) {
    throw new Error(`DKP lock integrity failed: ${JSON.stringify({ badLocks: badLocks.length, invalidActiveLocks })}`);
  }

  console.log(JSON.stringify({
    ok: true,
    health: health.length,
    protectedChecks: protectedChecks.length,
    activeLocks: activeLocks.length,
    pendingDeliveries,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
