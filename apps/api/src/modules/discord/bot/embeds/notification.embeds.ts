import { EmbedBuilder } from 'discord.js';
import { DiscordLocale, localeCopy } from './discord-locale';
import { pickBilingualVoice, pickStaffVoice } from './webhook-voice';

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
    'Novo anuncio cadastrado': { 'pt-BR': 'Novo anuncio cadastrado', en: 'New announcement' },
    'Lembrete diario': { 'pt-BR': 'Lembrete diario', en: 'Daily reminder' },
    'Faltam 4 horas': { 'pt-BR': 'Faltam 4 horas', en: '4 hours left' },
    'Falta 1 hora': { 'pt-BR': 'Falta 1 hora', en: '1 hour left' },
    'Faltam 30 minutos': { 'pt-BR': 'Faltam 30 minutos', en: '30 minutes left' },
    Agora: { 'pt-BR': 'Agora', en: 'Starting now' },
  };
  const stage = stages[label];
  return stage ? localeCopy(locale, stage) : label;
}

export function buildAnnouncementEmbed(data: AnnouncementEmbedData, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(announcementStageLabel(data.stageLabel, locale))
    .setColor(0xf2c94c)
    .setDescription(data.description?.trim() || pickBilingualVoice({
      'pt-BR': [
        '**Aviso na tela.** Joga no calendario antes que a memoria feche o jogo sem salvar.',
        '**Horario publicado.** Marca agora; "eu lembro" e build glass cannon contra vida adulta.',
        '**Ping operacional entregue.** Agenda logo antes que o cerebro troque boss por scroll infinito.',
        '**Waypoint fixado.** Salva o horario e evita speedrun de desculpa na portaria.',
      ],
      en: [
        '**Announcement on screen.** Put it on the calendar before memory closes the game unsaved.',
        '**Time published.** Mark it now; "I will remember" is a glass-cannon build against adult life.',
        '**Operational ping delivered.** Schedule it before the brain swaps boss for infinite scroll.',
        '**Waypoint pinned.** Save the time and avoid an excuse speedrun at the gate.',
      ],
    }, data.stageLabel, data.type, data.title, data.eventTime))
    .addFields(
      { name: data.type, value: `**${data.title}**`, inline: false },
      { name: localeCopy(locale, { 'pt-BR': 'Horario', en: 'Time' }), value: `${discordTimestamp(data.eventTime, 'F')}\n${discordTimestamp(data.eventTime, 'R')}`, inline: false },
    )
    .setTimestamp(new Date());

  return embed;
}

export function buildRequestReminderEmbed(data: RequestReminderEmbedData, locale: DiscordLocale = 'pt-BR', staffOnly = false): EmbedBuilder {
  const copy = (values: Record<DiscordLocale, string>) => staffOnly ? values['pt-BR'] : localeCopy(locale, values);
  const description = staffOnly
    ? pickStaffVoice([
      '**Fila parada nao dropa update.** Cobra o print antes que o cron aplique voadora regulamentar.',
      '**Request montou barraca.** Puxa o player agora antes que a pendencia vire ponto turistico.',
      '**Feed sem novidade.** Cutuca hoje; amanha isso chega com textao e screenshot batata.',
      '**Pedido estacionado em AFK.** Chama o player antes que a poeira abra epic no backlog.',
    ], data.title, data.playerName, data.itemName, data.daysIdle, data.rankPosition)
    : pickBilingualVoice({
      'pt-BR': [
        '**Request parado nao upa.** Atualiza o print antes que teu rank tome nerf com VT no telao.',
        '**Fila sem prova nao invoca loot.** Sobe print novo antes que teu lugar vire item cosmetico inutil.',
        '**Sem update recente.** Resolve ja; deixar pro fim e comprar ingresso VIP do "vacilei".',
        '**Teu request dormiu no ponto.** Atualiza a prova antes que a fila te coloque no banco de reservas.',
      ],
      en: [
        '**A stalled request does not level up.** Update the screenshot before your rank gets nerfed on the big screen.',
        '**A queue without proof summons no loot.** Upload fresh proof before your spot becomes useless cosmetics.',
        '**No recent update found.** Fix it now; leaving it late buys a VIP ticket to "my bad".',
        '**Your request slept through the stop.** Update the proof before the queue sends you to reserves.',
      ],
    }, data.title, data.playerName, data.itemName, data.daysIdle, data.rankPosition);

  return new EmbedBuilder()
    .setTitle(data.title)
    .setColor(0xeb5757)
    .setDescription(description)
    .addFields(
      { name: 'Player', value: data.playerName, inline: true },
      { name: 'Item', value: data.itemName, inline: true },
      { name: copy({ 'pt-BR': 'Sem atualizar', en: 'No update' }), value: `${data.daysIdle} ${copy({ 'pt-BR': 'dia(s)', en: 'day(s)' })}`, inline: true },
      { name: 'Rank', value: `#${data.rankPosition}`, inline: true },
      { name: copy({ 'pt-BR': 'Acao', en: 'Action' }), value: data.actionText, inline: false },
    )
    .setTimestamp(new Date());
}

export function buildItemInterestCreatedEmbed(data: ItemInterestCreatedEmbedData, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Interesse aberto: ${data.title}`, en: `Interest open: ${data.title}` }))
    .setColor(0x27ae60)
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        '**Interesse aberto.** Declara no site com print decente; gambiarra aqui toma ban da paciencia.',
        '**Fila do loot liberada.** Escolhe direito e prova bem, antes que o Discord vire cartorio de build.',
        '**Janela de interesse online.** Sem evidencia boa, a burocracia desbloqueia fase secreta.',
        '**Registro valendo.** Entra com criterio antes que o screenshot vire audiencia de grupo.',
      ],
      en: [
        '**Interest is open.** Declare it on the site with a decent screenshot; hacks here get patience-banned.',
        '**The loot queue is unlocked.** Choose properly and prove it well before Discord becomes a build notary.',
        '**The interest window is online.** Without good evidence, bureaucracy unlocks a secret stage.',
        '**Registration is live.** Join with criteria before the screenshot becomes group hearing.',
      ],
    }, data.title, data.itemName, data.mode, data.closesAt))
    .addFields(
      { name: 'Item', value: data.itemName, inline: false },
      { name: localeCopy(locale, { 'pt-BR': 'Modo', en: 'Mode' }), value: data.mode, inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Fecha', en: 'Closes' }), value: `${discordTimestamp(data.closesAt, 'F')}\n${discordTimestamp(data.closesAt, 'R')}`, inline: false },
      { name: 'Regras PT-BR', value: data.criteriaPt || 'Sem regras cadastradas.', inline: false },
      { name: 'Rules EN', value: data.criteriaEn || 'No rules configured.', inline: false },
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
    .setTitle(localeCopy(locale, { 'pt-BR': `Interesse entregue: ${data.title}`, en: `Interest delivered: ${data.title}` }))
    .setColor(0xf2c94c)
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        '**Entrega logada.** O loot saiu da fila e o "cade meu item?" perdeu admin no chat.',
        '**Interesse concluido.** Item entregue; teoria paralela caiu para serie B do argumento.',
        '**Distribuicao confirmada.** Tudo no historico, sem podcast de contabilidade freestyle.',
        '**Entrega fechada.** Item com destino certo e duvida vendo replay sem narracao.',
      ],
      en: [
        '**Delivery logged.** The loot left the queue and "where is my item?" lost chat admin.',
        '**Interest completed.** Item delivered; the parallel theory got relegated to argument tier two.',
        '**Distribution confirmed.** Everything is in history, with no freestyle-accounting podcast.',
        '**Delivery closed.** Item has a proper destination and doubt is watching replay without commentary.',
      ],
    }, data.title, data.itemName, data.playerNames.join('|')))
    .addFields(
      { name: 'Item', value: data.itemName, inline: false },
      { name: localeCopy(locale, { 'pt-BR': 'Recebedor(es)', en: 'Recipient(s)' }), value: data.playerNames.join('\n') || 'Player', inline: false },
    )
    .setTimestamp(new Date());

  if (isDiscordImageUrl(data.proofImageUrl)) {
    embed.setImage(data.proofImageUrl);
  }

  return embed;
}

export function buildItemInterestSkillBatchEmbed(data: ItemInterestSkillBatchEmbedData, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  const sample = data.sampleTitles.length > 0 ? data.sampleTitles.slice(0, 12).join('\n') : localeCopy(locale, { 'pt-BR': 'Skills disponiveis no dashboard.', en: 'Skills available on the dashboard.' });
  const extra = data.count > data.sampleTitles.length ? `\n${localeCopy(locale, { 'pt-BR': '... e mais', en: '... and' })} ${data.count - data.sampleTitles.length}` : '';

  return new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': 'Skills abertas para interesse', en: 'Skills open for interest' }))
    .setColor(0x27ae60)
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        '**Pacote de skills no ar.** Pega upgrade que trabalha, nao purpurina fazendo cosplay de meta.',
        '**Lote liberado.** Prioriza build de verdade; brilho sem impacto e skin cara de planilha.',
        '**Mais skills na fila.** Mira no que muda o boneco, nao no tooltip palestrinha.',
        '**Batch aberto.** Escolhe gameplay, nao item caro fazendo publi no inventario.',
      ],
      en: [
        '**Skill batch is live.** Grab the upgrade that works, not glitter cosplaying as meta.',
        '**Bundle unlocked.** Prioritize a real build; sparkle without impact is spreadsheet-expensive skin.',
        '**More skills in queue.** Aim for what changes the character, not a tooltip giving a lecture.',
        '**Batch is open.** Choose gameplay, not expensive gear doing sponsored posts in inventory.',
      ],
    }, data.count, data.mode, data.closesAt, data.sampleTitles.join('|')))
    .addFields(
      { name: localeCopy(locale, { 'pt-BR': 'Quantidade', en: 'Count' }), value: String(data.count), inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Modo', en: 'Mode' }), value: data.mode, inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Fecha', en: 'Closes' }), value: `${discordTimestamp(data.closesAt, 'F')}\n${discordTimestamp(data.closesAt, 'R')}`, inline: false },
      { name: localeCopy(locale, { 'pt-BR': 'Amostra', en: 'Sample' }), value: `${sample}${extra}`.slice(0, 1024), inline: false },
      { name: 'Dashboard', value: data.url || 'Dashboard link unavailable', inline: false },
    )
    .setTimestamp(new Date());
}
