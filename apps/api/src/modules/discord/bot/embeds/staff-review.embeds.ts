import { EmbedBuilder } from 'discord.js';
import { pickStaffVoice } from './webhook-voice';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(pickStaffVoice([
      `**${itemName}** caiu na review. Decide no voto, nao no grito com microfone estourado.`,
      `**${itemName}** entrou na mesa da Staff. Fecha com criterio antes que a madrugada cobre hotfix.`,
      `**${itemName}** pediu aval. Coroar no impulso aqui e buff de retrabalho.`,
      `**${itemName}** esta em revisao formal. Melhor consenso agora do que tribunal no voice.`,
    ], itemName, auctionId))
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
