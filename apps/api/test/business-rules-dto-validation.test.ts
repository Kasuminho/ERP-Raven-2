import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { BusinessRuleKeyParamDto, CreateGuildPolicyDraftDto, UpdateBusinessRuleDto, UpdateGuildPolicyDraftDto } from '../src/modules/business-rules/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Business rules DTO validation', () => {
  it('accepts known business rule keys and flexible values', async () => {
    const params = await strictPipe.transform(
      { key: 'maintenanceMode' },
      { type: 'param', metatype: BusinessRuleKeyParamDto },
    );

    assert.ok(params instanceof BusinessRuleKeyParamDto);
    assert.equal(params.key, 'maintenanceMode');

    const body = await strictPipe.transform(
      { value: { enabled: true, message: 'Pausa operacional.' } },
      { type: 'body', metatype: UpdateBusinessRuleDto },
    );

    assert.ok(body instanceof UpdateBusinessRuleDto);
    assert.deepEqual(body.value, { enabled: true, message: 'Pausa operacional.' });
  });

  it('rejects unknown rule keys before the service sees them', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { key: 'unknownRule' },
        { type: 'param', metatype: BusinessRuleKeyParamDto },
      ),
      BadRequestException,
    );
  });

  it('rejects missing value and unknown body fields under the local strict pipe', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {},
        { type: 'body', metatype: UpdateBusinessRuleDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { value: { enabled: false }, actorId: 'secret' },
        { type: 'body', metatype: UpdateBusinessRuleDto },
      ),
      BadRequestException,
    );
  });

  it('validates bilingual policy draft metadata and effective date', async () => {
    const result = await strictPipe.transform({
      titlePt: 'Politica de loot',
      titleEn: 'Loot policy',
      summaryPt: 'Resumo operacional publicado.',
      summaryEn: 'Published operational summary.',
      effectiveAt: '2026-08-01T12:00:00.000Z',
    }, { type: 'body', metatype: CreateGuildPolicyDraftDto });
    assert.ok(result instanceof CreateGuildPolicyDraftDto);
    await assert.rejects(
      () => strictPipe.transform({ ...result, effectiveAt: 'amanha', leaked: true }, { type: 'body', metatype: CreateGuildPolicyDraftDto }),
      BadRequestException,
    );
  });

  it('requires a bounded reason for emergency policy drafts', async () => {
    const base = {
      titlePt: 'Mudanca emergencial',
      titleEn: 'Emergency change',
      summaryPt: 'Resumo operacional publicado.',
      summaryEn: 'Published operational summary.',
      effectiveAt: '2026-08-01T12:00:00.000Z',
      isEmergency: true,
    };
    await assert.rejects(
      () => strictPipe.transform(base, { type: 'body', metatype: CreateGuildPolicyDraftDto }),
      BadRequestException,
    );
    const result = await strictPipe.transform(
      { ...base, emergencyReason: 'Correcao urgente de uma regra operacional.' },
      { type: 'body', metatype: CreateGuildPolicyDraftDto },
    );
    assert.equal(result.isEmergency, true);
    await assert.rejects(
      () => strictPipe.transform(
        { emergencyReason: 'x'.repeat(501) },
        { type: 'body', metatype: UpdateGuildPolicyDraftDto },
      ),
      BadRequestException,
    );
  });
});
