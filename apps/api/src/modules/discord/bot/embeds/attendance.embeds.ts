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
        '**Check-in abriu.** Marca no site antes que o "to chegando" vire lenda urbana da call.',
        '**Presenca valendo.** DKP nao aceita telepatia; clique feito vale mais que audio de desculpa.',
        '**Janela de presenca no ar.** Registra logo; lag imaginario nao passa na auditoria.',
        '**Ponto liberado.** Entra antes da raid andar e teu nome virar figurante AFK.',
      ],
      en: [
        '**Check-in opened.** Mark it on the site before "almost there" becomes call folklore.',
        '**Attendance counts now.** DKP does not accept telepathy; one click beats excuse audio.',
        '**The attendance window is live.** Register early; imaginary lag fails the audit.',
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
        '**Raid fechada e DKP pago.** A conta fechou; milagre moderno sem DLC de calculadora.',
        '**Distribuicao concluida.** Quem colou recebeu, quem faltou farmou saudade em 4K.',
        '**Resumo liquidado.** Numero alinhado sem invocar santo de planilha quebrada.',
        '**Evento encerrado.** DKP entregue e a planilha saiu do ranked com elo intacto.',
      ],
      en: [
        '**Raid closed and DKP paid.** The math closed; modern miracle with no calculator DLC.',
        '**Distribution complete.** Whoever showed got paid; whoever missed farmed nostalgia in 4K.',
        '**Wrap-up settled.** Numbers aligned without summoning spreadsheet saints.',
        '**Event closed.** DKP delivered and the spreadsheet left ranked with its elo intact.',
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
