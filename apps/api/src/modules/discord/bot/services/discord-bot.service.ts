import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  Message,
  MessageCreateOptions,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  Partials,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  TextChannel,
  User,
} from "discord.js";
import { buildItemInterestCreatedEmbed } from "../embeds/notification.embeds";
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
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
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

    this.client.on("messageReactionAdd", async (reaction, user) => {
      await this.handleMessageReaction(reaction, user, "ADD");
    });

    this.client.on("messageReactionRemove", async (reaction, user) => {
      await this.handleMessageReaction(reaction, user, "REMOVE");
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
  ): Promise<Message | undefined> {
    if (!channelId || !this.ready) {
      return undefined;
    }

    const channel = await this.client.channels.fetch(channelId);

    if (!channel || !("send" in channel)) {
      return undefined;
    }

    return await (channel as TextChannel).send(payload);
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
        void this.syncDiscordMessagePost(postId);
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
      void this.syncDiscordMessagePost(postId);

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

  private async handleMessageReaction(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    action: 'ADD' | 'REMOVE',
  ): Promise<void> {
    try {
      if (user.bot) return;

      let resolvedUser = user;
      if (resolvedUser.partial) {
        resolvedUser = await resolvedUser.fetch();
      }

      let resolvedReaction = reaction;
      if (resolvedReaction.partial) {
        resolvedReaction = await resolvedReaction.fetch();
      }

      if (resolvedReaction.message.partial) {
        await resolvedReaction.message.fetch();
      }

      const messageId = resolvedReaction.message.id;
      if (!messageId) return;

      const post = await this.repository.client.itemInterestPost.findUnique({
        where: { discordMessageId: messageId },
        include: { itemCatalog: true },
      });

      if (!post) {
        return;
      }

      if (post.status !== 'OPEN' || new Date() > post.closesAt) {
        return;
      }

      const player = await this.repository.client.player.findFirst({
        where: {
          user: { discordId: resolvedUser.id },
          isActive: true,
        },
        include: { user: true },
      });

      if (!player) {
        if (action === 'ADD') {
          try {
            await (resolvedUser as User).send(
              '⚠️ **Perfil não encontrado no ERP AlcatraZ.**\n' +
              'Faça login no site do clã com seu Discord para que suas reações registrem automaticamente seu interesse nos drops!',
            );
          } catch {
            // Se DM estiver bloqueada, ignora
          }
        }
        return;
      }

      const existingEntry = await this.repository.client.itemInterestEntry.findUnique({
        where: {
          postId_playerId: {
            postId: post.id,
            playerId: player.id,
          },
        },
      });

      if (action === 'ADD') {
        if (!existingEntry) {
          await this.repository.client.itemInterestEntry.create({
            data: {
              postId: post.id,
              playerId: player.id,
              isTransmuteRequest: false,
              note: 'Interesse manifestado via reação no Discord',
            },
          });

          this.logger.log(`discord_reaction_interest_added post=${post.id} player=${player.nickname}`);
          void this.syncDiscordMessagePost(post.id);

          try {
            const cpFormatted = player.combatPower ? player.combatPower.toLocaleString('pt-BR') : 'Não calculado';
            await (resolvedUser as User).send(
              `🎯 **Interesse registrado no ERP AlcatraZ!**\n\n` +
              `• **Item:** ${post.itemCatalog.namePt}\n` +
              `• **Jogador:** ${player.nickname} (${player.class})\n` +
              `• **CP:** ${cpFormatted}\n\n` +
              `*A Staff avaliará os participantes com prioridade por CP e presença no boss.*`,
            );
          } catch {
            // Se DM estiver bloqueada, ignora
          }
        }
      } else if (action === 'REMOVE') {
        if (existingEntry) {
          await this.repository.client.itemInterestEntry.delete({
            where: { id: existingEntry.id },
          });

          this.logger.log(`discord_reaction_interest_removed post=${post.id} player=${player.nickname}`);
          void this.syncDiscordMessagePost(post.id);

          try {
            await (resolvedUser as User).send(
              `❌ **Interesse removido.**\nVocê removeu sua reação para o item **${post.itemCatalog.namePt}**.`,
            );
          } catch {
            // Se DM estiver bloqueada, ignora
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `discord_handle_reaction_failed action=${action}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async syncDiscordMessagePost(postId: string): Promise<void> {
    try {
      if (!this.ready) return;

      const post = await this.repository.client.itemInterestPost.findUnique({
        where: { id: postId },
        include: {
          itemCatalog: true,
          entries: {
            include: {
              player: {
                include: { user: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!post || !post.discordMessageId || !post.discordChannelId) {
        return;
      }

      const channel = await this.client.channels.fetch(post.discordChannelId);
      if (!channel || !('messages' in channel)) return;

      const textChannel = channel as TextChannel;
      const message = await textChannel.messages.fetch(post.discordMessageId).catch(() => null);
      if (!message) return;

      const entries = post.entries.map((e) => ({
        nickname: e.player.nickname,
        discordId: e.player.user?.discordId,
      }));

      const publicUrl = this.config.get<string>('discord.publicUrl') || 'https://app.guild-alcatraz.site';
      const embed = buildItemInterestCreatedEmbed({
        title: post.title,
        itemName: post.itemCatalog ? (post.itemCatalog.namePt || post.itemCatalog.nameEn) : post.title,
        mode: post.mode,
        criteriaPt: post.criteriaPt,
        criteriaEn: post.criteriaEn,
        closesAt: post.closesAt,
        url: `${publicUrl.replace(/\/$/, '')}/dashboard/drops`,
        imageUrl: post.itemCatalog?.image1Url || post.itemCatalog?.image2Url || undefined,
        entries,
      });

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`interest:toggle:${post.id}`)
          .setLabel(`🎯 Manifestar Interesse (${entries.length})`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setLabel('🌐 Abrir no Site')
          .setStyle(ButtonStyle.Link)
          .setURL(`${publicUrl.replace(/\/$/, '')}/dashboard/drops`),
      );

      await message.edit({
        embeds: [embed],
        components: [actionRow],
      });
    } catch (error) {
      this.logger.error(`failed_to_sync_discord_message post=${postId}`, error instanceof Error ? error.stack : undefined);
    }
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    try {
      if (!this.ready) return;
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !('messages' in channel)) return;
      const textChannel = channel as TextChannel;
      const message = await textChannel.messages.fetch(messageId).catch(() => null);
      if (message) {
        await message.delete();
      }
    } catch {
      // Ignora falhas de delecao
    }
  }
}
