import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

function cookieToken(request?: Request): string | null {
  const cookieHeader = request?.headers.cookie;
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(';')) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name === 'guild_session') return decodeURIComponent(valueParts.join('='));
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieToken,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('auth.jwtAccessSecret'),
    });
  }

  validate(payload: { sub: string; username: string; discordId?: string }): { userId: string; username: string; discordId?: string } {
    return { userId: payload.sub, username: payload.username, discordId: payload.discordId };
  }
}
