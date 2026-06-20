import { EmbedBuilder } from 'discord.js';
import { pickStaffVoice } from './webhook-voice';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(pickStaffVoice([
      `**${itemName}** caiu na mesa da Staff. Antes de soltar o vencedor no gogo, vale revisar sem speedrun de democracia torta.`,
      `**${itemName}** entrou em revisao. Melhor decidir com voto do que com ping mais alto no voice.`,
      `**${itemName}** precisa de aval da Staff. Coroar no impulso aqui so cria patch de madrugada.`,
    ], itemName, auctionId))
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
