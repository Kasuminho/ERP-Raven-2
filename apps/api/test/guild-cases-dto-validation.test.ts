import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateGuildCaseDto, RespondGuildCaseDto, TriageGuildCaseDto } from '../src/modules/guild-cases/dto';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

test('private case DTOs enforce category, bilingual Staff response and bounded internal notes', async () => {
  const created = await pipe.transform({ category: 'QUESTION', severity: 'MEDIUM', subject: 'Regra do evento', description: 'Preciso entender a regra aplicada neste evento.' }, { type: 'body', metatype: CreateGuildCaseDto });
  assert.equal(created.category, 'QUESTION');
  await assert.rejects(() => pipe.transform({ category: 'DISCIPLINE', subject: 'Invalido', description: 'Payload que nao deve passar.' }, { type: 'body', metatype: CreateGuildCaseDto }), BadRequestException);
  await assert.rejects(() => pipe.transform({ bodyPt: 'Resposta apenas em um idioma.' }, { type: 'body', metatype: RespondGuildCaseDto }), BadRequestException);
  await assert.rejects(() => pipe.transform({ internalNote: 'x'.repeat(4001) }, { type: 'body', metatype: TriageGuildCaseDto }), BadRequestException);
});
