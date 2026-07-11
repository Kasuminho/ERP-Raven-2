import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PlayerClass, PlayerCombatAvailability, PlayerCombatRole } from '@prisma/client';
import { RequestCombatProfileChangeDto, ReviewCombatProfileChangeDto, UpdateCombatProfileDto } from '../src/modules/players/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Players combat profile DTO validation', () => {
  it('accepts valid Staff combat profile updates', async () => {
    const result = await strictPipe.transform(
      {
        primaryClass: PlayerClass.WARLORD,
        secondaryClass: PlayerClass.VANGUARD,
        declaredBuild: 'Frontline CC',
        preferredRole: PlayerCombatRole.FRONTLINE,
        acceptedRoles: [PlayerCombatRole.FRONTLINE, PlayerCombatRole.CALLER],
        availability: PlayerCombatAvailability.DAILY,
        publicNote: 'Pode puxar engage.',
        staffNote: 'Prioridade para Clash.',
      },
      { type: 'body', metatype: UpdateCombatProfileDto },
    );

    assert.ok(result instanceof UpdateCombatProfileDto);
    assert.equal(result.primaryClass, PlayerClass.WARLORD);
    assert.deepEqual(result.acceptedRoles, [PlayerCombatRole.FRONTLINE, PlayerCombatRole.CALLER]);
  });

  it('rejects unknown fields and invalid roles before the service sees them', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {
          primaryClass: PlayerClass.WARLORD,
          preferredRole: 'BENCH_WARMER',
          surprise: 'nope',
        },
        { type: 'body', metatype: UpdateCombatProfileDto },
      ),
      BadRequestException,
    );
  });

  it('accepts player change requests and review notes', async () => {
    const request = await strictPipe.transform(
      {
        primaryClass: PlayerClass.ELEMENTALIST,
        declaredBuild: 'Backline burst',
        preferredRole: PlayerCombatRole.BACKLINE,
        availability: PlayerCombatAvailability.WEEKENDS,
        proofImageUrl: '/uploads/combat-proof.webp',
        note: 'Troquei build para GvG.',
      },
      { type: 'body', metatype: RequestCombatProfileChangeDto },
    );

    assert.ok(request instanceof RequestCombatProfileChangeDto);
    assert.equal(request.primaryClass, PlayerClass.ELEMENTALIST);

    const review = await strictPipe.transform(
      { reviewNote: 'Aprovado com print.' },
      { type: 'body', metatype: ReviewCombatProfileChangeDto },
    );

    assert.ok(review instanceof ReviewCombatProfileChangeDto);
  });
});
