import { EmbedBuilder } from 'discord.js';
import { pickStaffVoice } from './webhook-voice';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(pickStaffVoice([
      `**${itemName}** caiu na review. Vota com criterio; achismo sem log aqui fica sem invite.`,
      `**${itemName}** chegou na mesa da Staff. Decide limpo antes que o voice vire podcast de limbo.`,
      `**${itemName}** pediu aval. Impulso agora compra retrabalho com juros de raid atrasada.`,
      `**${itemName}** esta em revisao formal. Consenso hoje; novela amanha nao ganha renovacao.`,
    ], itemName, auctionId))
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
