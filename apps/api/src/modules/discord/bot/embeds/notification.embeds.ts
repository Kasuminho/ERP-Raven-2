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
        '**Aviso no radar.** Marca esse horario agora; confiar na memoria aqui e loadout montado no chute.',
        '**Anuncio pingado.** Joga no calendario antes que a mente abra modo aba esquecida.',
        '**Recado entregue.** Se nao agendar agora, depois vira clipe da propria distracao.',
        '**Horario marcado no mapa.** Salva logo antes que o cerebro tente solar sem waypoint.',
      ],
      en: [
        '**Announcement is live.** Put this time on your calendar now; trusting memory here is a guessed loadout.',
        '**Notice just dropped.** Save the time before your brain enters forgotten-tab mode.',
        '**Heads-up delivered.** If you do not schedule it now, it becomes a clip of your own distraction.',
        '**Time pinned on the map.** Save it before your brain tries to solo without a waypoint.',
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
      '**Fila parada virou task da Staff.** Cobra o print antes que o ranking vire escorregador.',
      '**Request entrou em modo soneca.** Melhor cutucar agora do que receber novela em 240p depois.',
      '**Nada de update novo.** Puxa o player antes que a fila comece a juntar poeira premium.',
      '**O request travou no lobby.** Vale chamar o player antes que o rank tome dano gratuito.',
    ], data.title, data.playerName, data.itemName, data.daysIdle, data.rankPosition)
    : pickBilingualVoice({
      'pt-BR': [
        '**Request parado nao se upa sozinho.** Atualiza o print antes que o rank desca igual elevador bugado.',
        '**Fila em stand-by nao dropa milagre.** Sobe a prova nova antes do seu lugar virar lembranca.',
        '**Sem update recente.** Resolve isso agora; deixar pro ultimo minuto e tutorial do arrependimento.',
        '**Seu request entrou em AFK.** Atualiza o print antes que a fila te mande pro banco.',
      ],
      en: [
        '**A stalled request does not level itself.** Update the screenshot before your rank rides a bugged elevator down.',
        '**An idle queue does not drop miracles.** Upload fresh proof before your spot becomes a souvenir.',
        '**No recent update found.** Fix this now; leaving it for the last minute is a regret tutorial.',
        '**Your request went AFK.** Update the screenshot before the queue benches you.',
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
        '**Interesse liberado.** Declara no site e manda o print certo; chute aqui so ganha medalha de caos.',
        '**Loot elegivel abriu fila.** Escolhe com criterio e anexa a prova antes do chat abrir pericia freestyle.',
        '**Janela de interesse ativa.** Registro sem print bom vira burocracia extra, entao fecha isso direito.',
        '**Fila de interesse no ar.** Entra com a prova certa antes que o Discord vire bancada de replay.',
      ],
      en: [
        '**Interest is open.** Declare it on the site and attach the right screenshot; guessing only earns chaos medals.',
        '**Eligible loot opened the queue.** Choose with intent and attach proof before chat starts freestyle forensics.',
        '**Interest window is active.** A request without a proper screenshot becomes extra bureaucracy, so finish it properly.',
        '**Interest queue is live.** Bring the right proof before Discord turns into a replay panel.',
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
        '**Entrega registrada.** O loot saiu da fila e o comite do "sera que sumiu?" ficou sem pauta.',
        '**Interesse concluido.** Item entregue; a teoria paralela acabou de levar timeout.',
        '**Distribuicao salva.** Quem recebeu ja esta no log e o resto e eco de canal.',
        '**Entrega confirmada.** O item ja entrou no historico e a duvida perdeu o buff.',
      ],
      en: [
        '**Delivery logged.** Loot left the queue and the "did it vanish?" committee lost its agenda.',
        '**Interest completed.** Item delivered; the parallel theory just got timed out.',
        '**Distribution saved.** The recipients are in the log now and the rest is just channel echo.',
        '**Delivery confirmed.** The item is in history now and the doubt lost its buff.',
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
        '**Pacote de skills liberado.** Escolhe o que fecha build, nao o item que faz mais barulho no trailer.',
        '**Lote aberto.** Prioriza utilidade no boneco; brilho fake e season pass do arrependimento.',
        '**Mais skills na fila.** Mira no upgrade real e foge do pick por puro fogos de artificio.',
        '**Batch no ar.** Pega o que muda o jogo de verdade, nao o que so vende highlight vazio.',
      ],
      en: [
        '**Skill batch unlocked.** Pick what completes the build, not the item with the loudest trailer.',
        '**Bundle is open.** Prioritize what helps your character; fake sparkle is a paid regret season pass.',
        '**More skills in queue.** Aim for the real upgrade and dodge picks made for pure fireworks.',
        '**Batch is live.** Grab what changes the game for real, not what only sells empty highlights.',
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
