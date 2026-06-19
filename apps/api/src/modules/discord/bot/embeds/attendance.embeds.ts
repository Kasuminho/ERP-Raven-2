import { EmbedBuilder } from 'discord.js';
import { DiscordLocale, localeCopy } from './discord-locale';

function discordTimestamp(date: Date, style: 'F' | 'R' = 'F'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

export function buildAttendanceStartedEmbed(eventName: string, startsAt: Date, locale: DiscordLocale = 'pt-BR'): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(localeCopy(locale, { 'pt-BR': `Presenca aberta: ${eventName}`, en: `Attendance open: ${eventName}`, es: `Asistencia abierta: ${eventName}` }))
    .setDescription(localeCopy(locale, {
      'pt-BR': '**Chamada aberta.** Quem colou ganha DKP; quem sumiu ganha desenvolvimento de personagem.',
      en: '**Attendance is open.** Show up for DKP; vanish for unexpected character development.',
      es: '**Asistencia abierta.** Quien vino gana DKP; quien desaparecio gana desarrollo de personaje.',
    }))
    .addFields({ name: localeCopy(locale, { 'pt-BR': 'Inicio', en: 'Starts', es: 'Inicio' }), value: `${discordTimestamp(startsAt, 'F')}\n${discordTimestamp(startsAt, 'R')}`, inline: false })
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
    .setTitle(localeCopy(locale, { 'pt-BR': `Evento fechado: ${data.eventName}`, en: `Event closed: ${data.eventName}`, es: `Evento cerrado: ${data.eventName}` }))
    .setDescription(localeCopy(locale, {
      'pt-BR': '**DKP pago.** A planilha sobreviveu e os presentes podem fingir que foi tudo calculado.',
      en: '**DKP paid.** The spreadsheet survived; everyone may now pretend this was effortless.',
      es: '**DKP pagado.** La hoja sobrevivio; ahora todos pueden fingir que fue facil.',
    }))
    .addFields(
      { name: localeCopy(locale, { 'pt-BR': 'DKP por pessoa', en: 'DKP per player', es: 'DKP por jugador' }), value: String(data.rewardPerPlayer), inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'DKP total', en: 'Total DKP', es: 'DKP total' }), value: String(data.totalDkp), inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Presentes', en: 'Present', es: 'Presentes' }), value: String(data.presentCount), inline: true },
      { name: localeCopy(locale, { 'pt-BR': 'Faltantes', en: 'Absent', es: 'Ausentes' }), value: String(data.absentCount), inline: true },
    )
    .setColor(0x27ae60)
    .setTimestamp(new Date());
}
