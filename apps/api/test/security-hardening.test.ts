import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '../src/modules/auth/controllers/auth.controller';
import { AuthService, DiscordOAuthUser } from '../src/modules/auth/services/auth.service';
import { ImageStorageService } from '../src/modules/uploads/image-storage.service';
import { createGlobalValidationPipe } from '../src/common/pipes/global-validation.pipe';
import { CreateAnnouncementDto } from '../src/modules/announcements/dto/create-announcement.dto';

test('OAuth callback stores the JWT only in an HttpOnly cookie', async () => {
  const authService = {
    createDiscordSession: async () => ({
      accessToken: 'secret-jwt',
      userId: 'user-1',
      playerId: 'player-1',
      roles: ['MEMBER'],
    }),
  } as AuthService;
  const controller = new AuthController(authService, new ConfigService({ discord: { publicUrl: 'https://app.example.test' }, app: { nodeEnv: 'test' } }));
  let redirectUrl = '';
  let cookie: { name: string; value: string; options: Record<string, unknown> } | undefined;
  const response = {
    cookie: (name: string, value: string, options: Record<string, unknown>) => { cookie = { name, value, options }; },
    redirect: (url: string) => { redirectUrl = url; },
  };

  await controller.discordCallback(
    { user: { discordId: 'discord-1', username: 'Player', accessToken: 'discord-token' } as DiscordOAuthUser },
    response as never,
  );

  assert.equal(cookie?.name, 'guild_session');
  assert.equal(cookie?.value, 'secret-jwt');
  assert.equal(cookie?.options.httpOnly, true);
  assert.equal(cookie?.options.sameSite, 'lax');
  assert.equal(redirectUrl, 'https://app.example.test/login/callback');
  assert.equal(redirectUrl.includes('secret-jwt'), false);
});

test('upload storage rejects SVG content even when presented as an image', async () => {
  const storage = new ImageStorageService(new ConfigService({ IMAGE_STORAGE_PROVIDER: 'local' }));
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

  await assert.rejects(
    storage.storeValidated({ buffer: svg, size: svg.length }),
    /Only valid PNG, JPEG and WebP images are accepted/,
  );
});

test('global validation preserves the announcement batch contract', async () => {
  const payload = {
    type: 'Evento',
    title: 'BOSSES T5',
    description: 'BOSSES T5 - FLOUD - KRATERIUS',
    eventTime: '2026-06-22T23:00:00.000Z',
    timezone: 'America/Sao_Paulo',
    mentionRoleId: 'role-1',
    attendanceEventTypes: ['FLOUD', 'KRATERIUS'],
  };

  const result = await createGlobalValidationPipe().transform(payload, {
    type: 'body',
    metatype: CreateAnnouncementDto,
    data: '',
  });

  assert.deepEqual({ ...result }, payload);
});
