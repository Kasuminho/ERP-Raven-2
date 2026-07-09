import { EmbedBuilder } from 'discord.js';
import { pickStaffVoice } from './webhook-voice';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(pickStaffVoice([
      `**${itemName}** caiu na review. Vota com criterio; achismo aqui entra com imposto e juros.`,
      `**${itemName}** chegou na mesa da Staff. Decide limpo antes que o voice vire audiencia publica.`,
      `**${itemName}** pediu aval. Impulso aqui compra retrabalho em edicao colecionador.`,
      `**${itemName}** esta em revisao formal. Consenso agora, textao ja fica sem palco.`,
    ], itemName, auctionId))
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
