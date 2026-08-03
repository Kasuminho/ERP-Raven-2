import { EmbedBuilder } from 'discord.js';
import { DiscordLocale, localeCopy } from './discord-locale';
import { pickBilingualVoice } from './webhook-voice';

function discordTimestamp(date: Date, style: 'F' | 'R' = 'F'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

export function buildAttendanceStartedEmbed(eventName: string, startsAt: Date, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Presenca aberta: ${eventName}`, en: `Attendance open: ${eventName}` }))
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        '**Check-in abriu.** Marca no site antes que o "ja entro" vire patrimonio tombado da enrolacao.',
        '**Presenca valendo.** DKP nao le pensamento; clique feito ganha de desculpa em headset RGB.',
        '**Janela de presenca no ar.** Registra logo; lag seletivo aqui nao ganha legenda nem advogado.',
        '**Ponto liberado.** Entra antes do pull e evita virar figurante premium no rodape da raid.',
        '**Presenca online.** O bot aceita clique; nao aceita telepatia com Wi-Fi de padaria.',
      ],
      en: [
        '**Check-in opened.** Mark it on the site before "joining now" becomes protected heritage of stalling.',
        '**Attendance counts now.** DKP does not read minds; one click beats an excuse in an RGB headset.',
        '**The attendance window is live.** Register early; selective lag gets no subtitles and no lawyer here.',
        '**Clock-in is unlocked.** Hit the site before pull and avoid becoming premium footer cast in raid.',
        '**Attendance is online.** The bot accepts clicks; it does not accept bakery-Wi-Fi telepathy.',
      ],
    }, eventName, startsAt))
    .addFields({ name: localeCopy(locale, { 'pt-BR': 'Inicio', en: 'Starts' }), value: `${discordTimestamp(startsAt, 'F')}\n${discordTimestamp(startsAt, 'R')}`, inline: false })
    .setColor(0xf2c94c)
    .setTimestamp(new Date());
}

export function buildEventFinalizedEmbed(data: {
  eventName: string;
  rewardPerPlayer: number;
  totalDkp: number;
  presentCount: number;
  absentCount: number;
}, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Evento fechado: ${data.eventName}`, en: `Event closed: ${data.eventName}` }))
    .setDescription(pickBilingualVoice({
      'pt-BR': [
        '**Raid fechada e DKP pago.** A conta bateu; ate a planilha ficou sem pauta para reclamar.',
        '**Distribuicao concluida.** Quem colou recebeu; quem faltou desbloqueou o trofeu "farm zero, opiniao cem".',
        '**Resumo liquidado.** Numeros alinhados sem celula sambando nem culto clandestino ao Ctrl+Z.',
        '**Evento encerrado.** DKP entregue; a aba saiu andando sem pedir remake no all chat.',
        '**Fechamento salvo.** Presenca virou DKP e a matematica nao precisou chamar VAR.',
      ],
      en: [
        '**Raid closed and DKP paid.** The math matched; even the spreadsheet ran out of complaints.',
        '**Distribution complete.** Whoever showed got paid; whoever missed unlocked the "zero farm, full opinion" trophy.',
        '**Wrap-up settled.** Numbers aligned without cells dancing or a secret Ctrl+Z cult.',
        '**Event closed.** DKP delivered; the tab walked away without asking all chat for a remake.',
        '**Closure saved.** Attendance became DKP and the math did not need replay review.',
      ],
    }, data.eventName, data.rewardPerPlayer, data.totalDkp, data.presentCount, data.absentCount))
    .addFields(
      { name: localeCopy(locale, { 'pt-BR': 'DKP por pessoa', en: 'DKP per player' }), value: String(data.rewardPerPlayer), inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'DKP total', en: 'Total DKP' }), value: String(data.totalDkp), inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Presentes', en: 'Present' }), value: String(data.presentCount), inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Faltantes', en: 'Absent' }), value: String(data.absentCount), inline: true },
    )
    .setColor(0x27ae60)
    .setTimestamp(new Date());
}
