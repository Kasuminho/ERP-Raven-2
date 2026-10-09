import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ProgressCategory } from '@prisma/client';
import { DiscordBotService } from '../services/discord-bot.service';
import { DiscordRepository } from '../../repositories/discord.repository';
import { ImageStorageService } from '../../../uploads/image-storage.service';
import { PlayersService } from '../../../players/services/players.service';
import { RavenStatusOcrService } from '../../../players/services/raven-status-ocr.service';

@Injectable()
export class DiscordCommandHandler implements OnModuleInit {
  private readonly logger = new Logger(DiscordCommandHandler.name);

  constructor(
    private readonly bot: DiscordBotService,
    private readonly repository: DiscordRepository,
    private readonly imageStorage: ImageStorageService,
    @Inject(forwardRef(() => PlayersService))
    private readonly playersService: PlayersService,
    private readonly ocrService: RavenStatusOcrService,
  ) {}

  onModuleInit(): void {
    this.registerCommands();
  }

  registerCommands(): void {
    const statusCommand = new SlashCommandBuilder()
      .setName('status')
      .setDescription('Enviar print de status para atualizar seu Combat Power (CP) no ERP AlcatraZ')
      .addAttachmentOption((opt) =>
        opt
          .setName('print')
          .setDescription('Print da tela do jogo com barras de vida, mana, atributos e buffs')
          .setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName('camada')
          .setDescription('Camada Dimensional (se aplicável)')
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('nota')
          .setDescription('Observação opcional para a Staff')
          .setRequired(false),
      );

    const cpCommand = new SlashCommandBuilder()
      .setName('cp')
      .setDescription('Enviar print de status para atualizar seu Combat Power (CP) no ERP AlcatraZ')
      .addAttachmentOption((opt) =>
        opt
          .setName('print')
          .setDescription('Print da tela do jogo com barras de vida, mana, atributos e buffs')
          .setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName('camada')
          .setDescription('Camada Dimensional (se aplicável)')
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('nota')
          .setDescription('Observação opcional para a Staff')
          .setRequired(false),
      );

    const commands = [statusCommand.toJSON(), cpCommand.toJSON()];
    this.bot.registerMirroredCommands(commands, (interaction) =>
      this.handleStatusCommand(interaction),
    );
    this.logger.log('Comandos slash /status e /cp registrados no bot do Discord.');
  }

  private async handleStatusCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply({ ephemeral: true });

      const attachment = interaction.options.getAttachment('print', true);
      const dimensionalLayer = interaction.options.getInteger('camada') ?? undefined;
      const note = interaction.options.getString('nota') ?? undefined;

      // 1. Validar jogador vinculado
      const player = await this.repository.client.player.findFirst({
        where: {
          user: { discordId: interaction.user.id },
          isActive: true,
        },
        include: { user: true },
      });

      if (!player) {
        await interaction.editReply({
          content: '⚠️ **Perfil não encontrado no ERP Raven 2.**\nAcesse o site e faça login com seu Discord para vincular sua conta antes de registrar seu status!',
        });
        return;
      }

      // 2. Validar formato da imagem
      const contentType = attachment.contentType || '';
      const isImage = contentType.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(attachment.name);
      if (!isImage) {
        await interaction.editReply({
          content: '❌ **Arquivo inválido.** Por favor, envie uma imagem válida (PNG, JPEG ou WEBP) do print da sua tela.',
        });
        return;
      }

      // 3. Download do anexo
      let buffer: Buffer;
      try {
        const res = await fetch(attachment.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } catch (err: any) {
        this.logger.error(`Falha ao descarregar anexo do Discord: ${err.message}`);
        await interaction.editReply({
          content: '❌ Falha ao descarregar a imagem do anexo do Discord. Tente novamente em instantes.',
        });
        return;
      }

      // 4. Salvar arquivo no armazenamento do sistema
      const saved = await this.imageStorage.storeValidated({ buffer, size: buffer.length });

      // 5. Executar o OCR especializado do Raven 2
      const ocr = await this.ocrService.scanStatusPrint(buffer);

      // 6. Cadastrar o PlayerProgress
      const metadata: Record<string, any> = {
        source: 'discord_slash_command',
        discordCommand: interaction.commandName,
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.username,
        fileName: attachment.name,
      };

      let combatPower: number | undefined;
      if (ocr.success && ocr.calculatedCp) {
        combatPower = ocr.calculatedCp;
        metadata.attack = ocr.attack;
        metadata.defense = ocr.defense;
        metadata.accuracy = ocr.accuracy;
        metadata.calculatedCp = ocr.calculatedCp;
        metadata.buffCount = ocr.buffCount;
        metadata.buffsDescription = ocr.buffsDescription;
        metadata.suspectedBuffsWarning = ocr.suspectedBuffsWarning;
        metadata.level = ocr.level;
        metadata.hp = ocr.hp;
        metadata.mp = ocr.mp;
      }

      await this.playersService.createProgress(player.userId, {
        category: ProgressCategory.STATUS,
        imageUrl: saved.url,
        imageUrls: [saved.url],
        combatPower,
        dimensionalLayer,
        note,
        metadata,
      });

      // 7. Resposta efêmera ao jogador
      if (ocr.success && ocr.calculatedCp) {
        await interaction.editReply({
          content: [
            `📸 **Print de Status recebido com sucesso, ${player.nickname}!**`,
            '',
            `• ⚔️ **Ataque:** \`${ocr.attack ?? '?'}\``,
            `• 🛡️ **Defesa:** \`${ocr.defense ?? '?'}\``,
            `• 🎯 **Precisão:** \`${ocr.accuracy ?? '?'}\``,
            `➔ **CP Sugerido:** **${ocr.calculatedCp.toLocaleString('pt-BR')}**`,
            ocr.buffCount ? `• 🧪 **Buffs Detectados:** \`${ocr.buffCount} buffs na barra inferior\`` : '',
            '',
            '📋 **Seu print foi enviado para a fila de validação da Staff no site.**',
            '🔍 *A liderança irá conferir os buffs da sua classe antes de aprovar seu novo CP oficial!*',
          ].filter(Boolean).join('\n'),
        });
      } else {
        await interaction.editReply({
          content: [
            `📸 **Print de Status recebido com sucesso, ${player.nickname}!**`,
            '',
            '📋 Seu print foi enviado para a fila de revisão da Staff no site.',
            'ℹ️ *A leitura automática não identificou os 3 números abaixo da barra azul, então a Staff fará a checagem manual dos atributos e dos buffs.*',
          ].join('\n'),
        });
      }
    } catch (error: any) {
      this.logger.error(`Erro ao processar /status do Discord: ${error.message}`, error.stack);
      if (!interaction.replied && interaction.deferred) {
        await interaction.editReply({
          content: '❌ Ocorreu um erro ao processar seu print. Tente enviar novamente ou faça o upload pelo site.',
        });
      }
    }
  }
}
