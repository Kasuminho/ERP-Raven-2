import { EmbedBuilder } from 'discord.js';
import { DiscordLocale, localeCopy } from './discord-locale';
import { pickBilingualVoice } from './webhook-voice';

export type AuctionEmbedData = {
  itemName: string;
  itemTier: string;
  minimumBid: number;
  endsAt: Date;
  url: string;
};

function discordTimestamp(date: Date, style: 'F' | 'R' = 'F'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

function isDiscordImageUrl(url?: string): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export function buildAuctionCreatedEmbed(data: AuctionEmbedData, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(localeCopy(locale, {
      'pt-BR': `Leilao aberto: ${data.itemName}`,
      en: `Auction open: ${data.itemName}`,
    }))
    .setColor(0x2f80ed)
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        '**Leilao aberto.** Confere DKP antes do clique; all-in no impulso e boleto emocional com juros de raid.',
        '**Drop entrou no pregao.** Lance com cerebro ligado; arrependimento depois nao ganha reembolso nem skin.',
        '**Janela de bid no ar.** Mira no item e segura o ego; mouse tremendo nao vira argumento na auditoria.',
        '**Item na mesa.** Calcula frio; economia de raid nao e live de coach vendendo planilha magica.',
        '**Pregao liberado.** Se for clicar no susto, pelo menos avisa o bom senso pra ele sair da frente.',
      ],
      en: [
        '**Auction opened.** Check DKP before clicking; impulse all-in is emotional debt with raid interest.',
        '**Drop entered the market.** Bid with brain online; regret later gets no refund and no skin.',
        '**Bid window is live.** Aim at the item and hold the ego; shaky mouse is not an audit argument.',
        '**Item is on the table.** Calculate cold; raid economy is not a coach stream selling magic spreadsheets.',
        '**Bidding is unlocked.** If you click in panic, at least warn common sense to step aside.',
      ],
    }, data.itemName, data.itemTier, data.minimumBid, data.endsAt))
    .addFields(
      { name: 'Tier', value: data.itemTier, inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Lance minimo', en: 'Minimum bid' }), value: String(data.minimumBid), inline: true },
      {
        name: localeCopy(locale, { 'pt-BR': 'Termina', en: 'Ends' }),
        value: `${discordTimestamp(data.endsAt, 'F')}\n${discordTimestamp(data.endsAt, 'R')}`,
        inline: false,
      },
      { name: 'Dashboard', value: data.url || 'Dashboard link unavailable', inline: false },
    )
    .setTimestamp(new Date());
}

export function buildAuctionWinnerEmbed(itemName: string, playerName: string, proofImageUrl?: string, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Vencedor definido: ${itemName}`, en: `Winner locked: ${itemName}` }))
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        `**${playerName} ficou com o drop.** DKP debitado; o "mas e se" foi kickado da call por falta de prova.`,
        `**${playerName} fechou o leilao.** Resultado definido e o textao perdeu prioridade ate no Windows Update.`,
        `**${playerName} levou no martelo.** Lock cobrado, registro salvo e drama sem passe de batalha.`,
        `**${playerName} cravou o resultado.** Item com dono; o tribunal do sofa pode mutar o microfone.`,
        `**${playerName} ganhou.** O placar assinou embaixo; teoria alternativa fica no servidor de testes.`,
      ],
      en: [
        `**${playerName} got the drop.** DKP debited; the "but what if" got kicked from voice for no proof.`,
        `**${playerName} closed the auction.** Result decided and the essay lost priority even to Windows Update.`,
        `**${playerName} won at the hammer.** Lock charged, record saved, and drama gets no battle pass.`,
        `**${playerName} locked the result.** Item has an owner; couch court may mute the mic.`,
        `**${playerName} won.** The scoreboard signed it; alternative theory stays on the test server.`,
      ],
    }, itemName, playerName))
    .setColor(0x27ae60)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}

export function buildAuctionDeliveryEmbed(itemName: string, playerName: string, proofImageUrl?: string, locale: DiscordLocale = 'pt-BR', resultUrl?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Drop entregue: ${itemName}`, en: `Drop delivered: ${itemName}` }))
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        `Entrega confirmada para **${playerName}**. Print anexado; "confia" foi removido do grupo por spam.`,
        `**${playerName}** recebeu e o log assinou. Auditoria sem prova aqui nem passa da tela de login.`,
        `Drop entregue para **${playerName}**. Comprovante no lugar antes que o chat escreva fanfic em 4 atos.`,
        `Tudo certo com **${playerName}**. Registro feito; o drama ficou sem mana para o proximo episodio.`,
        `**${playerName}** recebeu. Prova salva, log em paz e achismo sem vaga no squad.`,
      ],
      en: [
        `Delivery confirmed for **${playerName}**. Screenshot attached; "trust me" was removed from the group for spam.`,
        `**${playerName}** received it and the log signed. Audit without proof does not pass the login screen here.`,
        `Drop delivered to **${playerName}**. Proof in place before chat writes fanfic in four acts.`,
        `All set with **${playerName}**. Record made; drama ran out of mana for the next episode.`,
        `**${playerName}** received it. Proof saved, log at peace, and guesswork has no squad slot.`,
      ],
    }, itemName, playerName))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (resultUrl) {
    embed.addFields({
      name: localeCopy(locale, { 'pt-BR': 'Resultados no site', en: 'Results on the website' }),
      value: resultUrl,
    });
  }

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
