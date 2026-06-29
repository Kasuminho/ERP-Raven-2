import { EmbedBuilder } from 'discord.js';
import { pickStaffVoice } from './webhook-voice';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(pickStaffVoice([
      `**${itemName}** caiu na review. Vota com criterio; freestyle de madrugada cobra juros.`,
      `**${itemName}** chegou na mesa da Staff. Decide limpo antes que o voice vire mesa-redonda infinita.`,
      `**${itemName}** pediu aval. Impulso aqui e atalho premium para retrabalho.`,
      `**${itemName}** esta em revisao formal. Consenso agora, novela evitada depois.`,
    ], itemName, auctionId))
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
