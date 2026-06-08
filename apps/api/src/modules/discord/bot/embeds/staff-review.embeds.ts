import { EmbedBuilder } from 'discord.js';
import { blocks } from './discord-formatting';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Staff Review Required')
    .setDescription(blocks(
      `${itemName} precisa de revisao da staff antes da aprovacao do vencedor.`,
      `${itemName} requires staff review before a winner can be approved.`,
    ))
    .addFields({ name: 'Auction ID', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
