import { EmbedBuilder } from 'discord.js';
import { blocks } from './discord-formatting';

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

export function buildAuctionCreatedEmbed(data: AuctionEmbedData): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`Leilao criado / Auction Created: ${data.itemName}`)
    .setColor(0x2f80ed)
    .setDescription(blocks(
      'Um novo leilao foi aberto no dashboard.',
      'A new auction is open on the dashboard.',
    ))
    .addFields(
      { name: 'Tier', value: data.itemTier, inline: true },
      { name: 'Lance minimo / Minimum Bid', value: String(data.minimumBid), inline: true },
      {
        name: 'Termina / Ends',
        value: `${discordTimestamp(data.endsAt, 'F')}\n${discordTimestamp(data.endsAt, 'R')}`,
        inline: false,
      },
      { name: 'Dashboard', value: data.url || 'Dashboard link unavailable', inline: false },
    )
    .setTimestamp(new Date());
}

export function buildAuctionWinnerEmbed(itemName: string, playerName: string, proofImageUrl?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Vencedor do leilao / Auction Winner: ${itemName}`)
    .setDescription(blocks(
      `${playerName} venceu o leilao e o drop foi registrado.`,
      `${playerName} won the auction and the drop delivery was logged.`,
    ))
    .setColor(0x27ae60)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}

export function buildAuctionDeliveryEmbed(itemName: string, playerName: string, proofImageUrl?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Drop entregue / Drop Delivered: ${itemName}`)
    .setDescription(blocks(
      `Entrega registrada para ${playerName}.`,
      `Delivery registered for ${playerName}.`,
    ))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
