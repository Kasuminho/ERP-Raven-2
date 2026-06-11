import { EmbedBuilder } from 'discord.js';
import { blocks } from './discord-formatting';

export type AnnouncementEmbedData = {
  stageLabel: string;
  type: string;
  title: string;
  description?: string | null;
  eventTime: Date;
};

export type RequestReminderEmbedData = {
  title: string;
  playerName: string;
  itemName: string;
  daysIdle: number;
  rankPosition: number;
  actionText: string;
};

export type ItemInterestCreatedEmbedData = {
  title: string;
  itemName: string;
  mode: string;
  criteriaPt: string;
  criteriaEn: string;
  closesAt: Date;
  url: string;
  imageUrl?: string;
};

export type ItemInterestDeliveredEmbedData = {
  title: string;
  itemName: string;
  playerNames: string[];
  proofImageUrl?: string;
};

export type ItemInterestSkillBatchEmbedData = {
  count: number;
  mode: string;
  closesAt: Date;
  url: string;
  sampleTitles: string[];
};

function discordTimestamp(date: Date, style: 'F' | 'R' = 'F'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

function isDiscordImageUrl(url?: string): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export function buildAnnouncementEmbed(data: AnnouncementEmbedData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(data.stageLabel)
    .setColor(0xf2c94c)
    .setDescription(data.description?.trim() || blocks(
      'Aviso da guild no ar. Se isso te envolve, bota no calendario antes que o tempo passe por cima.',
      'Guild announcement is live. If this involves you, put it on the calendar before time wins.',
    ))
    .addFields(
      { name: data.type, value: `**${data.title}**`, inline: false },
      { name: 'Horario', value: `${discordTimestamp(data.eventTime, 'F')}\n${discordTimestamp(data.eventTime, 'R')}`, inline: false },
    )
    .setTimestamp(new Date());

  return embed;
}

export function buildRequestReminderEmbed(data: RequestReminderEmbedData): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(data.title)
    .setColor(0xeb5757)
    .setDescription(blocks(
      'Fila parada nao dropa item. Atualiza pelo site e deixa a Staff trabalhar feliz.',
      'A frozen queue does not deliver loot. Update it on the website so Staff can keep the line moving.',
    ))
    .addFields(
      { name: 'Player', value: data.playerName, inline: true },
      { name: 'Item', value: data.itemName, inline: true },
      { name: 'Sem atualizar', value: `${data.daysIdle} dia(s)`, inline: true },
      { name: 'Rank', value: `#${data.rankPosition}`, inline: true },
      { name: 'Acao', value: data.actionText, inline: false },
    )
    .setTimestamp(new Date());
}

export function buildItemInterestCreatedEmbed(data: ItemInterestCreatedEmbedData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Interesse aberto: ${data.title}`)
    .setColor(0x27ae60)
    .setDescription(blocks(
      'Loot disponivel. Se esse item faz sentido pro seu personagem, declara interesse no site e anexa 1 print no padrao. Sem print, sem magia.',
      'Loot is available. If this item fits your character, declare interest on the website and attach 1 proper screenshot.',
    ))
    .addFields(
      { name: 'Item', value: data.itemName, inline: false },
      { name: 'Modo / Mode', value: data.mode, inline: true },
      { name: 'Fecha / Closes', value: `${discordTimestamp(data.closesAt, 'F')}\n${discordTimestamp(data.closesAt, 'R')}`, inline: false },
      { name: 'Regras PT', value: data.criteriaPt || 'Sem regras cadastradas.', inline: false },
      { name: 'Rules EN', value: data.criteriaEn || 'No rules configured.', inline: false },
      { name: 'Dashboard', value: data.url || 'Dashboard link unavailable', inline: false },
    )
    .setTimestamp(new Date());

  if (isDiscordImageUrl(data.imageUrl)) {
    embed.setThumbnail(data.imageUrl);
  }

  return embed;
}

export function buildItemInterestDeliveredEmbed(data: ItemInterestDeliveredEmbedData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Interesse entregue: ${data.title}`)
    .setColor(0xf2c94c)
    .setDescription(blocks(
      'Entrega registrada. O loot saiu da fila e foi parar onde tinha que parar.',
      'Delivery logged. The loot left the queue and reached its new owner.',
    ))
    .addFields(
      { name: 'Item', value: data.itemName, inline: false },
      { name: 'Recebedor(es) / Recipient(s)', value: data.playerNames.join('\n') || 'Player', inline: false },
    )
    .setTimestamp(new Date());

  if (isDiscordImageUrl(data.proofImageUrl)) {
    embed.setImage(data.proofImageUrl);
  }

  return embed;
}

export function buildItemInterestSkillBatchEmbed(data: ItemInterestSkillBatchEmbedData): EmbedBuilder {
  const sample = data.sampleTitles.length > 0 ? data.sampleTitles.slice(0, 12).join('\n') : 'Skills disponiveis no dashboard.';
  const extra = data.count > data.sampleTitles.length ? `\n... e mais ${data.count - data.sampleTitles.length}` : '';

  return new EmbedBuilder()
    .setTitle('Skills abertas para interesse')
    .setColor(0x27ae60)
    .setDescription(blocks(
      'A Staff abriu um pacote de skills no site. Entra la, confere com calma e declara interesse no que presta pro seu personagem.',
      'Staff opened a skill batch on the website. Check it calmly and declare interest only where it actually helps your character.',
    ))
    .addFields(
      { name: 'Quantidade / Count', value: String(data.count), inline: true },
      { name: 'Modo / Mode', value: data.mode, inline: true },
      { name: 'Fecha / Closes', value: `${discordTimestamp(data.closesAt, 'F')}\n${discordTimestamp(data.closesAt, 'R')}`, inline: false },
      { name: 'Amostra / Sample', value: `${sample}${extra}`.slice(0, 1024), inline: false },
      { name: 'Dashboard', value: data.url || 'Dashboard link unavailable', inline: false },
    )
    .setTimestamp(new Date());
}
