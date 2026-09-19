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
    'Resolve hoje; deixar pendencia acumulando e pedir pra ser cobrado em plena call de raid.',
    'Da baixa nisso logo; checklist no vacuo da mais vergonha que morrer pro mob inicial.',
    'Arruma antes da guerra; boneco sem perfil atualizado e peso morto no matchmaking.',
    'Limpa essa fila; preguica de preencher formulario nao combina com guilda no Server Zero.',
    'Mata essa pendencia hoje; o Aristolfo ta com o martelo engatilhado pra cobrar.',
  ], data.playerName, data.reasonsPt.join('|'), data.hasCodex ? 'codex' : false, data.profileUrl);
  const tailEn = pickVoiceLine([
    'Handle it today; letting tasks pile up invites a public callout during raid.',
    'Clear this now; ghosting the checklist brings more shame than wiping to a level 1 boar.',
    'Fix it before war; an outdated character profile is dead weight in guild matchmaking.',
    'Clear your queue; dodging simple forms does not fit a Server Zero guild.',
    'Finish this pending task; Aristolfo has the ban hammer polished and ready.',
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
    'O boss nao vai esperar voce achar a pocao; confirma o horario e loga antes do pull.',
    'Revisa a agenda agora; dar alt-tab na hora do spawn e pedir pra perder vaga e DKP.',
    'Confere o horario no ERP; quem chega 10 minutos atrasado vira plateia de streaming.',
    'Alinha o alarme; "esqueci de logar" da debuff de -100 de respeito com a guilda.',
    'Da uma olhada no relogio; raid em cima da hora com headset quebrado e pesadelo da Staff.',
  ], data.playerName, data.eventName, data.startsAt, data.requiresRsvp ? 'rsvp' : 'confirmed');
  const tailEn = pickVoiceLine([
    'The boss will not wait for you to find potions; check the time and log in before pull.',
    'Review the schedule now; alt-tabbing during spawn is a speedrun to lose your spot and DKP.',
    'Check the schedule on ERP; arriving 10 minutes late makes you a twitch spectator.',
    'Set your alarm; "forgot to log in" applies a -100 guild respect debuff.',
    'Look at the clock; last-minute raids with broken headsets are Staff nightmares.',
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
        '**Comunicado no ar.** Le antes que sua desculpa vire piada no canal de memes da guilda.',
        '**Recado da Lideranca.** Da uma lida com atencao; ignorar aviso oficial da azar no drop.',
        '**Ordem do dia.** Presta atencao na call; quem joga no escuro toma backstab de graca.',
        '**Aviso oficial.** Ta postado; dizer que "nao sabia" agora da direito a farmar gold pro cofre.',
        '**Ping de lideranca.** Le com carinho antes de cometer atrocidade tatica no proximo evento.',
      ],
      en: [
        '**Announcement live.** Read it before your excuse becomes the guild meme of the week.',
        '**Leadership memo.** Read carefully; ignoring official notices ruins drop karma.',
        '**Order of the day.** Pay attention to the call; playing blind invites free backstabs.',
        '**Official notice.** It is posted; claiming "I did not know" now assigns you to gold farming duty.',
        '**Leadership ping.** Read with care before committing a tactical atrocity next raid.',
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
      '**Fila com teia de aranha.** Da uma cutucada no player antes que o pedido vire fossil arqueologico.',
      '**Request mofando.** Cobra a print do camarada antes que ele reclame que a Staff sumiu.',
      '**Fila de craft parada.** Chama o dono do pedido pra atualizar o status ou limpa da lista.',
      '**Pedido em banho-maria.** Resolve logo antes que o cara troque de classe e peca tudo de novo.',
      '**Backlog pedindo socorro.** Despacha o pedido ou recusa com elegancia; enrolar e feio.',
    ], data.title, data.playerName, data.itemName, data.daysIdle, data.rankPosition)
    : pickBilingualVoice({
      'pt-BR': [
        '**Teu pedido ta mofando.** Atualiza a print no site antes que o item va pro inventario de outro.',
        '**Fila parada.** Sobe a comprovacao no ERP ou a Staff vai achar que voce desistiu do boneco.',
        '**Atualizacao necessaria.** Mostra que ainda precisa do item antes que a fila passe por cima.',
        '**Item na espera.** Manda a print decente; pedir item sem provar necessidade e pedir esmola.',
        '**Da sinal de vida.** Atualiza o request no site antes que o Aristolfo cancele por inercia.',
      ],
      en: [
        '**Your request is rotting.** Update your screenshot before the gear goes to someone else.',
        '**Queue stalled.** Upload proof on the ERP or Staff will assume you quit your character.',
        '**Update needed.** Prove you still need the piece before the queue bypasses you.',
        '**Item on hold.** Send a clear screenshot; requesting loot without proof is just panhandling.',
        '**Show signs of life.** Update the request on site before Aristolfo purges it for inertia.',
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
        '**Interesse aberto no cofre.** Clica no site com print legivel; print torta de celular e ban imediato da retina.',
        '**Drop disponivel.** Marca interesse no ERP; negociar no privado com oficial nao cola aqui.',
        '**Item na vitrine.** Declara interesse dentro das regras; quem inventa moda vai pro fim da fila.',
        '**Janela de interesses.** Registra seu nome; na hora do sorteio, quem nao marcou so chora.',
        '**Loot na mesa.** Marca se realmente for usar; pegar pra deixar mofando na bag da carma ruim.',
      ],
      en: [
        '**Vault interest open.** Click on the site with a readable shot; phone camera photos hurt our retinas.',
        '**Drop available.** Mark interest on the ERP; private DM bartering with officers does not fly here.',
        '**Gear on display.** Declare interest by the book; improvisers get sent to the back of the line.',
        '**Interest window live.** Put your name in; when raffle rolls, unlisted players only get tears.',
        '**Loot on the table.** Claim only what you will actually equip; vault hoarding breeds bad karma.',
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
        '**Entrega realizada com sucesso.** O item ta no inventario e a fofoca morreu sem audiencia.',
        '**Drop entregue e printado.** Tudo transparente no log; o cofre da guilda ta nos conformes.',
        '**Recibo de entrega gravado.** Sem drama de "cade meu item"; o comprovante ta ai pra quem quiser ver.',
        '**Item no bolso do jogador.** Agora bota essa arma pra bater direito no proximo boss.',
        '**Fechamento registrado.** O loot achou seu dono legitimo e a auditoria carimbou com louvor.',
      ],
      en: [
        '**Delivery successful.** Item is in the bag and guild gossip died without an audience.',
        '**Drop handed over with proof.** Pure transparency in the log; the vault remains clean.',
        '**Delivery receipt recorded.** Zero "where is my loot" drama; proof is public for anyone to see.',
        '**Gear equipped.** Now put that weapon to work and actually hit the boss next spawn.',
        '**Delivery sealed.** The loot found its rightful home and audit stamped it with honors.',
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
        '**Lote de livros e skills aberto.** Pega habilidade que comba com o time, nao skill que gasta mana a toa.',
        '**Pacotao de livros na mesa.** Melhora a rotacao do boneco antes de querer peitar boss solo.',
        '**Skills disponiveis no cofre.** Escolhe com a cabeca; livro heroico parado na bag e crime inafiancavel.',
        '**Vitrine de habilidades aberta.** Prioriza a build do clan; o Server Zero exige dano sincronizado.',
        '**Lote liberado.** Escolhe utilidade e dano real; skill bonita com DPS podre nao ganha guerra.',
      ],
      en: [
        '**Skill book bundle is open.** Grab abilities that combo with your team, not mana-wasters.',
        '**Skill batch on the table.** Fix your rotation before trying to solo field bosses.',
        '**Skills available in vault.** Choose wisely; hoarding heroic books in inventory is an unbailable crime.',
        '**Skill showcase unlocked.** Prioritize guild synergy; Server Zero demands synchronized burst.',
        '**Batch released.** Pick real utility and DPS; flashy animations with garbage damage win zero wars.',
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
