import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService, DiscordOAuthUser } from '../services/auth.service';
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
    this.setSessionCookie(res, session.accessToken);
    res.redirect(this.webCallbackUrl());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: { user: { userId: string; username: string; discordId?: string } }): Promise<unknown> {
    const profile = await this.authService.getSessionProfile(req.user.userId);
    return { ...req.user, ...profile };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie('guild_session', this.cookieOptions());
    return { ok: true };
  }

  private webCallbackUrl(): string {
    const publicUrl = this.config.get<string>('discord.publicUrl') || 'http://localhost:5173';
    return new URL('/login/callback', publicUrl).toString();
  }

  private setSessionCookie(res: Response, accessToken: string): void {
    res.cookie('guild_session', accessToken, { ...this.cookieOptions(), maxAge: 12 * 60 * 60 * 1000 });
  }

  private cookieOptions(): { httpOnly: true; secure: boolean; sameSite: 'lax'; path: string } {
    return {
      httpOnly: true,
      secure: this.config.get<string>('app.nodeEnv') === 'production',
      sameSite: 'lax',
      path: '/',
    };
  }
}
