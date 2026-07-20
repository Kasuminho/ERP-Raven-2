import { EmbedBuilder } from 'discord.js';
import { pickStaffVoice } from './webhook-voice';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(pickStaffVoice([
      `**${itemName}** caiu na review. Vota com criterio; achismo aqui chega sem gear e pede carry.`,
      `**${itemName}** chegou na mesa da Staff. Decide limpo antes que o voice vire audicao de textao.`,
      `**${itemName}** pediu aval. Impulso agora compra retrabalho parcelado em vergonha operacional.`,
      `**${itemName}** esta em revisao formal. Consenso hoje, novela sem temporada amanha.`,
    ], itemName, auctionId))
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
