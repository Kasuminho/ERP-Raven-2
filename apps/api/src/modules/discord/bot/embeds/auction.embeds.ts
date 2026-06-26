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
        '**Leilao abriu.** Entra com o DKP contado; lance freestyle so rende compilado de vergonha.',
        '**Drop na mesa.** Confere o saldo antes do clique, porque matematica em choque e fake news premium.',
        '**Janela de bid no ar.** Se for mirar, mira com valor certo; remendo pos-lock e patch triste.',
        '**Item spawnou.** Abre a carteira de DKP sem inventar speedrun de calculo no ultimo segundo.',
      ],
      en: [
        '**Auction is open.** Bring counted DKP; freestyle bidding only makes a cringe compilation.',
        '**Drop is on the table.** Check your balance before clicking, because panic math is premium fake news.',
        '**The bid window is live.** If you are aiming, aim with the right number; post-lock patchwork is just sad.',
        '**The item spawned.** Open the DKP wallet without starting a last-second math speedrun.',
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
        `**${playerName} cravou o drop.** O DKP evaporou da conta e o "quase" voltou pro matchmaking.`,
        `**${playerName} levou a call.** Item garantido; o resto e comentario atrasado com latencia de museu.`,
        `**${playerName} fechou a conta.** O lock virou gasto real e o choro perdeu prioridade de fila.`,
        `**${playerName} encaixou o bid final.** O item mudou de dono e o lobby do arrependimento lotou.`,
      ],
      en: [
        `**${playerName} locked the drop.** The DKP vanished from the account and "almost" went back to matchmaking.`,
        `**${playerName} made the call.** Item secured; the rest is late commentary with museum-grade latency.`,
        `**${playerName} closed the deal.** The lock became a real spend and the crying lost queue priority.`,
        `**${playerName} landed the final bid.** The item changed hands and the regret lobby filled up.`,
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
        `Entrega confirmada para **${playerName}**. Print salvo e o CSI do loot ficou desempregado.`,
        `**${playerName}** recebeu e ja ficou no log. O "manda a prova" morreu na tela de loading.`,
        `Drop entregue para **${playerName}**. Replay anexado antes que o chat tente editar canon.`,
        `Tudo entregue a **${playerName}**. Prova no cofre e teorico do multiverso sem patch notes.`,
      ],
      en: [
        `Delivery confirmed for **${playerName}**. Screenshot saved and the loot CSI got laid off.`,
        `**${playerName}** received it and it is already in the log. The "show the proof" arc died on the loading screen.`,
        `Drop delivered to **${playerName}**. Replay attached before chat could rewrite canon.`,
        `Everything reached **${playerName}**. Proof is in the vault and the multiverse theorists lost their patch notes.`,
      ],
    }, itemName, playerName))
    .setColor(0xf2c94c)
    .setTimestamp(new Date());

  if (isDiscordImageUrl(proofImageUrl)) {
    embed.setImage(proofImageUrl);
  }

  return embed;
}
