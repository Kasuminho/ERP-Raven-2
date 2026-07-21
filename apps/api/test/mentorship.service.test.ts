import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AssignMentorshipDto, CreateMentorshipHelpRequestDto } from '../src/modules/mentorship/dto';
import { MentorshipService } from '../src/modules/mentorship/mentorship.service';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
test('help request is structured by content/role and does not require a DM', async () => {
  const dto = await pipe.transform({ topic: 'ROLE', requestedRole: 'SUPPORT', body: 'Preciso praticar calls.' }, { type: 'body', metatype: CreateMentorshipHelpRequestDto });
  const audits: any[] = [];
  const prisma = { player: { findFirst: async () => ({ id: 'player-1' }) }, mentorshipHelpRequest: { create: async ({ data }: any) => ({ id: 'help-1', ...data }) } };
  const service = new MentorshipService(prisma as never, { log: async (entry: any) => audits.push(entry) } as never, {} as never);
  await service.createHelpRequest('user-1', dto);
  assert.equal(audits[0].metadata.dmRequired, false);
});

test('Staff can only assign a mentor who explicitly volunteered', async () => {
  const prisma = { player: { findFirst: async () => ({ id: 'mentee-1' }) }, mentorProfile: { findFirst: async () => null } };
  const service = new MentorshipService(prisma as never, {} as never, {} as never);
  await assert.rejects(() => service.assign('staff-1', { menteeId: 'mentee-1', mentorId: 'mentor-1' }), BadRequestException);
});

test('group assignment remains available without granting disciplinary power', async () => {
  const audits: any[] = [];
  const prisma = {
    player: { findFirst: async () => ({ id: 'mentee-1' }) },
    mentorshipAssignment: { findFirst: async () => null, create: async ({ data }: any) => ({ id: 'assignment-1', ...data }) },
  };
  const service = new MentorshipService(prisma as never, { log: async (entry: any) => audits.push(entry) } as never, { createForPlayer: async () => ({}) } as never);
  await service.assign('staff-1', await pipe.transform({ menteeId: 'mentee-1', groupName: 'Acolhimento PvE' }, { type: 'body', metatype: AssignMentorshipDto }));
  assert.equal(audits[0].metadata.disciplinaryPower, false);
  assert.equal(audits[0].metadata.staffNotesExposed, false);
});
