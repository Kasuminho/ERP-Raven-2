import { EmbedBuilder } from 'discord.js';
import { blocks } from './discord-formatting';

function discordTimestamp(date: Date, style: 'F' | 'R' = 'F'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

export function buildAttendanceStartedEmbed(eventName: string, startsAt: Date): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`Presenca aberta / Attendance Open: ${eventName}`)
    .setDescription(blocks(
      'Presenca aberta no dashboard.',
      'Attendance registration is now open on the dashboard.',
    ))
    .addFields({ name: 'Inicio / Starts', value: `${discordTimestamp(startsAt, 'F')}\n${discordTimestamp(startsAt, 'R')}`, inline: false })
    .setColor(0xf2c94c)
    .setTimestamp(new Date());
}

export function buildEventFinalizedEmbed(data: {
  eventName: string;
  rewardPerPlayer: number;
  totalDkp: number;
  presentCount: number;
  absentCount: number;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`Evento finalizado / Event Finalized: ${data.eventName}`)
    .setDescription(blocks(
      'DKP distribuido com base na presenca registrada pela Staff.',
      'DKP distributed based on the attendance confirmed by Staff.',
    ))
    .addFields(
      { name: 'DKP por pessoa / DKP per person', value: String(data.rewardPerPlayer), inline: true },
      { name: 'DKP total / Total DKP', value: String(data.totalDkp), inline: true },
      { name: 'Presentes / Present', value: String(data.presentCount), inline: true },
      { name: 'Faltantes / Absent', value: String(data.absentCount), inline: true },
    )
    .setColor(0x27ae60)
    .setTimestamp(new Date());
}
