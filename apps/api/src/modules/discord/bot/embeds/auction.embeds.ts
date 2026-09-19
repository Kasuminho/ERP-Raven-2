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
        '**Leilao aberto no ERP.** Da o lance com estrategia; all-in de emocao e pedir pra farmar mob comum a semana toda.',
        '**Item no pregao.** Lances no sigilo; quem tentar adivinhar a carteira do coleguinha vai tomar outbid seco.',
        '**Disputa iniciada.** Analisa a build antes de gastar DKP; ostentar item sem status e cosmetico caro.',
        '**Item no martelo.** Calcula o saldo; aqui o leilao e Blind Bid e choradeira nao altera o banco de dados.',
        '**Drop liberado.** Lance no site com calma; dedo nervoso em all-in ja arruinou muito veterano de 570 anos.',
      ],
      en: [
        '**Auction live on the ERP.** Bid with strategy; emotional all-in is an invitation to farm trash mobs all week.',
        '**Gear on the block.** Secret bids; trying to mind-read your teammate\'s wallet only gets you dry outbid.',
        '**Bidding started.** Check your build before burning DKP; flexing gear without stats is just expensive fashion.',
        '**Under the hammer.** Calculate your balance; this is Blind Bid and whining does not alter PostgreSQL.',
        '**Drop unlocked.** Bid with a cool head; twitchy all-in fingers have ruined many 570-year veterans.',
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
        `**${playerName} levou o leilao.** DKP descontado com sucesso. O choro e livre, mas o drop ja tem dono.`,
        `**${playerName} venceu na disputa.** Lance validado e registrado. Conspiracao de Discord perdeu no saldo.`,
        `**${playerName} cravou a vitoria.** O cofre da guilda agradece e a matematica nao aceita recurso emocional.`,
        `**${playerName} bateu o martelo.** Menos teoria de bastidores, mais DKP no cofre. Parabens pelo upgrade.`,
        `**${playerName} ganhou o drop.** O log assinou. Quem perdeu pode ir farmar os proximos bosses.`,
      ],
      en: [
        `**${playerName} won the auction.** DKP debited cleanly. Tears are free, but the drop has an owner.`,
        `**${playerName} took the bid.** Validated and logged. Discord conspiracy theories lost to raw balance.`,
        `**${playerName} locked the win.** Guild treasury thanks you and math does not accept emotional appeals.`,
        `**${playerName} slammed the hammer.** Less backstage drama, more DKP in vault. Congrats on the upgrade.`,
        `**${playerName} won the gear.** The log signed it. Whoever lost can go grind the next boss spawn.`,
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
        `Item entregue para **${playerName}**. Print salva e comprovada; o "sera que ele recebeu?" foi mutado.`,
        `Entrega concluida para **${playerName}**. Recibo no cofre e inventario atualizado sem fofoca de corredor.`,
        `Transparencia total: **${playerName}** ta com o item na mao e a auditoria ta de folga tomando cafe.`,
        `Drop na bolsa de **${playerName}**. Se o dano nao subir agora, o problema e na pecinha atras do teclado.`,
        `Entrega assinada: **${playerName}** recebeu. Registro feito; drama sem recibo aqui nao cria raiz.`,
      ],
      en: [
        `Item delivered to **${playerName}**. Screenshot saved and verified; "did he really get it?" got muted.`,
        `Delivery complete for **${playerName}**. Receipt in the vault and inventory updated without hallway gossip.`,
        `Total transparency: **${playerName}** holds the item and audit is off duty sipping coffee.`,
        `Drop in **${playerName}**'s bag. If your DPS does not spike now, the bug is behind the keyboard.`,
        `Signed off: **${playerName}** received it. Logged; receiptless drama finds no fertile ground here.`,
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
