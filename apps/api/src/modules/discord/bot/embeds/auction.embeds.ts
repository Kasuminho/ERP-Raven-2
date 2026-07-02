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
        '**Leilao na pista.** Confere o DKP; lance no impulso e boleto emocional com skin lendaria.',
        '**Drop na vitrine.** Bid pensado, porque economista de teclado aqui vira clipe de derrota.',
        '**Janela de lance aberta.** Mira limpo; depois do lock o arrependimento joga sem pause.',
        '**Item spawnou.** Entra com conta feita, nao com fe de Wi-Fi de rodoviaria.',
      ],
      en: [
        '**Auction is live.** Check DKP; impulse bidding comes with legendary regret skin.',
        '**Drop is on display.** Bid with math, because keyboard economics becomes a defeat clip here.',
        '**Bid window is open.** Aim clean; after the lock, regret plays with no pause.',
        '**Item spawned.** Bring real numbers, not bus-station Wi-Fi faith.',
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
        `**${playerName} levou o drop.** O DKP fez check-out e o "quase" tomou mute administrativo.`,
        `**${playerName} fechou a conta.** Item definido; replay de lamento agora e conteudo de bastidor.`,
        `**${playerName} ganhou no martelo.** Lock virou cobranca e o chat perdeu a caneta da lore.`,
        `**${playerName} acertou o bid final.** Item tem dono; novela paralela ficou sem horario nobre.`,
      ],
      en: [
        `**${playerName} took the drop.** DKP checked out and "almost" got administratively muted.`,
        `**${playerName} closed the tab.** Item decided; regret replay is behind-the-scenes content now.`,
        `**${playerName} won at the hammer.** Lock became a charge and chat lost the lore pen.`,
        `**${playerName} landed the final bid.** Item has an owner; side drama missed prime time.`,
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
        `Entrega confirmada para **${playerName}**. Print salvo antes que o chat vire CSI de churrasco.`,
        `**${playerName}** recebeu e entrou no log. O "cade prova?" caiu da call sozinho.`,
        `Drop entregue para **${playerName}**. Prova anexada antes da teoria de zap farmar XP.`,
        `Tudo entregue a **${playerName}**. Registro feito e a resenha freestyle perdeu prioridade.`,
      ],
      en: [
        `Delivery confirmed for **${playerName}**. Screenshot saved before chat became barbecue CSI.`,
        `**${playerName}** received it and it entered the log. The "where proof?" arc dropped from call.`,
        `Drop delivered to **${playerName}**. Proof attached before chat theory farmed XP.`,
        `Everything reached **${playerName}**. Record made and freestyle debate lost priority.`,
      ],
    }, itemName, playerName))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
