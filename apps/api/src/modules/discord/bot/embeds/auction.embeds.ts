import { EmbedBuilder } from 'discord.js';
import { DiscordLocale, localeCopy } from './discord-locale';

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
      es: `Subasta abierta: ${data.itemName}`,
    }))
    .setColor(0x2f80ed)
    .setDescription(localeCopy(locale, {
      'pt-BR': '**Loot na mesa.** Confere o DKP antes de clicar; matematica depois do bid vira fanfic.',
      en: '**Loot is live.** Check your DKP before clicking; post-bid math is premium copium.',
      es: '**Hay loot.** Revisa tu DKP antes de pujar; hacer cuentas despues es puro copium.',
    }))
    .addFields(
      { name: 'Tier', value: data.itemTier, inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Lance minimo', en: 'Minimum bid', es: 'Puja minima' }), value: String(data.minimumBid), inline: true },
      {
        name: localeCopy(locale, { 'pt-BR': 'Termina', en: 'Ends', es: 'Termina' }),
        value: `${discordTimestamp(data.endsAt, 'F')}\n${discordTimestamp(data.endsAt, 'R')}`,
        inline: false,
      },
      { name: 'Dashboard', value: data.url || 'Dashboard link unavailable', inline: false },
    )
    .setTimestamp(new Date());
}

export function buildAuctionWinnerEmbed(itemName: string, playerName: string, proofImageUrl?: string, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Vencedor definido: ${itemName}`, en: `Winner locked: ${itemName}`, es: `Ganador definido: ${itemName}` }))
    .setDescription(localeCopy(locale, {
      'pt-BR': `**${playerName} levou.** DKP consumido e chororo encaminhado ao setor de skill issue.`,
      en: `**${playerName} got it.** DKP consumed; complaints have been routed to the skill issue department.`,
      es: `**${playerName} se lo lleva.** DKP consumido; quejas enviadas al departamento de skill issue.`,
    }))
    .setColor(0x27ae60)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}

export function buildAuctionDeliveryEmbed(itemName: string, playerName: string, proofImageUrl?: string, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Drop entregue: ${itemName}`, en: `Drop delivered: ${itemName}`, es: `Drop entregado: ${itemName}` }))
    .setDescription(localeCopy(locale, {
      'pt-BR': `Entrega registrada para **${playerName}**. Print salvo, memoria ativada e caozinho domesticado.`,
      en: `Delivery logged for **${playerName}**. Screenshot saved; selective memory has left the chat.`,
      es: `Entrega registrada para **${playerName}**. Captura guardada; la memoria selectiva salio del chat.`,
    }))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
