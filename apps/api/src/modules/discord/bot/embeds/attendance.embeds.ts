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
        '**Check-in aberto.** Marca agora antes que o "ja entro" vire NPC de mentira.',
        '**Presenca valendo.** DKP nao le pensamento; clica no site e poupa a ata do drama.',
        '**Janela de presenca no ar.** Registra logo; lag espiritual nao ganha recurso.',
        '**Ponto liberado.** Entra no site antes que a raid ande e teu nome vire easter egg AFK.',
      ],
      en: [
        '**Check-in is open.** Mark it now before "joining soon" becomes fake NPC dialogue.',
        '**Attendance counts now.** DKP cannot read minds; click the site and spare the minutes.',
        '**The attendance window is live.** Register early; spiritual lag does not win appeals.',
        '**Clock-in is unlocked.** Hit the site before the raid moves and your name becomes an AFK easter egg.',
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
        '**Raid fechada e DKP pago.** A conta bateu; printem esse boss raro da matematica.',
        '**Distribuicao concluida.** Quem veio recebeu, quem faltou farmou nostalgia premium.',
        '**Resumo liquidado.** Numero alinhado sem pedir auxilio ao oraculo da calculadora.',
        '**Evento encerrado.** DKP entregue e a planilha saiu ilesa do modo ranked.',
      ],
      en: [
        '**Raid closed and DKP paid.** The math matched; screenshot this rare boss.',
        '**Distribution complete.** Whoever showed got paid; whoever missed farmed premium nostalgia.',
        '**Wrap-up settled.** Numbers aligned without asking the calculator oracle for help.',
        '**Event closed.** DKP delivered and the spreadsheet survived ranked mode.',
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
