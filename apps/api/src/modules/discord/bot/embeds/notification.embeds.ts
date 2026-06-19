import { EmbedBuilder } from 'discord.js';
import { DiscordLocale, localeCopy } from './discord-locale';

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

function announcementStageLabel(label: string, locale: DiscordLocale): string {
  const stages: Record<string, Record<DiscordLocale, string>> = {
    'Novo anuncio cadastrado': { 'pt-BR': 'Novo anuncio cadastrado', en: 'New announcement', es: 'Nuevo anuncio' },
    'Lembrete diario': { 'pt-BR': 'Lembrete diario', en: 'Daily reminder', es: 'Recordatorio diario' },
    'Faltam 4 horas': { 'pt-BR': 'Faltam 4 horas', en: '4 hours left', es: 'Faltan 4 horas' },
    'Falta 1 hora': { 'pt-BR': 'Falta 1 hora', en: '1 hour left', es: 'Falta 1 hora' },
    'Faltam 30 minutos': { 'pt-BR': 'Faltam 30 minutos', en: '30 minutes left', es: 'Faltan 30 minutos' },
    Agora: { 'pt-BR': 'Agora', en: 'Starting now', es: 'Ahora' },
  };
  return stages[label]?.[locale] ?? label;
}

export function buildAnnouncementEmbed(data: AnnouncementEmbedData, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(announcementStageLabel(data.stageLabel, locale))
    .setColor(0xf2c94c)
    .setDescription(data.description?.trim() || localeCopy(locale, {
      'pt-BR': '**Aviso no ar.** Bota no calendario agora; confiar na memoria e build de papel.',
      en: '**Announcement live.** Put it on your calendar; trusting memory is a paper-tier build.',
      es: '**Aviso publicado.** Ponlo en el calendario; confiar en la memoria es build de papel.',
    }))
    .addFields(
      { name: data.type, value: `**${data.title}**`, inline: false },
      { name: localeCopy(locale, { 'pt-BR': 'Horario', en: 'Time', es: 'Horario' }), value: `${discordTimestamp(data.eventTime, 'F')}\n${discordTimestamp(data.eventTime, 'R')}`, inline: false },
    )
    .setTimestamp(new Date());

  return embed;
}

export function buildRequestReminderEmbed(data: RequestReminderEmbedData, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(data.title)
    .setColor(0xeb5757)
    .setDescription(localeCopy(locale, {
      'pt-BR': '**Fila parada nao dropa item.** Atualiza o print antes que seu rank conheca o porao.',
      en: '**A frozen queue drops nothing.** Update the screenshot before your rank discovers the basement.',
      es: '**Una cola parada no da loot.** Actualiza la captura antes de que tu rank conozca el sotano.',
    }))
    .addFields(
      { name: 'Player', value: data.playerName, inline: true },
      { name: 'Item', value: data.itemName, inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Sem atualizar', en: 'No update', es: 'Sin actualizar' }), value: `${data.daysIdle} ${localeCopy(locale, { 'pt-BR': 'dia(s)', en: 'day(s)', es: 'dia(s)' })}`, inline: true },
      { name: 'Rank', value: `#${data.rankPosition}`, inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Acao', en: 'Action', es: 'Accion' }), value: data.actionText, inline: false },
    )
    .setTimestamp(new Date());
}

export function buildItemInterestCreatedEmbed(data: ItemInterestCreatedEmbedData, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Interesse aberto: ${data.title}`, en: `Interest open: ${data.title}`, es: `Interes abierto: ${data.title}` }))
    .setColor(0x27ae60)
    .setDescription(localeCopy(locale, {
      'pt-BR': '**Loot disponivel.** Declara no site e manda o print certo. Sem print, sem magia; Aristolfo nao le mente ainda.',
      en: '**Loot available.** Declare on the site and attach the right screenshot. Aristolfo cannot read minds yet.',
      es: '**Loot disponible.** Declara en el sitio y adjunta la captura correcta. Aristolfo aun no lee mentes.',
    }))
    .addFields(
      { name: 'Item', value: data.itemName, inline: false },
      { name: localeCopy(locale, { 'pt-BR': 'Modo', en: 'Mode', es: 'Modo' }), value: data.mode, inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Fecha', en: 'Closes', es: 'Cierra' }), value: `${discordTimestamp(data.closesAt, 'F')}\n${discordTimestamp(data.closesAt, 'R')}`, inline: false },
      { name: localeCopy(locale, { 'pt-BR': 'Regras', en: 'Rules', es: 'Reglas' }), value: locale === 'en' ? (data.criteriaEn || 'No rules configured.') : (data.criteriaPt || localeCopy(locale, { 'pt-BR': 'Sem regras cadastradas.', en: 'No rules configured.', es: 'Sin reglas configuradas.' })), inline: false },
      { name: 'Dashboard', value: data.url || 'Dashboard link unavailable', inline: false },
    )
    .setTimestamp(new Date());

  if (isDiscordImageUrl(data.imageUrl)) {
    embed.setThumbnail(data.imageUrl);
  }

  return embed;
}

export function buildItemInterestDeliveredEmbed(data: ItemInterestDeliveredEmbedData, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Interesse entregue: ${data.title}`, en: `Interest delivered: ${data.title}`, es: `Interes entregado: ${data.title}` }))
    .setColor(0xf2c94c)
    .setDescription(localeCopy(locale, {
      'pt-BR': '**Entrega registrada.** O loot saiu da fila; pode encerrar a teoria da conspiracao.',
      en: '**Delivery logged.** Loot left the queue; the conspiracy thread may now close.',
      es: '**Entrega registrada.** El loot salio de la cola; pueden cerrar la teoria conspirativa.',
    }))
    .addFields(
      { name: 'Item', value: data.itemName, inline: false },
      { name: localeCopy(locale, { 'pt-BR': 'Recebedor(es)', en: 'Recipient(s)', es: 'Receptor(es)' }), value: data.playerNames.join('\n') || 'Player', inline: false },
    )
    .setTimestamp(new Date());

  if (isDiscordImageUrl(data.proofImageUrl)) {
    embed.setImage(data.proofImageUrl);
  }

  return embed;
}

export function buildItemInterestSkillBatchEmbed(data: ItemInterestSkillBatchEmbedData, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const sample = data.sampleTitles.length > 0 ? data.sampleTitles.slice(0, 12).join('\n') : localeCopy(locale, { 'pt-BR': 'Skills disponiveis no dashboard.', en: 'Skills available on the dashboard.', es: 'Skills disponibles en el dashboard.' });
  const extra = data.count > data.sampleTitles.length ? `\n${localeCopy(locale, { 'pt-BR': '... e mais', en: '... and', es: '... y' })} ${data.count - data.sampleTitles.length}` : '';

  return new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': 'Skills abertas para interesse', en: 'Skills open for interest', es: 'Skills abiertas para interes' }))
    .setColor(0x27ae60)
    .setDescription(localeCopy(locale, {
      'pt-BR': '**Pacote de skills liberado.** Escolhe o que presta pro boneco, nao o que brilha mais no inventario.',
      en: '**Skill batch unlocked.** Pick what helps your build, not whatever shines hardest in inventory.',
      es: '**Paquete de skills liberado.** Elige lo que sirve a tu build, no lo que mas brilla.',
    }))
    .addFields(
      { name: localeCopy(locale, { 'pt-BR': 'Quantidade', en: 'Count', es: 'Cantidad' }), value: String(data.count), inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Modo', en: 'Mode', es: 'Modo' }), value: data.mode, inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Fecha', en: 'Closes', es: 'Cierra' }), value: `${discordTimestamp(data.closesAt, 'F')}\n${discordTimestamp(data.closesAt, 'R')}`, inline: false },
      { name: localeCopy(locale, { 'pt-BR': 'Amostra', en: 'Sample', es: 'Muestra' }), value: `${sample}${extra}`.slice(0, 1024), inline: false },
      { name: 'Dashboard', value: data.url || 'Dashboard link unavailable', inline: false },
    )
    .setTimestamp(new Date());
}
