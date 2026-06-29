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
        '**Check-in aberto.** Marca agora antes que o cron te coloque no hall do "ja ja eu entro".',
        '**Presenca valendo.** DKP nao fareja intencao; clica no site e evita novela no final.',
        '**Janela de presenca no ar.** Registra logo; lag metafisico nao passa na auditoria.',
        '**Ponto liberado.** Entra no site antes que a raid avance e teu nome vire figurante AFK.',
      ],
      en: [
        '**Check-in is open.** Mark it now before the cron puts you in the "joining soon" hall.',
        '**Attendance counts now.** DKP cannot smell intent; click the site and avoid endgame drama.',
        '**The attendance window is live.** Register early; metaphysical lag fails the audit.',
        '**Clock-in is unlocked.** Hit the site before the raid moves and your name becomes AFK background.',
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
        '**Raid fechada e DKP pago.** A conta bateu; milagre raro, mas dessa vez com recibo.',
        '**Distribuicao concluida.** Quem veio recebeu, quem faltou farmou so saudade do loot.',
        '**Resumo liquidado.** Numero alinhado sem invocar calculadora em modo desespero.',
        '**Evento encerrado.** DKP entregue e a planilha saiu andando sem pedir atendimento.',
      ],
      en: [
        '**Raid closed and DKP paid.** The math matched; rare miracle, this time with a receipt.',
        '**Distribution complete.** Whoever showed got paid; whoever missed farmed loot nostalgia.',
        '**Wrap-up settled.** Numbers aligned without summoning panic-calculator mode.',
        '**Event closed.** DKP delivered and the spreadsheet walked out without asking for support.',
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
