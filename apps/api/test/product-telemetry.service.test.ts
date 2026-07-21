import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ProductTelemetryQueryDto } from '../src/modules/operations/dto/product-telemetry-query.dto';
import { ProductTelemetryService } from '../src/modules/operations/services/product-telemetry.service';

const hour = 60 * 60 * 1000;
const at = (value: string) => new Date(value);

describe('ProductTelemetryService', () => {
  it('returns aggregate funnels and operational durations without identities or private text', async () => {
    const now = at('2026-07-21T12:00:00.000Z');
    const prisma = {
      recruitmentApplication: { findMany: async () => [
        { status: 'CONVERTED', createdAt: new Date(now.getTime() - 72 * hour), reviewedAt: new Date(now.getTime() - 48 * hour), convertedAt: new Date(now.getTime() - 24 * hour) },
        { status: 'PENDING', createdAt: new Date(now.getTime() - 12 * hour), reviewedAt: null, convertedAt: null },
      ] },
      playerOnboardingPlan: { findMany: async () => [
        { startedAt: new Date(now.getTime() - 48 * hour), completedAt: new Date(now.getTime() - 24 * hour) },
        { startedAt: new Date(now.getTime() - 12 * hour), completedAt: null },
      ] },
      staffTask: { findMany: async () => [
        { status: 'DONE', createdAt: new Date(now.getTime() - 10 * hour), completedAt: new Date(now.getTime() - 2 * hour) },
        { status: 'OPEN', createdAt: new Date(now.getTime() - hour), completedAt: null },
      ] },
      event: { findMany: async () => [
        {
          startsAt: new Date(now.getTime() + 12 * hour),
          rsvps: [
            { status: 'CONFIRMED', createdAt: now },
            { status: 'DECLINED', createdAt: new Date(now.getTime() + 2 * hour) },
          ],
        },
      ] },
      auction: { findMany: async () => [
        { status: 'FINISHED', createdAt: new Date(now.getTime() - 20 * hour), dropHistory: { deliveredAt: new Date(now.getTime() - 8 * hour) } },
        { status: 'OPEN', createdAt: new Date(now.getTime() - hour), dropHistory: null },
      ] },
      itemRequest: { findMany: async () => [{ remainingQuantity: 0 }, { remainingQuantity: 2 }] },
      itemInterestPost: { findMany: async () => [{ status: 'DELIVERED' }, { status: 'OPEN' }] },
    };
    const service = new ProductTelemetryService(prisma as never);

    const summary = await service.getSummary(30, now);

    assert.deepEqual(summary.privacy, {
      aggregationOnly: true,
      containsPlayerIdentity: false,
      containsPrivateText: false,
    });
    assert.equal(summary.recruitment.applications, 2);
    assert.equal(summary.recruitment.converted, 1);
    assert.equal(summary.recruitment.averageReviewHours, 24);
    assert.equal(summary.onboarding.completionRatePercent, 50);
    assert.equal(summary.commitments.responses, 2);
    assert.equal(summary.commitments.averageResponseLeadHours, 11);
    assert.equal(summary.staffWork.averageCompletionHours, 8);
    assert.equal(summary.lootOperations.auctionDeliveries, 1);
    assert.equal(summary.lootOperations.averageAuctionDeliveryHours, 12);
    assert.equal(summary.lootOperations.itemRequestsFulfilled, 1);
    assert.equal(JSON.stringify(summary).includes('nickname'), false);
    assert.equal(JSON.stringify(summary).includes('note'), false);
  });

  it('validates a bounded window and rejects unknown query fields', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    const query = await pipe.transform({ days: '30' }, { type: 'query', metatype: ProductTelemetryQueryDto });

    assert.equal(query.days, 30);
    await assert.rejects(
      () => pipe.transform({ days: 365 }, { type: 'query', metatype: ProductTelemetryQueryDto }),
      BadRequestException,
    );
    await assert.rejects(
      () => pipe.transform({ days: 30, playerId: 'secret' }, { type: 'query', metatype: ProductTelemetryQueryDto }),
      BadRequestException,
    );
  });
});
