import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('discord.clientId') ?? '',
      clientSecret: config.get<string>('discord.clientSecret') ?? '',
      callbackURL: config.get<string>('discord.callbackUrl') ?? '',
      scope: ['identify', 'guilds', 'guilds.members.read'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: { id: string; username: string; avatar?: string | null },
  ): { discordId: string; username: string; avatar?: string | null; accessToken: string } {
    return {
      discordId: profile.id,
      username: profile.username,
      avatar: profile.avatar,
      accessToken,
    };
  }
}
