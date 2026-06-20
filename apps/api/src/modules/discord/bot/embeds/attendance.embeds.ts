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
        '**Check-in liberado.** Quem encostar leva DKP; quem evaporar vai de NPC da desculpa.',
        '**Presenca valendo.** Marca no tempo certo; atraso aqui nao dropa milagre.',
        '**Janela aberta.** Quem apareceu soma DKP; ghostar agora so rende lore ruim.',
      ],
      en: [
        '**Check-in is live.** Show up for DKP; evaporate and become the excuse NPC.',
        '**Attendance is counting.** Mark it on time; delays here do not drop miracles.',
        '**Window is open.** If you showed up, claim the DKP; ghosting now only builds bad lore.',
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
        '**DKP caiu.** A contagem fechou sem rage quit da planilha, milagre moderado.',
        '**Recompensa distribuida.** Os presentes receberam e o Excel segue tankando mais um boss.',
        '**Evento quitado.** DKP no bolso de quem colou e zero espaco para fanfic de contagem.',
      ],
      en: [
        '**DKP landed.** The count closed without the spreadsheet rage quitting, which is a moderate miracle.',
        '**Rewards distributed.** Present players got paid and the spreadsheet tanked one more boss.',
        '**Event settled.** DKP reached everyone who showed up and the count left no room for fanfic.',
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
