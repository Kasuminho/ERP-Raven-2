import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SearchQueryDto } from '../src/modules/search/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Search DTO validation', () => {
  it('accepts empty and valid search queries', async () => {
    const empty = await strictPipe.transform(
      {},
      { type: 'query', metatype: SearchQueryDto },
    );

    assert.ok(empty instanceof SearchQueryDto);
    assert.equal(empty.q, undefined);

    const result = await strictPipe.transform(
      { q: 'Lunos' },
      { type: 'query', metatype: SearchQueryDto },
    );

    assert.ok(result instanceof SearchQueryDto);
    assert.equal(result.q, 'Lunos');
  });

  it('rejects unknown query fields under the local strict pipe', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { q: 'Lunos', includePlayers: 'true' },
        { type: 'query', metatype: SearchQueryDto },
      ),
      BadRequestException,
    );
  });

  it('rejects invalid query formats before the service sees them', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { q: 123 },
        { type: 'query', metatype: SearchQueryDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { q: 'x'.repeat(81) },
        { type: 'query', metatype: SearchQueryDto },
      ),
      BadRequestException,
    );
  });
});
