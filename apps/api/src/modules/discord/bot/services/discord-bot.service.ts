import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GatewayIntentBits, MessageCreateOptions, TextChannel } from 'discord.js';

@Injectable()
export class DiscordBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordBotService.name);
  private readonly client: Client;
  private ready = false;

  constructor(private readonly config: ConfigService) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    const token = this.config.get<string>('discord.botToken');

    if (!token) {
      this.logger.warn('discord_bot_disabled=no_token');
      return;
    }

    this.client.once('ready', () => {
      this.ready = true;
      this.logger.log(`discord_bot_ready user=${this.client.user?.tag ?? 'unknown'}`);
    });

    await this.client.login(token);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.ready) {
      await this.client.destroy();
    }
  }

  async sendChannelMessage(channelId: string, payload: string | MessageCreateOptions): Promise<void> {
    if (!channelId || !this.ready) {
      return;
    }

    const channel = await this.client.channels.fetch(channelId);

    if (!channel || !('send' in channel)) {
      return;
    }

    await (channel as TextChannel).send(payload);
  }

  async sendDirectMessage(discordId: string, payload: string | MessageCreateOptions): Promise<void> {
    if (!discordId || !this.ready) {
      return;
    }

    const user = await this.client.users.fetch(discordId);
    await user.send(payload);
  }
}
