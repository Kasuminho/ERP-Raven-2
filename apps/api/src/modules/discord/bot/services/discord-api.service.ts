import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type DiscordOAuthProfile = {
  id: string;
  username: string;
  avatar?: string | null;
};

export type DiscordGuildMember = {
  user?: DiscordOAuthProfile;
  nick?: string | null;
  roles: string[];
};

@Injectable()
export class DiscordApiService {
  private readonly logger = new Logger(DiscordApiService.name);
  private readonly apiBase = 'https://discord.com/api/v10';

  constructor(private readonly config: ConfigService) {}

  async getCurrentUser(accessToken: string): Promise<DiscordOAuthProfile> {
    return this.get<DiscordOAuthProfile>('/users/@me', accessToken);
  }

  async getCurrentUserGuildMember(accessToken: string): Promise<DiscordGuildMember | null> {
    const guildId = this.config.get<string>('discord.guildId');

    if (!guildId) {
      return null;
    }

    return this.get<DiscordGuildMember>(`/users/@me/guilds/${guildId}/member`, accessToken);
  }

  async getGuildMember(discordId: string): Promise<DiscordGuildMember | null> {
    const guildId = this.config.get<string>('discord.guildId');
    const botToken = this.config.get<string>('discord.botToken');

    if (!guildId || !botToken) {
      return null;
    }

    return this.get<DiscordGuildMember>(`/guilds/${guildId}/members/${discordId}`, botToken, 'Bot');
  }

  async getGuildRoles(): Promise<Array<{ id: string; name: string }>> {
    const guildId = this.config.get<string>('discord.guildId');
    const botToken = this.config.get<string>('discord.botToken');

    if (!guildId || !botToken) {
      return [];
    }

    return this.get<Array<{ id: string; name: string }>>(`/guilds/${guildId}/roles`, botToken, 'Bot');
  }

  private async get<T>(path: string, token: string, scheme = 'Bearer'): Promise<T> {
    const response = await fetch(`${this.apiBase}${path}`, {
      headers: {
        Authorization: `${scheme} ${token}`,
      },
    });

    if (!response.ok) {
      this.logger.warn(`discord_api_failed path=${path} status=${response.status}`);
      throw new Error(`Discord API request failed with status ${response.status}.`);
    }

    return response.json() as Promise<T>;
  }
}
