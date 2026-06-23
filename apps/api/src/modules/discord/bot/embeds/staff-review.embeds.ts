import { EmbedBuilder } from 'discord.js';
import { pickStaffVoice } from './webhook-voice';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(pickStaffVoice([
      `**${itemName}** caiu na mesa da Staff. Antes de soltar vencedor no turbo, vale revisar sem ranked de improviso.`,
      `**${itemName}** entrou em revisao. Melhor fechar no voto do que no volume mais alto do voice.`,
      `**${itemName}** precisa de aval da Staff. Coroar no impulso aqui so fabrica hotfix de madrugada.`,
      `**${itemName}** pediu revisao formal. Decide com calma antes que o canal vire tribunal em live action.`,
    ], itemName, auctionId))
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
