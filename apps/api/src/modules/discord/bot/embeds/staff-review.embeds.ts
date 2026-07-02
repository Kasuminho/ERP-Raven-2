import { EmbedBuilder } from 'discord.js';
import { pickStaffVoice } from './webhook-voice';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(pickStaffVoice([
      `**${itemName}** caiu na review. Vota com criterio; achismo aqui paga taxa de conveniencia.`,
      `**${itemName}** chegou na mesa da Staff. Decide limpo antes que o voice abra CPI de madrugada.`,
      `**${itemName}** pediu aval. Impulso aqui e pacote deluxe de retrabalho.`,
      `**${itemName}** esta em revisao formal. Consenso agora, textao preventivamente cancelado.`,
    ], itemName, auctionId))
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
