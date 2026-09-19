import { EmbedBuilder } from 'discord.js';
import { pickStaffVoice } from './webhook-voice';

export function buildStaffReviewRequiredEmbed(itemName: string, auctionId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Revisao da Staff pendente')
    .setDescription(pickStaffVoice([
      `**${itemName}** caiu na mesa da Staff. Vota com base no log; intuicao sem prova aqui nao passa da portaria.`,
      `**${itemName}** em revisao formal. Avalia assiduidade e camada antes que a call vire CPI de partilha.`,
      `**${itemName}** travado para despacho. Vota no ERP com criterio; compadrio aqui toma debuff de auditoria.`,
      `**${itemName}** aguarda carimbo da lideranca. Menos feeling, mais presenca 30D; a regra foi feita pra ser cumprida.`,
      `**${itemName}** na fila de review. Despacha no site antes que o vencedor venha cobrar no privado as 2 da manha.`,
    ], itemName, auctionId))
    .addFields({ name: 'ID do leilao', value: auctionId, inline: false })
    .setColor(0xeb5757)
    .setTimestamp(new Date());
}
