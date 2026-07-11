import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { AuctionMode, AuctionStatus, DKPTransactionType, DkpPolicySimulationStatus, DkpPolicySimulationType, ItemTier, ItemType } from '@prisma/client';
import { DkpService } from '../src/modules/dkp/services/dkp.service';
import { DuplicateDkpLockException, InsufficientDkpException, InvalidDkpLockException, InvalidDkpTransactionException } from '../src/modules/dkp/exceptions/dkp-domain.exceptions';

function makeService(overrides: Record<string, unknown> = {}) {
  const repository = {
    sumTransactions: mock.fn(async () => 1000), sumActiveLocks: mock.fn(async () => 200),
    findLockByPlayerAndAuction: mock.fn(async () => null),
    createLock: mock.fn(async () => ({ id: 'lock-1', playerId: 'p1', auctionId: 'a1', amount: 300, released: false })),
    createTransaction: mock.fn(async (data: any) => ({ id: 'tx-1', playerId: data.player.connect.id, amount: data.amount })),
    client: {}, ...overrides,
  };
  return {
    service: new DkpService(
      repository as never,
      { log: mock.fn(async () => undefined) } as never,
      { updateRule: mock.fn(async () => ({ id: 'rule-1', key: 'dkpBidPolicy' })) } as never,
    ),
    repository,
  };
}

describe('DkpService invariants', () => {
  it('calculates available DKP after active locks', async () => {
    assert.equal(await makeService().service.calculateAvailableDKP('p1'), 800);
  });

  it('rejects invalid lock amounts before persistence', async () => {
    const { service } = makeService();
    await assert.rejects(service.lockDKPWithinTransaction('p1', 'a1', 0, {} as never), InvalidDkpLockException);
    await assert.rejects(service.lockDKPWithinTransaction('p1', 'a1', 2.5, {} as never), InvalidDkpLockException);
  });

  it('rejects duplicate and unaffordable auction locks', async () => {
    const duplicate = makeService({ findLockByPlayerAndAuction: mock.fn(async () => ({ id: 'existing' })) });
    await assert.rejects(duplicate.service.lockDKPWithinTransaction('p1', 'a1', 300, {} as never), DuplicateDkpLockException);
    const poor = makeService({ sumTransactions: mock.fn(async () => 250), sumActiveLocks: mock.fn(async () => 50) });
    await assert.rejects(poor.service.lockDKPWithinTransaction('p1', 'a1', 201, {} as never), InsufficientDkpException);
  });

  it('persists a valid lock with the exact requested amount', async () => {
    const { service, repository } = makeService();
    assert.equal((await service.lockDKPWithinTransaction('p1', 'a1', 300, {} as never)).amount, 300);
    assert.equal(repository.createLock.mock.callCount(), 1);
  });

  it('rejects malformed and overdrawn transactions', async () => {
    const { service } = makeService({ sumTransactions: mock.fn(async () => 100), sumActiveLocks: mock.fn(async () => 0) });
    const base = { playerId: 'p1', createdById: 'staff', type: DKPTransactionType.ADMIN_ADJUSTMENT };
    await assert.rejects(service.createTransactionWithinTransaction({ ...base, amount: 0 }, {} as never), InvalidDkpTransactionException);
    await assert.rejects(service.createTransactionWithinTransaction({ ...base, amount: -101 }, {} as never), InsufficientDkpException);
  });

  it('builds the Staff economy snapshot with distribution and risk signals', async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const transactions = [
      { playerId: 'p1', amount: 1000, type: DKPTransactionType.EVENT_REWARD, createdAt: old, player: { id: 'p1', nickname: 'Aiko' } },
      { playerId: 'p2', amount: 120, type: DKPTransactionType.EVENT_REWARD, createdAt: recent, player: { id: 'p2', nickname: 'Brann' } },
      { playerId: 'p2', amount: -60, type: DKPTransactionType.AUCTION_WIN, createdAt: recent, player: { id: 'p2', nickname: 'Brann' } },
      { playerId: 'p3', amount: 40, type: DKPTransactionType.ADMIN_ADJUSTMENT, createdAt: recent, player: { id: 'p3', nickname: 'Cora' } },
    ];
    const aggregateAmount = (where: any) => {
      const filtered = transactions.filter((transaction) => {
        if (where?.amount?.gt !== undefined && !(transaction.amount > where.amount.gt)) return false;
        if (where?.amount?.lt !== undefined && !(transaction.amount < where.amount.lt)) return false;
        if (where?.type !== undefined && transaction.type !== where.type) return false;
        return true;
      });
      return filtered.reduce((sum, transaction) => sum + transaction.amount, 0);
    };
    const { service } = makeService({
      sumTransactions: mock.fn(async (playerId: string) => {
        if (playerId === 'p1') return 1000;
        if (playerId === 'p2') return 60;
        if (playerId === 'p3') return 40;
        return 0;
      }),
      sumActiveLocks: mock.fn(async (playerId: string) => (playerId === 'p1' ? 80 : 0)),
      client: {
        player: {
          count: mock.fn(async () => 3),
          findMany: mock.fn(async () => [
            { id: 'p1', nickname: 'Aiko', joinedAt: old },
            { id: 'p2', nickname: 'Brann', joinedAt: recent },
            { id: 'p3', nickname: 'Cora', joinedAt: recent },
          ]),
        },
        dKPTransaction: {
          aggregate: mock.fn(async ({ where }: any) => ({ _sum: { amount: aggregateAmount(where) } })),
          findMany: mock.fn(async () => transactions),
        },
        dKPLock: {
          aggregate: mock.fn(async () => ({ _sum: { amount: 80 } })),
          findMany: mock.fn(async () => [{ playerId: 'p1', amount: 80 }]),
        },
        eventAttendance: {
          findMany: mock.fn(async () => [{ playerId: 'p2', createdAt: recent }]),
        },
      },
    });

    const snapshot = await service.getEconomySummary();

    assert.equal(snapshot.activePlayers, 3);
    assert.equal(snapshot.averageDkp, 367);
    assert.equal(snapshot.medianDkp, 60);
    assert.equal(snapshot.totalLockedDkp, 80);
    assert.ok(snapshot.distribution.some((row) => row.bucket === '1000+' && row.players === 1));
    assert.ok(snapshot.inactiveHighDkpPlayers.some((row) => row.playerId === 'p1'));
    assert.ok(snapshot.signals.some((signal) => signal.key === 'concentration'));
    assert.ok(snapshot.markdown.includes('Snapshot economico de DKP'));
  });

  it('previews and saves DKP decay simulations without changing transactions', async () => {
    const transactions = [
      { playerId: 'p1', amount: 1000 },
      { playerId: 'p2', amount: 100 },
    ];
    const savedSimulations: unknown[] = [];
    const audit = { log: mock.fn(async () => undefined) };
    const repository = {
      client: {
        player: {
          findMany: mock.fn(async () => [
            { id: 'p1', nickname: 'Aiko' },
            { id: 'p2', nickname: 'Brann' },
          ]),
        },
        dKPTransaction: {
          findMany: mock.fn(async () => transactions),
        },
        dKPLock: {
          findMany: mock.fn(async () => []),
        },
        dkpPolicySimulation: {
          create: mock.fn(async ({ data }: any) => {
            savedSimulations.push(data);
            return { id: 'simulation-1', name: data.name };
          }),
          findMany: mock.fn(async () => []),
        },
      },
    };
    const service = new DkpService(repository as never, audit as never, { updateRule: mock.fn(async () => ({ id: 'rule-1' })) } as never);

    const preview = await service.previewDecaySimulation({ percent: 10, minimumDkp: 100 });
    assert.equal(preview.persisted, false);
    assert.equal(preview.totals.totalReduced, 90);
    assert.deepEqual(preview.topImpacted[0], {
      playerId: 'p1',
      nickname: 'Aiko',
      before: 1000,
      after: 910,
      reduced: 90,
    });

    const saved = await service.saveDecaySimulation('staff-1', { name: 'Decay teste', percent: 10, minimumDkp: 100 });
    assert.equal(saved.persisted, true);
    assert.equal(saved.simulationId, 'simulation-1');
    assert.equal(savedSimulations.length, 1);
    assert.equal(audit.log.mock.callCount(), 1);
    assert.equal(repository.client.dKPTransaction.findMany.mock.callCount(), 2);
  });

  it('previews and saves bid policy simulations from finished auction history', async () => {
    const savedSimulations: unknown[] = [];
    const audit = { log: mock.fn(async () => undefined) };
    const repository = {
      client: {
        auction: {
          findMany: mock.fn(async () => [
            {
              id: 'auction-1',
              itemName: 'Espada nervosa',
              itemTier: ItemTier.T4,
              itemType: ItemType.WEAPON,
              auctionMode: AuctionMode.STANDARD,
              status: AuctionStatus.FINISHED,
              endsAt: new Date(),
            },
            {
              id: 'auction-2',
              itemName: 'Anel caro',
              itemTier: ItemTier.LEGENDARY,
              itemType: ItemType.ACCESSORY,
              auctionMode: AuctionMode.ALL_IN,
              status: AuctionStatus.FINISHED,
              endsAt: new Date(),
            },
          ]),
        },
        dKPTransaction: {
          findMany: mock.fn(async () => [
            { referenceId: 'auction-1', amount: -500, type: DKPTransactionType.AUCTION_WIN, player: { id: 'p1', nickname: 'Aiko', dimensionalLayer: 4 } },
            { referenceId: 'auction-2', amount: -200, type: DKPTransactionType.AUCTION_WIN, player: { id: 'p2', nickname: 'Brann', dimensionalLayer: 2 } },
          ]),
        },
        dkpPolicySimulation: {
          create: mock.fn(async ({ data }: any) => {
            savedSimulations.push(data);
            return { id: 'bid-simulation-1', name: data.name };
          }),
        },
      },
    };
    const service = new DkpService(repository as never, audit as never, { updateRule: mock.fn(async () => ({ id: 'rule-1' })) } as never);

    const preview = await service.previewBidPolicySimulation({
      minimumCost: 100,
      winTaxPercent: 10,
      tierCaps: { T4: 300 },
      itemTypeCaps: { ACCESSORY: 150 },
      layerCaps: { '4': 250 },
      fixedCostByTier: { T4: 20 },
      modeMultiplierPercent: { ALL_IN: 50 },
    });

    assert.equal(preview.persisted, false);
    assert.equal(preview.totals.auctionsAnalyzed, 2);
    assert.equal(preview.totals.changedAuctions, 2);
    assert.equal(preview.totals.currentSpent, 700);
    assert.equal(preview.totals.proposedSpent, 395);
    assert.equal(preview.totals.delta, -305);
    assert.equal(preview.totals.cappedAuctions, 2);
    assert.ok(preview.risks.some((risk) => risk.key === 'spend-delta'));
    assert.ok(preview.markdown.includes('Simulacao de politica de bid'));

    const saved = await service.saveBidPolicySimulation('staff-1', {
      name: 'Cap teste',
      minimumCost: 100,
      tierCaps: { T4: 300 },
    });

    assert.equal(saved.persisted, true);
    assert.equal(saved.simulationId, 'bid-simulation-1');
    assert.equal(saved.name, 'Cap teste');
    assert.equal(savedSimulations.length, 1);
    assert.equal(audit.log.mock.callCount(), 1);
    assert.equal(repository.client.dKPTransaction.findMany.mock.callCount(), 2);
  });

  it('promotes a draft bid policy simulation into the operational business rule', async () => {
    const audit = { log: mock.fn(async () => undefined) };
    const updateRule = mock.fn(async (_key: string, value: any) => ({ id: 'rule-1', key: 'dkpBidPolicy', value }));
    const repository = {
      client: {
        dkpPolicySimulation: {
          findUnique: mock.fn(async () => ({
            id: 'simulation-1',
            type: DkpPolicySimulationType.BID_POLICY,
            status: DkpPolicySimulationStatus.DRAFT,
            name: 'Cap aprovado',
            config: {
              minimumCost: 100,
              winTaxPercent: 5,
              tierCaps: { T4: 300 },
            },
          })),
          update: mock.fn(async ({ data }: any) => ({
            id: 'simulation-1',
            status: data.status,
            promotedAt: data.promotedAt,
            promotedById: data.promotedById,
            promotionReason: data.promotionReason,
          })),
        },
      },
    };
    const service = new DkpService(repository as never, audit as never, { updateRule } as never);

    const promoted = await service.promotePolicySimulation('staff-1', 'simulation-1', {
      confirm: true,
      reason: 'Aprovado em reuniao Staff depois do teste historico.',
    });

    assert.equal(promoted.simulation.status, DkpPolicySimulationStatus.PROMOTED);
    assert.equal(promoted.businessRule.key, 'dkpBidPolicy');
    assert.equal(updateRule.mock.callCount(), 1);
    const updateCall = updateRule.mock.calls[0].arguments;
    assert.equal(updateCall[0], 'dkpBidPolicy');
    assert.equal(updateCall[1].enabled, true);
    assert.equal(updateCall[1].sourceSimulationId, 'simulation-1');
    assert.equal(updateCall[1].tierCaps.T4, 300);
    assert.equal(audit.log.mock.callCount(), 1);
  });
});
