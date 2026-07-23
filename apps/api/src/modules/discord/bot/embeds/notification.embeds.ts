import { EmbedBuilder } from 'discord.js';
import { DiscordLocale, localeCopy } from './discord-locale';
import { bilingualBlocks, pickBilingualVoice, pickStaffVoice, pickVoiceLine } from './webhook-voice';

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

export type PlayerDailyReminderEmbedData = {
  playerName: string;
  reasonsPt: string[];
  reasonsEn: string[];
  profileUrl?: string;
  codexUrl?: string;
  hasCodex: boolean;
};

export type EventReminderEmbedData = {
  playerName: string;
  eventName: string;
  startsAt: Date;
  timezone: string;
  requiresRsvp: boolean;
  url: string;
};

function discordTimestamp(date: Date, style: 'F' | 'R' = 'F'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

function isDiscordImageUrl(url?: string): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export function buildPlayerDailyReminderEmbed(data: PlayerDailyReminderEmbedData): EmbedBuilder {
  const linksPt = [
    data.profileUrl ? `[Corrigir perfil e progresso](${data.profileUrl})` : null,
    data.hasCodex && data.codexUrl ? `[Confirmar Codex ou informar falha](${data.codexUrl})` : null,
  ].filter(Boolean).join('\n');
  const linksEn = [
    data.profileUrl ? `[Fix profile and progress](${data.profileUrl})` : null,
    data.hasCodex && data.codexUrl ? `[Confirm Codex or report a failure](${data.codexUrl})` : null,
  ].filter(Boolean).join('\n');
  const tailPt = pickVoiceLine([
    'Resolve hoje; pendencia parada vira side quest que ninguem pediu.',
    'Fecha isso agora; checklist fazendo cosplay de boss recorrente cansa.',
    'Arruma antes do reset mental; AFK burocratico nao dropa respeito.',
    'Da baixa nisso hoje; fila pessoal sem update so farma cobranca.',
  ], data.playerName, data.reasonsPt.join('|'), data.hasCodex ? 'codex' : false, data.profileUrl);
  const tailEn = pickVoiceLine([
    'Handle it today; stalled pending work becomes an unwanted side quest.',
    'Close this now; checklist cosplaying as a recurring boss gets old.',
    'Fix it before the mental reset; bureaucratic AFK drops no respect.',
    'Clear it today; personal queue without updates only farms reminders.',
  ], data.playerName, data.reasonsPt.join('|'), data.hasCodex ? 'codex' : false, data.profileUrl);

  return new EmbedBuilder()
    .setTitle('Pendencias do dia / Daily action required')
    .setColor(0xeb5757)
    .setDescription(bilingualBlocks({
      'pt-BR': `**${data.playerName}, o checklist encontrou isto:**\n${data.reasonsPt.map((reason) => `- ${reason}`).join('\n')}\n\n${linksPt}\n\n${tailPt}`,
      en: `**${data.playerName}, the checklist found this:**\n${data.reasonsEn.map((reason) => `- ${reason}`).join('\n')}\n\n${linksEn}\n\n${tailEn}`,
    }))
    .setTimestamp(new Date());
}

export function buildEventReminderEmbed(data: EventReminderEmbedData): EmbedBuilder {
  const localTime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: data.timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data.startsAt);
  const tailPt = pickVoiceLine([
    'Calendario nao tanka esquecimento sozinho; revisa antes do boss puxar.',
    'Confere agora; memoria freestyle costuma entrar de chinelo no horario errado.',
    'Olha o compromisso; "achei que era depois" nao passa no parse do DKP.',
    'Revisa a agenda; sumir no pull e estrategia ruim ate no modo facil.',
  ], data.playerName, data.eventName, data.startsAt, data.requiresRsvp ? 'rsvp' : 'confirmed');
  const tailEn = pickVoiceLine([
    'The calendar cannot tank forgetfulness alone; check before the boss pull.',
    'Check now; freestyle memory usually arrives in sandals at the wrong time.',
    'Review the commitment; "I thought it was later" fails the DKP parser.',
    'Check the schedule; vanishing on pull is bad strategy even on easy mode.',
  ], data.playerName, data.eventName, data.startsAt, data.requiresRsvp ? 'rsvp' : 'confirmed');
  return new EmbedBuilder()
    .setTitle(data.requiresRsvp ? 'RSVP pendente / RSVP required' : 'Evento confirmado / Confirmed event')
    .setColor(data.requiresRsvp ? 0xf2c94c : 0x27ae60)
    .setDescription(bilingualBlocks({
      'pt-BR': `**${data.playerName}**, **${data.eventName}** comeca em ate 24h (${localTime}, ${data.timezone}). ${data.requiresRsvp ? 'Responda vou, talvez ou nao vou.' : 'Voce confirmou; revise o horario e avise se o plano mudou.'}\n\n[Ver compromissos](${data.url})\n\n${tailPt}`,
      en: `**${data.playerName}**, **${data.eventName}** starts within 24h (${localTime}, ${data.timezone}). ${data.requiresRsvp ? 'Answer attending, maybe, or cannot attend.' : 'You confirmed; check the time and update your answer if plans changed.'}\n\n[View commitments](${data.url})\n\n${tailEn}`,
    }))
    .setTimestamp(new Date());
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
        '**Aviso na tela.** Poe no calendario antes que a memoria de pote suma no primeiro alt-tab.',
        '**Horario publicado.** Marca agora; "eu lembro" e build glass cannon contra vida adulta.',
        '**Ping operacional entregue.** Agenda logo antes que o cerebro troque boss por scroll infinito.',
        '**Waypoint fixado.** Salva o horario e evita speedrun de desculpa com replay vergonhoso.',
      ],
      en: [
        '**Announcement on screen.** Put it on the calendar before bargain-bin memory disappears on first alt-tab.',
        '**Time published.** Mark it now; "I will remember" is a glass-cannon build against adult life.',
        '**Operational ping delivered.** Schedule it before the brain swaps boss for infinite scroll.',
        '**Waypoint pinned.** Save the time and avoid an excuse speedrun with embarrassing replay.',
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
      '**Fila travada nao dropa milagre.** Cobra o print antes que o cron volte de cracha e prancheta.',
      '**Request criou raiz.** Puxa o player agora antes que a pendencia abra firma no backlog.',
      '**Feed sem novidade.** Cutuca hoje; amanha isso volta com textao e print potato edition.',
      '**Pedido parado em AFK.** Chama o player antes que a poeira pegue elo no ranking interno.',
    ], data.title, data.playerName, data.itemName, data.daysIdle, data.rankPosition)
    : pickBilingualVoice({
      'pt-BR': [
        '**Request parado nao upa.** Atualiza o print antes que teu rank tome nerf em horario nobre.',
        '**Fila sem prova nao invoca loot.** Sobe print novo antes que tua vaga vire enfeite de inventario.',
        '**Sem update recente.** Resolve ja; deixar pro fim e comprar o pacote deluxe do "vacilei".',
        '**Teu request ficou AFK.** Atualiza a prova antes que a fila te bote no banco sem respawn.',
      ],
      en: [
        '**A stalled request does not level up.** Update the screenshot before your rank gets prime-time nerfed.',
        '**A queue without proof summons no loot.** Upload fresh proof before your spot becomes inventory decor.',
        '**No recent update found.** Fix it now; leaving it late buys the deluxe "my bad" bundle.',
        '**Your request went AFK.** Update the proof before the queue benches you without respawn.',
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
        '**Interesse aberto.** Declara no site com print decente; gambiarra aqui cai no primeiro loading.',
        '**Fila do loot liberada.** Escolhe direito e prova bem antes que o Discord vire balcao de build.',
        '**Janela de interesse online.** Sem evidencia boa, a burocracia sumona boss com barra dupla.',
        '**Registro valendo.** Entra com criterio antes que o screenshot peca habeas corpus no chat.',
      ],
      en: [
        '**Interest is open.** Declare it on the site with a decent screenshot; hacks here fail on first loading.',
        '**The loot queue is unlocked.** Choose properly and prove it well before Discord becomes a build counter.',
        '**The interest window is online.** Without good evidence, bureaucracy summons a double-bar boss.',
        '**Registration is live.** Join with criteria before the screenshot begs chat for legal relief.',
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
        '**Entrega logada.** O loot saiu da fila e o "cade meu item?" perdeu buff de prioridade.',
        '**Interesse concluido.** Item entregue; teoria paralela tomou nerf e foi dormir cedo.',
        '**Distribuicao confirmada.** Tudo no historico, sem podcast de contabilidade freestyle no fundo.',
        '**Entrega fechada.** Item com destino certo e duvida vendo replay em 144p.',
      ],
      en: [
        '**Delivery logged.** The loot left the queue and "where is my item?" lost its priority buff.',
        '**Interest completed.** Item delivered; the parallel theory got nerfed and went to sleep early.',
        '**Distribution confirmed.** Everything is in history, without a freestyle-accounting podcast underneath.',
        '**Delivery closed.** Item has a proper destination and doubt is watching replay in 144p.',
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
        '**Pacote de skills no ar.** Pega upgrade que muda gameplay, nao brilho pagando de meta no espelho.',
        '**Lote liberado.** Prioriza build de verdade; purpurina sem impacto e aluguel de inventario.',
        '**Mais skills na fila.** Mira no que muda o boneco, nao no tooltip fazendo monologo de NPC.',
        '**Batch aberto.** Escolhe efeito em combate, nao item caro posando para publi no inventario.',
      ],
      en: [
        '**Skill batch is live.** Grab the upgrade that changes gameplay, not glitter posing as meta in the mirror.',
        '**Bundle unlocked.** Prioritize a real build; sparkle without impact is inventory rent.',
        '**More skills in queue.** Aim for what changes the character, not a tooltip doing NPC monologue.',
        '**Batch is open.** Choose combat effect, not expensive gear running ads in inventory.',
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
