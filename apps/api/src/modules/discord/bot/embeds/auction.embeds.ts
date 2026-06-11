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
    .setTitle(`Leilao aberto: ${data.itemName}`)
    .setColor(0x2f80ed)
    .setDescription(blocks(
      'Loot na mesa. Confere elegibilidade, DKP e pensa antes de apertar o botao, porque lance travado nao volta ate acabar.',
      'Loot is on the table. Check eligibility and DKP before bidding, because locked DKP stays locked until the auction ends.',
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
    .setTitle(`Vencedor definido: ${itemName}`)
    .setDescription(blocks(
      `${playerName} levou essa. DKP consumido, registro feito, sem historia triste depois.`,
      `${playerName} won this one. DKP consumed, delivery trail logged, clean ending.`,
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
    .setTitle(`Drop entregue: ${itemName}`)
    .setDescription(blocks(
      `Entrega registrada para ${playerName}. Pode guardar o print, porque aqui tem memoria.`,
      `Delivery registered for ${playerName}. Proof is logged for the record.`,
    ))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
