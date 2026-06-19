import { EmbedBuilder } from 'discord.js';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente / Staff review pending')
    .setDescription(`**PT-BR**\n**${itemName}** precisa de revisao antes de coroar vencedor no grito. Democracia da loot, infelizmente.\n\n**EN**\n**${itemName}** needs review before someone crowns a winner by yelling louder. Loot democracy, unfortunately.`)
    .addFields({ name: 'ID do leilao / Auction ID', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
