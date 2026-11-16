import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscordRepository } from '../repositories/discord.repository';
import { PlayerClass } from '@prisma/client';

export type LootDropItem = {
  messageId: string;
  channelId: string;
  authorUsername: string;
  content: string;
  restriction: 'ALL' | 'RANGED' | 'MELEE' | 'DIVINE_CASTER';
  restrictionLabel: string;
  postedAt: string;
  images: Array<{ url: string; filename: string }>;
  totalReactions: number;
  interestedPlayers: Array<{
    discordId: string;
    discordUsername: string;
    registered: boolean;
    playerId?: string;
    nickname?: string;
    charClass?: PlayerClass;
    guildName?: string;
    combatPower?: number;
    isClassEligible: boolean;
    rank: number;
  }>;
};

const RANGED_CLASSES: PlayerClass[] = ['GUNSLINGER', 'NIGHT_RANGER', 'ELEMENTALIST', 'DIVINE_CASTER'];
const MELEE_CLASSES: PlayerClass[] = ['VANGUARD', 'BERSERKER', 'ASSASSIN', 'DESTROYER', 'DEATHBRINGER', 'WARLORD'];

@Injectable()
export class DiscordLootService {
  private readonly logger = new Logger(DiscordLootService.name);
  private readonly apiBase = 'https://discord.com/api/v10';

  constructor(
    private readonly config: ConfigService,
    private readonly repository: DiscordRepository,
  ) {}

  private getBotToken(): string {
    const token = this.config.get<string>('discord.botToken');
    if (!token) throw new Error('discord.botToken is not configured.');
    return token;
  }

  async getChannelDrops(channelId = '1550143905742327878', limit = 25): Promise<LootDropItem[]> {
    const token = this.getBotToken();

    // 1. Buscar mensagens recentes do canal
    const res = await fetch(`${this.apiBase}/channels/${channelId}/messages?limit=${limit}`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!res.ok) {
      this.logger.error(`discord_fetch_messages_failed status=${res.status}`);
      throw new Error(`Failed to fetch Discord messages: ${res.statusText}`);
    }

    const messages = (await res.json()) as Array<{
      id: string;
      content: string;
      timestamp: string;
      author: { id: string; username: string; bot?: boolean };
      attachments: Array<{ id: string; url: string; filename: string; content_type?: string }>;
      reactions?: Array<{ emoji: { name: string }; count: number }>;
    }>;

    // 2. Filtrar apenas mensagens com prints anexados
    const dropMessages = messages.filter(
      (m) =>
        m.attachments?.length > 0 &&
        m.attachments.some(
          (a) =>
            a.content_type?.startsWith('image/') ||
            a.url.includes('.png') ||
            a.url.includes('.jpg') ||
            a.url.includes('.jpeg') ||
            a.url.includes('.webp'),
        ),
    );

    // 3. Processar cada mensagem de drop e buscar os interessados
    const results: LootDropItem[] = [];

    for (const msg of dropMessages) {
      const contentUpper = msg.content.toUpperCase();
      let restriction: LootDropItem['restriction'] = 'ALL';
      let restrictionLabel = 'Livre para todos / Open for all';

      if (contentUpper.includes('DIVINE CASTER')) {
        restriction = 'DIVINE_CASTER';
        restrictionLabel = 'Divine Caster only';
      } else if (contentUpper.includes('RANGED')) {
        restriction = 'RANGED';
        restrictionLabel = 'Ranged only (Sniper, Elementalist, Ranger, Divine Caster)';
      } else if (contentUpper.includes('MELLE') || contentUpper.includes('MELEE')) {
        restriction = 'MELEE';
        restrictionLabel = 'Melee only (Berserker, Vanguard, Assassin, Destroyer, Deathbringer, Warlord)';
      }

      // Buscar reações ✅ (ou fallback para primeira reação)
      const checkReaction = msg.reactions?.find((r) => r.emoji.name === '✅') || msg.reactions?.[0];
      const emojiParam = checkReaction?.emoji.name ? encodeURIComponent(checkReaction.emoji.name) : '%E2%9C%85';

      let reactors: Array<{ id: string; username: string }> = [];
      try {
        const reactRes = await fetch(`${this.apiBase}/channels/${channelId}/messages/${msg.id}/reactions/${emojiParam}?limit=100`, {
          headers: { Authorization: `Bot ${token}` },
        });
        if (reactRes.ok) {
          reactors = (await reactRes.json()) as Array<{ id: string; username: string }>;
        }
      } catch (err) {
        this.logger.warn(`failed_to_fetch_reactions messageId=${msg.id}`, err);
      }

      // Buscar players no banco pelos discordIds
      const discordIds = reactors.map((r) => r.id);
      const players = await this.repository.client.player.findMany({
        where: {
          isActive: true,
          user: {
            discordId: { in: discordIds },
          },
        },
        include: {
          user: {
            select: { discordId: true, discordUsername: true },
          },
        },
      });

      const playerByDiscordId = new Map(players.map((p) => [p.user.discordId, p]));

      // Mapear interessados com elegibilidade de classe e dados de CP
      const interestedPlayers = reactors.map((reactor) => {
        const player = playerByDiscordId.get(reactor.id);
        if (!player) {
          return {
            discordId: reactor.id,
            discordUsername: reactor.username,
            registered: false,
            isClassEligible: false,
            rank: 999,
          };
        }

        let isClassEligible = true;
        if (restriction === 'RANGED') {
          isClassEligible = RANGED_CLASSES.includes(player.class);
        } else if (restriction === 'MELEE') {
          isClassEligible = MELEE_CLASSES.includes(player.class);
        } else if (restriction === 'DIVINE_CASTER') {
          isClassEligible = player.class === 'DIVINE_CASTER';
        }

        return {
          discordId: reactor.id,
          discordUsername: reactor.username,
          registered: true,
          playerId: player.id,
          nickname: player.nickname,
          charClass: player.class,
          guildName: player.guildName,
          combatPower: player.combatPower,
          isClassEligible,
          rank: 0,
        };
      });

      // Ordenar interessados:
      // 1. Elegíveis para a classe primeiro
      // 2. Do MAIOR para o MENOR Combat Power (CP)
      interestedPlayers.sort((a, b) => {
        if (a.isClassEligible !== b.isClassEligible) {
          return a.isClassEligible ? -1 : 1;
        }
        return (b.combatPower ?? 0) - (a.combatPower ?? 0);
      });

      // Atribuir rank de 1 a N
      interestedPlayers.forEach((p, idx) => {
        p.rank = idx + 1;
      });

      results.push({
        messageId: msg.id,
        channelId,
        authorUsername: msg.author.username,
        content: msg.content,
        restriction,
        restrictionLabel,
        postedAt: msg.timestamp,
        images: msg.attachments.map((a) => ({ url: a.url, filename: a.filename })),
        totalReactions: reactors.length,
        interestedPlayers,
      });
    }

    return results;
  }

  async declareWinner(params: {
    channelId: string;
    messageId: string;
    playerId: string;
    declaredByUserId: string;
    note?: string;
  }): Promise<{ success: boolean; winnerNickname: string; combatPower: number }> {
    const token = this.getBotToken();

    // 1. Buscar vencedor
    const winner = await this.repository.client.player.findUnique({
      where: { id: params.playerId },
      include: { user: true },
    });

    if (!winner) {
      throw new Error('Player vencedor não encontrado.');
    }

    // 2. Responder na mensagem do Discord
    const formattedCp = (winner.combatPower ?? 0).toLocaleString('pt-BR');
    const discordMention = winner.user?.discordId ? `<@${winner.user.discordId}>` : winner.nickname;

    const responseContent = [
      `🏆 **Segundo a lista de CP da Guilda / According to Guild CP List:**`,
      `Vencedor: **${winner.nickname}** (${discordMention}) — **${formattedCp} CP**!`,
      `Divisão: **${winner.guildName}** | Classe: **${winner.class}**`,
      params.note ? `\nObs: ${params.note}` : '',
      `\nParabéns! Staff fará a entrega no jogo.`,
    ]
      .filter(Boolean)
      .join('\n');

    const discordRes = await fetch(`${this.apiBase}/channels/${params.channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: responseContent,
        message_reference: {
          message_id: params.messageId,
        },
      }),
    });

    if (!discordRes.ok) {
      this.logger.error(`discord_send_winner_reply_failed status=${discordRes.status}`);
    }

    return {
      success: true,
      winnerNickname: winner.nickname,
      combatPower: winner.combatPower ?? 0,
    };
  }

  async toggleUserInterest(channelId: string, messageId: string, userId: string): Promise<{ success: boolean }> {
    const token = this.getBotToken();

    // Buscar user e discordId
    const user = await this.repository.client.user.findUnique({
      where: { id: userId },
    });

    if (!user?.discordId) {
      throw new Error('Usuário não possui conta do Discord vinculada.');
    }

    // Adiciona reação do bot ou confirmação
    const reactRes = await fetch(
      `${this.apiBase}/channels/${channelId}/messages/${messageId}/reactions/%E2%9C%85/@me`,
      {
        method: 'PUT',
        headers: { Authorization: `Bot ${token}` },
      },
    );

    return { success: reactRes.ok || reactRes.status === 204 };
  }
}
