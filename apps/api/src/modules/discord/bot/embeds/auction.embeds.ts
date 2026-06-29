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
        '**Leilao aberto.** Confere o DKP antes do clique; calculadora em panico so farma meme ruim.',
        '**Drop caiu na vitrine.** Bid com saldo certo, porque chute economico aqui vira cosplay de loss.',
        '**Janela de lance online.** Mira direito; corrigir depois do lock e jogar ranked com mouse invertido.',
        '**Item apareceu.** Entra com numero pensado, nao com fe de lan house em dia de chuva.',
      ],
      en: [
        '**Auction is open.** Check DKP before clicking; panic math only farms bad memes.',
        '**Drop hit the showcase.** Bid with real balance, because economy guesses turn into loss cosplay here.',
        '**The bid window is online.** Aim properly; fixing it after the lock is ranked with inverted mouse.',
        '**The item appeared.** Enter with a thought-out number, not internet-cafe faith on a storm day.',
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
        `**${playerName} levou o drop.** O DKP saiu de casa e o "quase ganhei" foi mutado pelo log.`,
        `**${playerName} fechou a call.** Item definido; replay de arrependimento agora e conteudo extra.`,
        `**${playerName} ganhou no martelo.** O lock virou cobranca real e o chat perdeu poder de rewrite.`,
        `**${playerName} acertou o bid final.** Item com dono, drama sem vaga e planilha sem fanfic.`,
      ],
      en: [
        `**${playerName} took the drop.** The DKP left home and "almost won" got muted by the log.`,
        `**${playerName} closed the call.** Item decided; regret replay is bonus content now.`,
        `**${playerName} won at the hammer.** The lock became a real charge and chat lost rewrite power.`,
        `**${playerName} landed the final bid.** Item has an owner, drama has no slot, spreadsheet has no fanfic.`,
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
        `Entrega confirmada para **${playerName}**. Print guardado antes que o chat abra pericia de boteco.`,
        `**${playerName}** recebeu e entrou no log. O "tem comprovante?" tomou disconnect.`,
        `Drop entregue para **${playerName}**. Prova anexada antes do roteiro paralelo ganhar like.`,
        `Tudo entregue a **${playerName}**. Registro feito e o debate freestyle perdeu o palco.`,
      ],
      en: [
        `Delivery confirmed for **${playerName}**. Screenshot stored before chat opened bar-counter forensics.`,
        `**${playerName}** received it and it entered the log. The "got proof?" arc got disconnected.`,
        `Drop delivered to **${playerName}**. Proof attached before the parallel script farmed likes.`,
        `Everything reached **${playerName}**. Record made and the freestyle debate lost the stage.`,
      ],
    }, itemName, playerName))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
