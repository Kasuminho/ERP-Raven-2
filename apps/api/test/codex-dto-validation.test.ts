import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateCodexRequestDto, RejectCodexRequestDto } from '../src/modules/codex/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Codex DTO validation', () => {
  it('accepts valid codex request payloads', async () => {
    const result = await strictPipe.transform(
      { imageUrl: '/uploads/codex/example.webp', note: 'Print novo do codex.' },
      { type: 'body', metatype: CreateCodexRequestDto },
    );

    assert.ok(result instanceof CreateCodexRequestDto);
    assert.equal(result.imageUrl, '/uploads/codex/example.webp');
    assert.equal(result.note, 'Print novo do codex.');
  });

  it('rejects unknown fields under the local strict pipe', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { imageUrl: '/uploads/codex/example.webp', surprise: 'nope' },
        { type: 'body', metatype: CreateCodexRequestDto },
      ),
      BadRequestException,
    );
  });

  it('rejects too-short cancellation reasons', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { reason: 'no' },
        { type: 'body', metatype: RejectCodexRequestDto },
      ),
      BadRequestException,
    );
  });
});
