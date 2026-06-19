import { EmbedBuilder } from 'discord.js';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(`**${itemName}** precisa de revisao antes de coroar vencedor no grito. Democracia da loot, infelizmente.`)
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
