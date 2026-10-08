import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  MessageCreateOptions,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  TextChannel,
} from "discord.js";
import { DiscordRepository } from "../../repositories/discord.repository";

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

  constructor(
    private readonly config: ConfigService,
    private readonly repository: DiscordRepository,
  ) {
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
      if (interaction.isButton()) {
        await this.handleButtonInteraction(interaction);
        return;
      }
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

  private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    if (interaction.customId.startsWith('interest:toggle:')) {
      const postId = interaction.customId.replace('interest:toggle:', '');
      await this.handleInterestToggle(interaction, postId);
    }
  }

  private async handleInterestToggle(interaction: ButtonInteraction, postId: string): Promise<void> {
    try {
      await interaction.deferReply({ ephemeral: true });

      const player = await this.repository.client.player.findFirst({
        where: {
          user: { discordId: interaction.user.id },
          isActive: true,
        },
        include: {
          user: true,
        },
      });

      if (!player) {
        await interaction.editReply({
          content: '⚠️ **Perfil não encontrado no ERP Raven 2.**\nAcesse o site e faça login com seu Discord para vincular sua conta antes de manifestar interesse nos drops!',
        });
        return;
      }

      const post = await this.repository.client.itemInterestPost.findUnique({
        where: { id: postId },
        include: { itemCatalog: true },
      });

      if (!post || post.status !== 'OPEN') {
        await interaction.editReply({
          content: '⏳ **Este drop já foi encerrado ou entregue pela liderança.**',
        });
        return;
      }

      if (new Date() > post.closesAt) {
        await interaction.editReply({
          content: '⏳ **O prazo para manifestar interesse neste drop já expirou.**',
        });
        return;
      }

      const existingEntry = await this.repository.client.itemInterestEntry.findUnique({
        where: {
          postId_playerId: {
            postId,
            playerId: player.id,
          },
        },
      });

      if (existingEntry) {
        await this.repository.client.itemInterestEntry.delete({
          where: { id: existingEntry.id },
        });
        await interaction.editReply({
          content: `❌ **Interesse removido com sucesso para ${player.nickname}.**\nCaso mude de ideia antes do encerramento, basta clicar no botão novamente.`,
        });
        return;
      }

      await this.repository.client.itemInterestEntry.create({
        data: {
          postId,
          playerId: player.id,
          isTransmuteRequest: false,
          note: 'Interesse manifestado via Discord',
        },
      });

      const cpFormatted = player.combatPower ? player.combatPower.toLocaleString('pt-BR') : 'Não calculado';
      await interaction.editReply({
        content: `🎯 **Interesse registrado com sucesso!**\n\n• **Item:** ${post.itemCatalog.namePt}\n• **Jogador:** ${player.nickname}\n• **Classe:** ${player.class}\n• **CP Registrado:** ${cpFormatted}\n\n*A Staff avaliará os participantes com prioridade por CP e presença no boss.*`,
      });
    } catch (error) {
      this.logger.error(`discord_button_interaction_failed customId=${interaction.customId}`, error instanceof Error ? error.stack : undefined);
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({
          content: '❌ Ocorreu um erro ao processar sua ação. Tente novamente ou use o site.',
        });
      }
    }
  }
}
