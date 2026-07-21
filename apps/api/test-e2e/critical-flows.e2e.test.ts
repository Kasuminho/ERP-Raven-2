import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

type JsonRecord = Record<string, unknown>;
type SeededUser = { id: string; playerId?: string; token: string };

const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
if (!e2eDatabaseUrl || !/raven2_e2e/i.test(e2eDatabaseUrl) || !/(127\.0\.0\.1|localhost|postgres)/i.test(e2eDatabaseUrl)) {
  throw new Error('E2E_DATABASE_URL must point to an isolated raven2_e2e PostgreSQL database.');
}

process.env.DATABASE_URL = e2eDatabaseUrl;
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'raven2-e2e-access-secret';
process.env.JWT_REFRESH_SECRET = 'raven2-e2e-refresh-secret';
process.env.DISCORD_BOT_TOKEN = '';
process.env.DISCORD_CLIENT_ID = 'raven2-e2e-client';
process.env.DISCORD_CLIENT_SECRET = 'raven2-e2e-secret';
process.env.DISCORD_CALLBACK_URL = 'http://127.0.0.1/e2e/discord/callback';
process.env.DISCORD_EVENTS_WEBHOOK_URL = '';
process.env.DISCORD_ANNOUNCEMENTS_WEBHOOK_URL = '';
process.env.DISCORD_AUCTIONS_WEBHOOK_URL = '';
process.env.DISCORD_DROPS_WEBHOOK_URL = '';
process.env.DISCORD_ATTENDANCE_WEBHOOK_URL = '';
process.env.DISCORD_STAFF_REVIEW_WEBHOOK_URL = '';
process.env.DISCORD_DKP_WEBHOOK_URL = '';
process.env.DISCORD_INTERESTS_WEBHOOK_URL = '';
process.env.DISCORD_ITEM_REQUESTS_WEBHOOK_URL = '';
process.env.DISCORD_STAFF_REQUESTS_WEBHOOK_URL = '';
process.env.DISCORD_UPDATES_WEBHOOK_URL = '';
process.env.DISCORD_STAFF_UPDATES_WEBHOOK_URL = '';

describe('Critical transactional flows (PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: any;
  let baseUrl: string;
  let jwt: JwtService;

  before(async () => {
    const [{ AppModule }, { PrismaService }, { createGlobalValidationPipe }] = await Promise.all([
      import('../src/app.module'),
      import('@database/prisma.service'),
      import('../src/common/pipes/global-validation.pipe'),
    ]);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    await clearDisposableDatabase();
  });

  after(async () => {
    if (prisma) await clearDisposableDatabase();
    if (app) await app.close();
  });

  it('persists the four roadmap-critical journeys end to end', async () => {
    const staffRole = await prisma.guildRole.create({ data: { name: 'STAFF' } });
    const staff = await createUser('staff-one', staffRole.id, 5);
    const reviewerTwo = await createUser('staff-two', staffRole.id, 5);
    const reviewerThree = await createUser('staff-three', staffRole.id, 5);
    const raider = await createUser('raider', undefined, 5);
    const recruitUser = await createUser('new-recruit');

    await prisma.onboardingTemplate.create({
      data: {
        name: 'E2E onboarding',
        version: 1,
        dueDays: 30,
        isActive: true,
        createdById: staff.id,
        steps: {
          create: {
            key: 'READ_RULES',
            titlePt: 'Ler regras',
            titleEn: 'Read rules',
            descriptionPt: 'Leia as regras publicadas.',
            descriptionEn: 'Read the published rules.',
            href: '/dashboard/rules',
            isRequired: true,
            completionType: 'MANUAL',
            displayOrder: 1,
          },
        },
      },
    });

    const event = await request<JsonRecord>('/events', staff.token, {
      method: 'POST',
      body: {
        name: 'E2E Rigreto',
        type: 'RIGRETO',
        startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    });
    assert.equal(event.createdById, staff.id);
    await request(`/events/${event.id}/attendance`, staff.token, {
      method: 'POST',
      body: { playerId: raider.playerId },
      expectedStatus: 201,
    });
    const finalizedEvent = await request<JsonRecord>(`/events/${event.id}/finalize`, staff.token, { method: 'POST' });
    assert.equal((finalizedEvent.event as JsonRecord).status, 'FINALIZED');
    const eventReward = await prisma.dKPTransaction.findFirst({
      where: { playerId: raider.playerId, type: 'EVENT_REWARD', referenceId: event.id },
    });
    assert.equal(eventReward?.amount, 20);

    const auctionItem = await request<JsonRecord>('/items', staff.token, {
      method: 'POST',
      body: {
        kind: 'equipment',
        category: 'T2',
        itemTier: 'T2',
        itemType: 'WEAPON',
        namePt: 'Espada transacional',
        nameEn: 'Transactional sword',
        typePt: 'Arma',
        typeEn: 'Weapon',
        preferredClasses: ['BERSERKER'],
      },
    });
    await request('/dkp/transaction', staff.token, {
      method: 'POST',
      body: { playerId: raider.playerId, amount: 1000, type: 'ADMIN_ADJUSTMENT', referenceId: 'e2e-auction-balance' },
    });
    const createdAuctions = await request<JsonRecord[]>(`/items/${auctionItem.id}/auctions`, staff.token, {
      method: 'POST',
      body: { quantity: 1 },
    });
    const auctionId = String(createdAuctions[0].id);
    await request(`/auctions/${auctionId}/bid`, raider.token, { method: 'POST', body: { amount: 650 } });
    const activeLock = await prisma.dKPLock.findUnique({
      where: { playerId_auctionId: { playerId: raider.playerId, auctionId } },
    });
    assert.equal(activeLock?.amount, 650);

    await request(`/auctions/${auctionId}/finalize`, staff.token, { method: 'POST' });
    for (const reviewer of [staff, reviewerTwo, reviewerThree]) {
      await request(`/staff/reviews/${auctionId}/approve`, reviewer.token, {
        method: 'POST',
        body: { playerId: raider.playerId },
      });
    }
    await request(`/drops/auction/${auctionId}/deliver`, staff.token, {
      method: 'POST',
      body: { proofImageUrl: '/uploads/e2e-auction-proof.png' },
    });
    const auctionState = await prisma.auction.findUnique({ where: { id: auctionId }, include: { dropHistory: true } });
    const auctionWin = await prisma.dKPTransaction.findFirst({ where: { referenceId: auctionId, type: 'AUCTION_WIN' } });
    assert.equal(auctionState?.status, 'FINISHED');
    assert.equal(auctionState?.dropHistory?.proofImageUrl, '/uploads/e2e-auction-proof.png');
    assert.equal(auctionWin?.playerId, raider.playerId);
    const privateReceipt = await request<JsonRecord>(`/auctions/${auctionId}/result/me`, raider.token);
    assert.equal(privateReceipt.deliveryStatus, 'DELIVERED');
    assert.ok(privateReceipt.deliveredAt);
    assert.equal(JSON.stringify(privateReceipt).includes(reviewerTwo.id), false);

    const requestableItem = await request<JsonRecord>('/items', staff.token, {
      method: 'POST',
      body: {
        kind: 'request',
        category: 'relic',
        namePt: 'Essencia Misteriosa de Magia',
        nameEn: 'Mysterious Essence of Magic',
        typePt: 'Reliquia',
        typeEn: 'Relic',
      },
    });
    const itemRequest = await request<JsonRecord>('/item-requests/me', raider.token, {
      method: 'POST',
      body: { itemCatalogId: requestableItem.id, quantity: 2, imageUrl: '/uploads/e2e-request.png' },
    });
    const requestDelivery = await request<JsonRecord>(`/item-requests/${itemRequest.id}/deliver`, staff.token, {
      method: 'POST',
      body: { quantity: 2, reason: 'Entrega E2E confirmada.' },
    });
    assert.equal(requestDelivery.completed, true);
    assert.equal(await prisma.itemRequest.findUnique({ where: { id: itemRequest.id } }), null);
    assert.equal(await prisma.dropHistory.count({ where: { itemCatalogId: requestableItem.id, playerId: raider.playerId } }), 2);

    const interest = await request<JsonRecord>('/item-interests', staff.token, {
      method: 'POST',
      body: {
        itemCatalogId: auctionItem.id,
        mode: 'PvE',
        closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    const entry = await request<JsonRecord>(`/item-interests/${interest.id}/declare`, raider.token, {
      method: 'POST',
      body: { imageUrl: '/uploads/e2e-interest.png', note: 'Interesse E2E.' },
    });
    await request(`/item-interests/${interest.id}/close`, staff.token, { method: 'POST' });
    for (const reviewer of [staff, reviewerTwo, reviewerThree]) {
      await request(`/item-interests/${interest.id}/vote`, reviewer.token, {
        method: 'POST',
        body: { entryId: entry.id },
      });
    }
    await request(`/item-interests/${interest.id}/deliver`, staff.token, {
      method: 'POST',
      body: { entryIds: [entry.id], proofImageUrl: '/uploads/e2e-interest-proof.png' },
    });
    const deliveredInterest = await prisma.itemInterestPost.findUnique({ where: { id: interest.id } });
    const interestDrop = await prisma.dropHistory.findUnique({ where: { itemInterestEntryId: entry.id } });
    assert.equal(deliveredInterest?.status, 'DELIVERED');
    assert.equal(interestDrop?.playerId, raider.playerId);

    const application = await request<JsonRecord>('/recruitment/applications', undefined, {
      method: 'POST',
      body: {
        nickname: 'Recruit E2E',
        discordTag: 'recruit.e2e',
        playerClass: 'NIGHT_RANGER',
        combatPower: 123456,
        dimensionalLayer: 4,
        availability: 'Noites e finais de semana',
        focus: 'PvE e bosses',
        experience: 'Experiencia suficiente para validar o fluxo transacional.',
        rulesAccepted: true,
      },
    });
    await request(`/recruitment/staff/applications/${application.id}/review`, staff.token, {
      method: 'POST',
      body: { status: 'ACCEPTED', reviewNote: 'Aprovado no E2E.' },
    });
    const converted = await request<JsonRecord>(`/recruitment/staff/applications/${application.id}/convert`, staff.token, {
      method: 'POST',
      body: { userId: recruitUser.id, nickname: 'Recruit E2E', onboardingNote: 'Iniciar onboarding transacional.' },
    });
    assert.equal(converted.status, 'CONVERTED');
    const recruitedPlayer = await prisma.player.findFirst({ where: { userId: recruitUser.id }, include: { onboardingPlan: { include: { steps: true } } } });
    assert.equal(recruitedPlayer?.onboardingPlan?.steps.length, 1);
    assert.equal(recruitedPlayer?.onboardingPlan?.steps[0].key, 'READ_RULES');
  });

  async function createUser(label: string, roleId?: string, dimensionalLayer?: number): Promise<SeededUser> {
    const user = await prisma.user.create({
      data: {
        discordId: `e2e-${label}`,
        discordUsername: label,
        preferredLocale: 'pt',
        players: dimensionalLayer
          ? {
              create: {
                nickname: `E2E ${label}`,
                class: label === 'raider' ? 'BERSERKER' : 'VANGUARD',
                dimensionalLayer,
                combatPower: 500000,
                attendancePercentage: 100,
                roles: roleId ? { create: { role: { connect: { id: roleId } } } } : undefined,
              },
            }
          : undefined,
      },
      include: { players: true },
    });
    return {
      id: user.id,
      playerId: user.players[0]?.id,
      token: jwt.sign({ sub: user.id, username: user.discordUsername, discordId: user.discordId }),
    };
  }

  async function request<T = JsonRecord>(
    path: string,
    token?: string,
    options: { method?: string; body?: unknown; expectedStatus?: number } = {},
  ): Promise<T> {
    const response = await fetch(`${baseUrl}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Connection: 'close',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : undefined;
    const expected = options.expectedStatus ?? (options.method && options.method !== 'GET' ? 201 : 200);
    assert.equal(response.status, expected, `${options.method ?? 'GET'} ${path}: ${text}`);
    return payload as T;
  }

  async function clearDisposableDatabase(): Promise<void> {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
    ) as Array<{ tablename: string }>;
    if (rows.length === 0) return;
    const tables = rows.map(({ tablename }: { tablename: string }) => `"${tablename.replaceAll('"', '""')}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  }
});
