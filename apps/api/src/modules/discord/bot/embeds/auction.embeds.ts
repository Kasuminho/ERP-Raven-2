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
        '**Leilao abriu.** Calcula antes de clicar; all-in emocional e boleto gourmet de arrependimento.',
        '**Drop no balcao.** Quem bidar no reflexo vira estudo de caso no museu do vacilo.',
        '**Janela de lance online.** Mira no item, nao no surto premium com skin de estrategia.',
        '**Item na vitrine.** Entra com DKP e neuronio online; fe no lag nao passa no checkout.',
      ],
      en: [
        '**Auction opened.** Do the math before clicking; emotional all-in is premium regret billing.',
        '**Drop is on the counter.** Reflex bidding becomes a case study in the fumble museum.',
        '**Bid window is online.** Aim at the item, not premium panic wearing strategy cosplay.',
        '**Item is on display.** Bring DKP and one working brain cell; faith in lag fails checkout.',
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
        `**${playerName} levou o drop.** DKP debitado e o "calma, tenho uma teoria" tomou mute administrativo.`,
        `**${playerName} fechou a conta.** Item definido; o chorinho tecnico foi enviado para fila casual.`,
        `**${playerName} ganhou no martelo.** Lock cobrado, fanfic concorrente sem budget de segunda temporada.`,
        `**${playerName} cravou o bid final.** O item tem dono e o debate dropou zero argumento raro.`,
      ],
      en: [
        `**${playerName} took the drop.** DKP was debited and "wait, I have a theory" got an admin mute.`,
        `**${playerName} closed the bill.** Item decided; technical whining was queued for casual mode.`,
        `**${playerName} won at the hammer.** Lock charged, rival fanfic got no second-season budget.`,
        `**${playerName} landed the final bid.** The item has an owner and debate dropped zero rare arguments.`,
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
        `Entrega confirmada para **${playerName}**. Print anexado antes que a CSI do Discord abra franquia.`,
        `**${playerName}** recebeu e o log carimbou. O "confia" foi nerfado ate sumir do meta.`,
        `Drop entregue para **${playerName}**. Prova no lugar antes da teoria de zap ganhar HP de boss.`,
        `Tudo entregue a **${playerName}**. Registro feito; a fofoca ficou sem invite para a party.`,
      ],
      en: [
        `Delivery confirmed for **${playerName}**. Screenshot attached before Discord CSI opened a franchise.`,
        `**${playerName}** received it and the log stamped it. "Trust me" got nerfed out of the meta.`,
        `Drop delivered to **${playerName}**. Proof in place before chat theory gained boss HP.`,
        `Everything reached **${playerName}**. Record made; gossip lost the party invite.`,
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
