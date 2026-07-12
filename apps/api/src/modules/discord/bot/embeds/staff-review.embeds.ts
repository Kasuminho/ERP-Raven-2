import { EmbedBuilder } from 'discord.js';
import { pickStaffVoice } from './webhook-voice';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(pickStaffVoice([
      `**${itemName}** caiu na review. Vota com criterio; achismo aqui paga taxa de conveniencia e vergonha.`,
      `**${itemName}** chegou na mesa da Staff. Decide limpo antes que o voice vire CPI com delay.`,
      `**${itemName}** pediu aval. Impulso agora compra retrabalho em pacote deluxe.`,
      `**${itemName}** esta em revisao formal. Consenso hoje, textao sem palco amanha.`,
    ], itemName, auctionId))
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
