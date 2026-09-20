import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Catch()
export class DiscordAuthFilter implements ExceptionFilter {
  private readonly logger = new Logger(DiscordAuthFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const publicUrl = this.config.get<string>('discord.publicUrl') || 'http://localhost:5173';

    this.logger.warn(`discord_oauth_handled_error message="${exception?.message || 'unknown'}"`);

    const loginUrl = new URL('/login', publicUrl);
    loginUrl.searchParams.set('error', 'session_expired');

    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.redirect(loginUrl.toString());
  }
}
