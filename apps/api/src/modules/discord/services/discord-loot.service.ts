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

    // 2. Filtrar estritamente drops válidos de HOJE (UTC / Data atual) com print anexado
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const dropMessages = messages.filter(
      (m) =>
        m.timestamp.startsWith(todayPrefix) &&
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

    // 3. Buscar membros do servidor no Discord para mapear apelidos (server nick e global name)
    const guildId = this.config.get<string>('discord.guildId') || '1550119401443819633';
    let guildMembers: Array<{
      user: { id: string; username: string; global_name: string | null };
      nick: string | null;
    }> = [];
    try {
      const gRes = await fetch(`${this.apiBase}/guilds/${guildId}/members?limit=1000`, {
        headers: { Authorization: `Bot ${token}` },
      });
      if (gRes.ok) {
        guildMembers = (await gRes.json()) as typeof guildMembers;
      }
    } catch (err) {
      this.logger.warn('failed_to_fetch_guild_members', err);
    }

    const memberByDiscordId = new Map(guildMembers.map((m) => [m.user.id, m]));

    // 4. Buscar todos os jogadores ativos com os dados de CP e progresso
    const allPlayers = await this.repository.client.player.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { discordId: true, discordUsername: true, discordNickname: true },
        },
      },
    });

    // Mapeador inteligente de jogador: discordId direto OU apelido no servidor OU nome do char
    const resolvePlayer = (reactorId: string, reactorUsername: string) => {
      // 1. Match direto por discordId
      const direct = allPlayers.find((p) => p.user?.discordId === reactorId);
      if (direct) return direct;

      const gMember = memberByDiscordId.get(reactorId);
      const serverNick = (gMember?.nick || '').toLowerCase().trim();
      const globalName = (gMember?.user.global_name || '').toLowerCase().trim();
      const dUsername = (reactorUsername || '').toLowerCase().trim();

      // 2. Match por Nick do servidor ou global_name cruzando com nickname do jogo ou discordUser
      return allPlayers.find((p) => {
        const pNick = p.nickname.toLowerCase().trim();
        const pDiscordUser = (p.user?.discordNickname || p.user?.discordUsername || '').toLowerCase().trim();

        if (dUsername && pDiscordUser === dUsername) return true;
        if (serverNick && (pDiscordUser === serverNick || serverNick.includes(pNick) || pNick.includes(serverNick))) return true;
        if (globalName && (pDiscordUser === globalName || globalName.includes(pNick) || pNick.includes(globalName))) return true;
        return false;
      });
    };

    // 5. Processar cada mensagem de drop e buscar os interessados
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
        const reactRes = await fetch(`${this.apiBase}/channels/${channelId}/messages/${msg.id}/reactions/${emojiParam}`, {
          headers: { Authorization: `Bot ${token}` },
        });
        if (reactRes.ok) {
          reactors = (await reactRes.json()) as Array<{ id: string; username: string }>;
        }
      } catch (err) {
        this.logger.warn(`failed_to_fetch_reactions messageId=${msg.id}`, err);
      }

      // Mapear interessados usando o resolvedor inteligente
      const interestedPlayers = reactors.map((reactor) => {
        const player = resolvePlayer(reactor.id, reactor.username);
        if (!player) {
          const gMember = memberByDiscordId.get(reactor.id);
          const displayName = gMember?.nick || gMember?.user.global_name || reactor.username;
          return {
            discordId: reactor.id,
            discordUsername: displayName,
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
          discordUsername: player.nickname,
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

  async publishDropFromWeb(params: {
    channelId?: string;
    itemCatalogId?: string;
    title: string;
    restriction: 'ALL' | 'RANGED' | 'MELEE' | 'DIVINE_CASTER';
    imageUrl?: string;
    createdByUserId: string;
  }): Promise<{ success: boolean; messageId: string }> {
    const token = this.getBotToken();
    const channelId = params.channelId || this.config.get<string>('discord.channels.interests') || '1550143905742327878';

    // 1. Buscar item no catálogo se fornecido
    let itemDetails = '';
    let itemImageUrl = params.imageUrl;
    if (params.itemCatalogId) {
      const item = await this.repository.client.itemCatalog.findUnique({
        where: { id: params.itemCatalogId },
      });
      if (item) {
        itemDetails = `**${item.namePt}** (${item.itemTier} • ${item.itemType})`;
        if (!itemImageUrl && item.image1Url) {
          itemImageUrl = item.image1Url;
        }
      }
    }

    // 2. Montar texto do anúncio com regras e restrições
    let restrictionText = 'LIVRE PARA TODOS / OPEN FOR ALL';
    if (params.restriction === 'RANGED') restrictionText = 'RANGED ONLY';
    if (params.restriction === 'MELEE') restrictionText = 'MELEE ONLY';
    if (params.restriction === 'DIVINE_CASTER') restrictionText = 'DIVINE CASTER ONLY';

    const messageLines = [
      `📦 **NOVO DROP DISPONÍVEL / NEW GUILD DROP**`,
      itemDetails || `**${params.title}**`,
      ``,
      `⚠️ **RESTRIÇÃO:** \`${restrictionText}\``,
      ``,
      `SOMENTE PARA QUEM PARTICIPOU DO BOSS`,
      `DISTRIBUIÇÃO POR MAIOR CP ENTRE OS INTERESSADOS`,
      ``,
      `Reaja com ✅ nesta mensagem ou manifeste interesse diretamente no ERP:`,
      `👉 https://app.guild-alcatraz.site/dashboard/drops`,
      `@everyone`,
    ];

    const payload: Record<string, any> = {
      content: messageLines.join('\n'),
    };

    if (itemImageUrl) {
      const fullImageUrl = itemImageUrl.startsWith('http')
        ? itemImageUrl
        : `https://app.guild-alcatraz.site${itemImageUrl}`;
      payload.embeds = [
        {
          title: params.title,
          image: { url: fullImageUrl },
          color: 0xeab308,
        },
      ];
    }

    const postRes = await fetch(`${this.apiBase}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!postRes.ok) {
      const errText = await postRes.text();
      this.logger.error(`discord_publish_drop_failed status=${postRes.status} body=${errText}`);
      throw new Error(`Falha ao publicar drop no Discord: ${postRes.statusText}`);
    }

    const createdMsg = (await postRes.json()) as { id: string };

    // 3. Adicionar reação padrão ✅ automaticamente pelo bot para os players clicarem
    try {
      await fetch(
        `${this.apiBase}/channels/${channelId}/messages/${createdMsg.id}/reactions/%E2%9C%85/@me`,
        {
          method: 'PUT',
          headers: { Authorization: `Bot ${token}` },
        },
      );
    } catch (e) {
      this.logger.warn(`failed_to_add_initial_reaction msgId=${createdMsg.id}`, e);
    }

    return {
      success: true,
      messageId: createdMsg.id,
    };
  }
}
