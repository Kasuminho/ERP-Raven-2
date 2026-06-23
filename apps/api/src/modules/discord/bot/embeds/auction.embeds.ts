import { EmbedBuilder } from 'discord.js';
import { DiscordLocale, localeCopy } from './discord-locale';
import { pickBilingualVoice } from './webhook-voice';

export type AuctionEmbedData = {
  itemName: string;
  itemTier: string;
  minimumBid: number;
  endsAt: Date;
  url: string;
};

function discordTimestamp(date: Date, style: 'F' | 'R' = 'F'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

function isDiscordImageUrl(url?: string): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export function buildAuctionCreatedEmbed(data: AuctionEmbedData, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(localeCopy(locale, {
      'pt-BR': `Leilao aberto: ${data.itemName}`,
      en: `Auction open: ${data.itemName}`,
    }))
    .setColor(0x2f80ed)
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        '**Loot na pista.** Confere o DKP antes do clique; conta refeita no susto e build de emergencia.',
        '**Leilao spawnou.** Entra com o saldo checado; matematica no pos-jogo so gera replay triste.',
        '**Item em disputa.** Mira no bid com o valor certo; improviso depois do lock e compilado de vergonha.',
        '**Janela abriu.** Se for entrar, entra com o DKP contado e sem inventar moda no ultimo frame.',
      ],
      en: [
        '**Loot is live.** Check your DKP before clicking; panic math is an emergency build.',
        '**Auction just spawned.** Queue up with verified balance; post-lock arithmetic only creates sad replays.',
        '**Item is contested.** Aim with the right amount; freestyle math after the lock becomes a cringe compilation.',
        '**Window is open.** If you are going in, do it with counted DKP and no last-frame improvising.',
      ],
    }, data.itemName, data.itemTier, data.minimumBid, data.endsAt))
    .addFields(
      { name: 'Tier', value: data.itemTier, inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Lance minimo', en: 'Minimum bid' }), value: String(data.minimumBid), inline: true },
      {
        name: localeCopy(locale, { 'pt-BR': 'Termina', en: 'Ends' }),
        value: `${discordTimestamp(data.endsAt, 'F')}\n${discordTimestamp(data.endsAt, 'R')}`,
        inline: false,
      },
      { name: 'Dashboard', value: data.url || 'Dashboard link unavailable', inline: false },
    )
    .setTimestamp(new Date());
}

export function buildAuctionWinnerEmbed(itemName: string, playerName: string, proofImageUrl?: string, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Vencedor definido: ${itemName}`, en: `Winner locked: ${itemName}` }))
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        `**${playerName} fechou o drop.** O DKP saiu da conta e o clube do "faltou um clique" ficou sem argumento.`,
        `**${playerName} garantiu o item.** DKP consumido; o resto agora e comentario atrasado com ping de museu.`,
        `**${playerName} levou.** O lock virou gasto real e a conversa tardia perdeu o buff.`,
        `**${playerName} cravou.** O item trocou de dono e o quase ficou preso no lobby.`,
      ],
      en: [
        `**${playerName} locked the drop.** DKP is spent and the "one click away" club is left with no argument.`,
        `**${playerName} secured the item.** DKP consumed; the rest is late commentary with museum-grade ping.`,
        `**${playerName} got it.** The lock became a real spend and the late debate lost its buff.`,
        `**${playerName} called it.** The item changed hands and the almost got stuck in the lobby.`,
      ],
    }, itemName, playerName))
    .setColor(0x27ae60)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}

export function buildAuctionDeliveryEmbed(itemName: string, playerName: string, proofImageUrl?: string, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Drop entregue: ${itemName}`, en: `Drop delivered: ${itemName}` }))
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        `Entrega registrada para **${playerName}**. Print guardado e a saga do "cade a prova?" perdeu episodio.`,
        `**${playerName}** recebeu e ficou tudo salvo. O print entrou no cofre antes do chat inventar multiverso.`,
        `Entrega confirmada para **${playerName}**. Prova anexada e o VAR do loot ja abriu o replay.`,
        `Drop entregue para **${playerName}**. Tudo logado antes que alguem tente editar a timeline no grito.`,
      ],
      en: [
        `Delivery logged for **${playerName}**. Screenshot stored and the "where is the proof?" arc lost an episode.`,
        `**${playerName}** received it and everything is saved. The screenshot hit the vault before chat could invent a multiverse.`,
        `Delivery confirmed for **${playerName}**. Proof attached and the loot VAR already opened the replay.`,
        `Drop delivered to **${playerName}**. Everything was logged before anyone could shout-edit the timeline.`,
      ],
    }, itemName, playerName))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
