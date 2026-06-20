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
        '**Loot na pista.** Confere o DKP antes do clique; conta refeita no susto nunca sai premium.',
        '**Leilao spawnou.** Entra com o DKP checado; fazer matematica no pos-jogo e patch de desespero.',
        '**Item em disputa.** Mira no bid com o saldo certo; improviso depois do lock so rende clip de vergonha.',
      ],
      en: [
        '**Loot is live.** Check your DKP before clicking; panic math after the lock is low-ELO tech.',
        '**Auction just spawned.** Queue up with verified DKP; post-lock arithmetic is bargain-bin strategy.',
        '**Item is contested.** Aim with the right balance; freestyle math after the bid only creates cringe VODs.',
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
        `**${playerName} fechou o drop.** O DKP saiu da conta e o tribunal do "eu quase dei bid" ja pode abrir.`,
        `**${playerName} garantiu o item.** DKP consumido; o resto vira textao tardio no canal errado.`,
        `**${playerName} levou.** O lock virou gasto real e o debate tardio perdeu o buff.`,
      ],
      en: [
        `**${playerName} locked the drop.** DKP is spent; the "I almost bid" court may now convene.`,
        `**${playerName} secured the item.** DKP consumed; the rest is just a late essay posted in the wrong channel.`,
        `**${playerName} got it.** The lock became a real spend and the late debate lost its buff.`,
      ],
    }, itemName, playerName))
    .setColor(0x27ae60)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}

export function buildAuctionDeliveryEmbed(itemName: string, playerName: string, proofImageUrl?: string, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Drop entregue: ${itemName}`, en: `Drop delivered: ${itemName}` }))
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        `Entrega registrada para **${playerName}**. Print guardado e a novela do "cade a prova?" perdeu tela.`,
        `**${playerName}** recebeu e ficou tudo salvo. O print entrou no cofre antes do Discord inventar teoria.`,
        `Entrega confirmada para **${playerName}**. Prova anexada e o VAR do loot ja tem replay.`,
      ],
      en: [
        `Delivery logged for **${playerName}**. Screenshot stored and the "where is the proof?" arc lost its screen time.`,
        `**${playerName}** received it and everything is saved. The screenshot hit the vault before Discord could theorycraft.`,
        `Delivery confirmed for **${playerName}**. Proof attached and the loot VAR already has the replay.`,
      ],
    }, itemName, playerName))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
