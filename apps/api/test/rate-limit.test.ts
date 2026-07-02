import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryRateLimitStore } from '../src/common/rate-limit/rate-limit.store';

describe('InMemoryRateLimitStore', () => {
  it('tracks hits by key and limits only after the configured quota', () => {
    const store = new InMemoryRateLimitStore();
    const first = store.hit('auth:127.0.0.1', 1_000, 60_000, 2);
    const second = store.hit('auth:127.0.0.1', 2_000, 60_000, 2);
    const third = store.hit('auth:127.0.0.1', 3_000, 60_000, 2);
    const otherKey = store.hit('auth:10.0.0.2', 4_000, 60_000, 2);

    assert.equal(first.count, 1);
    assert.equal(first.remaining, 1);
    assert.equal(first.limited, false);
    assert.equal(second.count, 2);
    assert.equal(second.remaining, 0);
    assert.equal(second.limited, false);
    assert.equal(third.count, 3);
    assert.equal(third.remaining, 0);
    assert.equal(third.limited, true);
    assert.equal(otherKey.count, 1);
    assert.equal(otherKey.limited, false);
  });

  it('opens a new bucket after the reset window', () => {
    const store = new InMemoryRateLimitStore();

    store.hit('upload:127.0.0.1', 1_000, 10_000, 1);
    const limited = store.hit('upload:127.0.0.1', 2_000, 10_000, 1);
    const reset = store.hit('upload:127.0.0.1', 11_000, 10_000, 1);

    assert.equal(limited.limited, true);
    assert.equal(reset.count, 1);
    assert.equal(reset.limited, false);
    assert.equal(reset.resetAt, 21_000);
  });

  it('can prune expired buckets for long-running processes', () => {
    const store = new InMemoryRateLimitStore();

    store.hit('auth:old', 1_000, 10_000, 1);
    store.hit('auth:fresh', 20_000, 10_000, 1);

    assert.equal(store.prune(12_000), 1);
    assert.equal(store.prune(12_000), 0);
  });
});
