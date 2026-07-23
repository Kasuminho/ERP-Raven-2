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
        '**Leilao aberto.** Confere DKP antes do clique; all-in emocionado nao vem com botao de desfazer.',
        '**Drop entrou no pregao.** Lance com cerebro ligado, porque o arrependimento nao aceita parcelamento.',
        '**Janela de bid no ar.** Mira no item e segura o ego; mouse nervoso nao passa em auditoria.',
        '**Item na mesa.** Calcula frio; economia de raid nao e stories de coach financeiro.',
      ],
      en: [
        '**Auction opened.** Check DKP before clicking; emotional all-in comes with no undo button.',
        '**Drop entered the market.** Bid with brain online, because regret does not accept installments.',
        '**Bid window is live.** Aim at the item and hold the ego; nervous mouse fails audit.',
        '**Item is on the table.** Calculate cold; raid economy is not finance-coach stories.',
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
        `**${playerName} ficou com o drop.** DKP debitado; o "mas se..." foi arquivado na pasta meme vencido.`,
        `**${playerName} fechou o leilao.** Resultado definido e o textao perdeu prioridade de CPU.`,
        `**${playerName} levou no martelo.** Lock cobrado, registro salvo e drama sem direito a loot extra.`,
        `**${playerName} cravou o resultado.** Item com dono; o tribunal do sofa pode dar /logout.`,
      ],
      en: [
        `**${playerName} got the drop.** DKP debited; the "but if..." went to the expired-meme folder.`,
        `**${playerName} closed the auction.** Result decided and the essay lost CPU priority.`,
        `**${playerName} won at the hammer.** Lock charged, record saved, and drama gets no extra loot.`,
        `**${playerName} locked the result.** Item has an owner; couch court may /logout.`,
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
        `Entrega confirmada para **${playerName}**. Print anexado; "confia" tomou ban temporario do processo.`,
        `**${playerName}** recebeu e o log assinou. Auditoria sem prova aqui nem entra na fila solo.`,
        `Drop entregue para **${playerName}**. Comprovante no lugar antes que o chat fabrique universo expandido.`,
        `Tudo certo com **${playerName}**. Registro feito; o drama ficou sem energia para o proximo episodio.`,
      ],
      en: [
        `Delivery confirmed for **${playerName}**. Screenshot attached; "trust me" got a temporary process ban.`,
        `**${playerName}** received it and the log signed. Audit without proof does not enter solo queue here.`,
        `Drop delivered to **${playerName}**. Proof in place before chat builds an expanded universe.`,
        `All set with **${playerName}**. Record made; drama ran out of energy for the next episode.`,
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
