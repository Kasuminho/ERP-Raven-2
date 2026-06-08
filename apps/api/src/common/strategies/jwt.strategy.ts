import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('auth.jwtAccessSecret'),
    });
  }

  validate(payload: { sub: string; username: string; discordId?: string }): { userId: string; username: string; discordId?: string } {
    return { userId: payload.sub, username: payload.username, discordId: payload.discordId };
  }
}
