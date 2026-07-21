import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  MessageCreateOptions,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  TextChannel,
} from "discord.js";

@Injectable()
export class DiscordBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordBotService.name);
  private readonly client: Client;
  private ready = false;
  private readonly mirroredCommands = new Map<
    string,
    {
      definition: RESTPostAPIChatInputApplicationCommandsJSONBody;
      handler: (interaction: ChatInputCommandInteraction) => Promise<void>;
    }
  >();

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
    const token = this.config.get<string>("discord.botToken");

    if (!token) {
      this.logger.warn("discord_bot_disabled=no_token");
      return;
    }

    this.client.once("ready", () => {
      this.ready = true;
      this.logger.log(
        `discord_bot_ready user=${this.client.user?.tag ?? "unknown"}`,
      );
      void this.syncMirroredCommands();
    });
    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const command = this.mirroredCommands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.handler(interaction);
      } catch (error) {
        this.logger.error(
          `discord_mirrored_action_failed command=${interaction.commandName}`,
          error instanceof Error ? error.stack : undefined,
        );
        if (!interaction.replied && !interaction.deferred)
          await interaction.reply({
            content:
              "Nao foi possivel salvar. Revise no site. / Could not save. Review on the website.",
            ephemeral: true,
          });
      }
    });

    await this.client.login(token);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.ready) {
      await this.client.destroy();
    }
  }

  async sendChannelMessage(
    channelId: string,
    payload: string | MessageCreateOptions,
  ): Promise<void> {
    if (!channelId || !this.ready) {
      return;
    }

    const channel = await this.client.channels.fetch(channelId);

    if (!channel || !("send" in channel)) {
      return;
    }

    await (channel as TextChannel).send(payload);
  }

  async sendDirectMessage(
    discordId: string,
    payload: string | MessageCreateOptions,
  ): Promise<void> {
    if (!discordId || !this.ready) {
      return;
    }

    const user = await this.client.users.fetch(discordId);
    await user.send(payload);
  }

  registerMirroredCommands(
    definitions: RESTPostAPIChatInputApplicationCommandsJSONBody[],
    handler: (interaction: ChatInputCommandInteraction) => Promise<void>,
  ): void {
    for (const definition of definitions)
      this.mirroredCommands.set(definition.name, { definition, handler });
    if (this.ready) void this.syncMirroredCommands();
  }

  private async syncMirroredCommands(): Promise<void> {
    if (!this.client.application || !this.ready) return;
    await this.client.application.commands.set(
      [...this.mirroredCommands.values()].map((item) => item.definition),
    );
  }
}
