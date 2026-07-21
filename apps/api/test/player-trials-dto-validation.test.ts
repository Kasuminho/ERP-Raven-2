import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CompletePlayerTrialCheckInDto, CreatePlayerTrialDto, DecidePlayerTrialDto } from '../src/modules/player-trials/dto';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
const criterion = { key: 'TEAMWORK', titlePt: 'Trabalho em equipe', titleEn: 'Teamwork', descriptionPt: 'Segue os combinados.', descriptionEn: 'Follows agreements.', isRequired: true, displayOrder: 0 };

test('trial publication requires dates and bilingual criteria', async () => {
  const valid = { playerId: 'player-1', objectivePt: 'Validar adaptacao.', objectiveEn: 'Validate adaptation.', plannedStartAt: '2026-07-21', plannedEndAt: '2026-08-21', criteria: [criterion] };
  const result = await pipe.transform(valid, { type: 'body', metatype: CreatePlayerTrialDto });
  assert.equal(result.criteria[0].titleEn, 'Teamwork');
  await assert.rejects(() => pipe.transform({ ...valid, criteria: [{ ...criterion, descriptionEn: '' }] }, { type: 'body', metatype: CreatePlayerTrialDto }), BadRequestException);
});

test('trial check-ins and decisions require player-visible PT-BR and EN reasons', async () => {
  await pipe.transform({ bodyPt: 'Evidencia factual.', bodyEn: 'Factual evidence.', internalNote: 'Contexto Staff.' }, { type: 'body', metatype: CompletePlayerTrialCheckInDto });
  await pipe.transform({ decision: 'EXTEND', reasonPt: 'Precisa de mais tempo.', reasonEn: 'Needs more time.', extendedEndAt: '2026-09-01' }, { type: 'body', metatype: DecidePlayerTrialDto });
  await assert.rejects(() => pipe.transform({ decision: 'APPROVE', reasonPt: 'Aprovado.', reasonEn: '' }, { type: 'body', metatype: DecidePlayerTrialDto }), BadRequestException);
});
