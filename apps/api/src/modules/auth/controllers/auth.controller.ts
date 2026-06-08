import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService, AuthSession, DiscordOAuthUser } from '../services/auth.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('discord/login')
  @UseGuards(AuthGuard('discord'))
  discordLoginAlias(): void {}

  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  discordLogin(): void {}

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  async discordCallback(@Req() req: { user: DiscordOAuthUser }, @Res() res: Response): Promise<void> {
    const session = await this.authService.createDiscordSession(req.user);
    const callbackUrl = this.webCallbackUrl(session);
    res.redirect(callbackUrl);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: unknown }): unknown {
    return req.user;
  }

  private webCallbackUrl(session: AuthSession): string {
    const publicUrl = this.config.get<string>('discord.publicUrl') || 'http://localhost:5173';
    const url = new URL('/login/callback', publicUrl);
    url.searchParams.set('token', session.accessToken);
    url.searchParams.set('userId', session.userId);

    if (session.playerId) {
      url.searchParams.set('playerId', session.playerId);
    }

    url.searchParams.set('roles', session.roles.join(','));

    return url.toString();
  }
}
