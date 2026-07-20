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
        '**Leilao aberto.** Faz conta antes do clique; bid no impulso e boleto de skin lendaria do arrependimento.',
        '**Drop apareceu.** Quem entrar no automatico vira clipe motivacional do "nao faca isso".',
        '**Janela de lance no ar.** Mira no item, nao no ego com ping alto e plano premium de caos.',
        '**Item na bancada.** DKP na mao e calma no mouse; freestyle financeiro nao da buff.',
      ],
      en: [
        '**Auction opened.** Do the math before clicking; impulse bids invoice regret with legendary-skin pricing.',
        '**Drop showed up.** Anyone autopiloting becomes a motivational clip called "do not do this".',
        '**Bid window is live.** Aim at the item, not ego with high ping and a premium chaos plan.',
        '**Item is on the bench.** DKP in hand and calm on the mouse; financial freestyle gives no buff.',
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
        `**${playerName} ficou com o drop.** DKP debitado; a teoria de mesa virou conteudo cortado do patch note.`,
        `**${playerName} fechou o leilao.** Item definido e o "mas veja bem" tomou disconnect estrategico.`,
        `**${playerName} levou no martelo.** Lock cobrado, replay revisado e drama sem loot bonus.`,
        `**${playerName} cravou o resultado.** O item tem dono; o debate saiu com build de papel.`,
      ],
      en: [
        `**${playerName} got the drop.** DKP was debited; table theory became cut content from the patch notes.`,
        `**${playerName} closed the auction.** Item decided and "but hear me out" took a strategic disconnect.`,
        `**${playerName} won at the hammer.** Lock charged, replay reviewed, drama awarded no bonus loot.`,
        `**${playerName} locked the result.** The item has an owner; the debate left with a paper build.`,
      ],
    }, itemName, playerName))
    .setColor(0x27ae60)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}

export function buildAuctionDeliveryEmbed(itemName: string, playerName: string, proofImageUrl?: string, locale: DiscordLocale = 'pt-BR', resultUrl?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Drop entregue: ${itemName}`, en: `Drop delivered: ${itemName}` }))
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        `Entrega confirmada para **${playerName}**. Print anexado; o "confia" foi expulso do lobby.`,
        `**${playerName}** recebeu e o log assinou. Auditoria sem print hoje fica sem passe de batalha.`,
        `Drop entregue para **${playerName}**. Prova no lugar antes que o grupo invente lore alternativa.`,
        `Tudo certo com **${playerName}**. Registro feito; a novela perdeu horario nobre no Discord.`,
      ],
      en: [
        `Delivery confirmed for **${playerName}**. Screenshot attached; "trust me" got kicked from the lobby.`,
        `**${playerName}** received it and the log signed. Audit without proof gets no battle pass today.`,
        `Drop delivered to **${playerName}**. Proof in place before the group invents alternate lore.`,
        `All set with **${playerName}**. Record made; the Discord soap opera lost prime time.`,
      ],
    }, itemName, playerName))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (resultUrl) {
    embed.addFields({
      name: localeCopy(locale, { 'pt-BR': 'Resultados no site', en: 'Results on the website' }),
      value: resultUrl,
    });
  }

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
