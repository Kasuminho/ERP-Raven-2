import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { DKPTransactionType } from '@prisma/client';
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
  return { service: new DkpService(repository as never, { log: mock.fn(async () => undefined) } as never), repository };
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
});
