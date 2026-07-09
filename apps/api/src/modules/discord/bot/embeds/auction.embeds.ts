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
        '**Leilao abriu.** Faz a conta antes do clique; coragem sem DKP e pix no golpe da skin.',
        '**Drop no balcao.** Bid frio, dedo quieto; emocionado aqui vira tutorial de prejuizo.',
        '**Janela de lance online.** Mira no item, nao no delirio gamer parcelado em arrependimento.',
        '**Item apareceu.** Entra com planilha, nao com horoscopo de Discord e fe no lag.',
      ],
      en: [
        '**Auction opened.** Do the math before clicking; courage without DKP is a skin-scam receipt.',
        '**Drop is on the counter.** Bid cold, finger calm; hype here becomes a loss tutorial.',
        '**Bid window is online.** Aim at the item, not gamer delusion paid in regret.',
        '**Item appeared.** Bring a spreadsheet, not Discord astrology and faith in lag.',
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
        `**${playerName} levou o drop.** O DKP saiu no recibo e o "mas veja bem" caiu no limbo.`,
        `**${playerName} fechou a fatura.** Item definido; chorinho tecnico fica no modo espectador.`,
        `**${playerName} ganhou no martelo.** Lock cobrado, lore alternativa sem verba para temporada.`,
        `**${playerName} acertou o bid final.** O item tem dono e o debate perdeu o passe de batalha.`,
      ],
      en: [
        `**${playerName} took the drop.** DKP left with a receipt and "but actually" fell into limbo.`,
        `**${playerName} closed the bill.** Item decided; technical whining stays in spectator mode.`,
        `**${playerName} won at the hammer.** Lock charged, alternate lore got no season budget.`,
        `**${playerName} landed the final bid.** The item has an owner and debate lost the battle pass.`,
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
        `Entrega confirmada para **${playerName}**. Print anexado antes que o chat abra pericia freestyle.`,
        `**${playerName}** recebeu e o log assinou. O "confia" foi aposentado por justa causa.`,
        `Drop entregue para **${playerName}**. Prova no lugar antes da teoria de zap virar raid boss.`,
        `Tudo entregue a **${playerName}**. Registro feito; a fofoca perdeu prioridade na fila.`,
      ],
      en: [
        `Delivery confirmed for **${playerName}**. Screenshot attached before chat opened freestyle forensics.`,
        `**${playerName}** received it and the log signed. "Trust me" retired with cause.`,
        `Drop delivered to **${playerName}**. Proof in place before chat theory became a raid boss.`,
        `Everything reached **${playerName}**. Record made; gossip lost queue priority.`,
      ],
    }, itemName, playerName))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
