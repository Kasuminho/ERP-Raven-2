import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { PlayerClass, RecruitmentApplicationStatus } from '@prisma/client';
import { RecruitmentService } from '../src/modules/recruitment/services/recruitment.service';

describe('RecruitmentService', () => {
  it('creates and reviews applications with audit and rate limiting', async () => {
    const application = {
      id: 'app-1',
      nickname: 'Aiko',
      playerClass: PlayerClass.VANGUARD,
      dimensionalLayer: 4,
      status: RecruitmentApplicationStatus.PENDING,
    };
    const prisma = {
      recruitmentApplication: {
        create: mock.fn(async () => application),
        findMany: mock.fn(async () => [application]),
        update: mock.fn(async (_args: unknown) => ({ ...application, status: RecruitmentApplicationStatus.ACCEPTED })),
      },
    };
    const audit = { log: mock.fn(async () => undefined) };
    const service = new RecruitmentService(prisma as never, audit as never);

    const created = await service.createApplication({
      nickname: 'Aiko',
      playerClass: PlayerClass.VANGUARD,
      combatPower: 12345,
      dimensionalLayer: 4,
      availability: 'noite',
      focus: 'PvP',
      experience: 'Jogo desde o lancamento.',
      rulesAccepted: true,
    }, '127.0.0.1');
    const reviewed = await service.review('app-1', 'staff-1', RecruitmentApplicationStatus.ACCEPTED, 'boa composicao');

    assert.equal(created.id, 'app-1');
    assert.equal(reviewed.status, RecruitmentApplicationStatus.ACCEPTED);
    assert.equal(audit.log.mock.calls[0].arguments[0].action, 'RECRUITMENT_APPLICATION_CREATED');
    assert.equal(audit.log.mock.calls[1].arguments[0].action, 'RECRUITMENT_APPLICATION_REVIEWED');

    await service.createApplication({
      nickname: 'Aiko2',
      playerClass: PlayerClass.VANGUARD,
      combatPower: 12345,
      dimensionalLayer: 4,
      availability: 'noite',
      focus: 'PvP',
      experience: 'Jogo desde o lancamento.',
      rulesAccepted: true,
    }, '127.0.0.1');
    await service.createApplication({
      nickname: 'Aiko3',
      playerClass: PlayerClass.VANGUARD,
      combatPower: 12345,
      dimensionalLayer: 4,
      availability: 'noite',
      focus: 'PvP',
      experience: 'Jogo desde o lancamento.',
      rulesAccepted: true,
    }, '127.0.0.1');
    await assert.rejects(() => service.createApplication({
      nickname: 'Aiko4',
      playerClass: PlayerClass.VANGUARD,
      combatPower: 12345,
      dimensionalLayer: 4,
      availability: 'noite',
      focus: 'PvP',
      experience: 'Jogo desde o lancamento.',
      rulesAccepted: true,
    }, '127.0.0.1'), /Too many recruitment/);
  });

  it('converts accepted applications into players with onboarding audit trail', async () => {
    const application = {
      id: 'app-1',
      nickname: 'Aiko',
      discordTag: 'aiko#0001',
      playerClass: PlayerClass.VANGUARD,
      combatPower: 12345,
      dimensionalLayer: 4,
      availability: 'noite',
      focus: 'PvP frontline',
      experience: 'Jogo desde o lancamento.',
      status: RecruitmentApplicationStatus.ACCEPTED,
      convertedPlayerId: null,
    };
    const player = {
      id: 'player-1',
      nickname: 'Aiko',
      class: PlayerClass.VANGUARD,
      dimensionalLayer: 4,
      combatPower: 12345,
      combatProfile: { playerId: 'player-1' },
    };
    const tx = {
      recruitmentApplication: {
        findUnique: mock.fn(async () => application),
        update: mock.fn(async () => ({ ...application, status: RecruitmentApplicationStatus.CONVERTED, convertedPlayerId: player.id })),
      },
      user: {
        findUnique: mock.fn(async () => ({ id: 'user-1' })),
      },
      player: {
        findFirst: mock.fn(async () => null),
        create: mock.fn(async () => player),
      },
      playerStaffNote: {
        create: mock.fn(async () => ({ id: 'note-1' })),
      },
      auditLog: {
        create: mock.fn(async () => ({ id: 'audit-1' })),
      },
    };
    const prisma = {
      $transaction: mock.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const audit = { log: mock.fn(async () => undefined) };
    const service = new RecruitmentService(prisma as never, audit as never);

    const converted = await service.convert('app-1', 'staff-1', {
      userId: 'user-1',
      onboardingNote: 'Entrar no grupo de presenca.',
    });

    assert.equal((converted as { status: RecruitmentApplicationStatus }).status, RecruitmentApplicationStatus.CONVERTED);
    assert.equal(tx.player.create.mock.calls[0].arguments[0].data.nickname, 'Aiko');
    assert.equal(tx.player.create.mock.calls[0].arguments[0].data.combatProfile.create.primaryClass, PlayerClass.VANGUARD);
    assert.equal(tx.playerStaffNote.create.mock.callCount(), 1);
    assert.equal(tx.auditLog.create.mock.calls[0].arguments[0].data.action, 'RECRUITMENT_APPLICATION_CONVERTED');
  });
});
