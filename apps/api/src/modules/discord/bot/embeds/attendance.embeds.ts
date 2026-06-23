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
        '**Check-in liberado.** Quem colar leva DKP; quem sumir vira NPC da desculpa pronta.',
        '**Presenca valendo.** Marca no tempo certo; atraso aqui nao tem loot secreto.',
        '**Janela aberta.** Quem apareceu soma DKP; ghostar agora so rende lore torta.',
        '**Entrada disponivel.** Passa o check-in antes que o cron te trate como lenda urbana.',
      ],
      en: [
        '**Check-in is live.** Show up for DKP; vanish and become the excuse NPC.',
        '**Attendance is counting.** Mark it on time; delays here do not hide secret loot.',
        '**Window is open.** If you showed up, claim the DKP; ghosting now only builds crooked lore.',
        '**Entry is available.** Hit the check-in before the cron treats you like an urban legend.',
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
        '**DKP caiu.** A contagem fechou sem a planilha pedir alt+f4, milagre bem honesto.',
        '**Recompensa distribuida.** Quem colou recebeu e o Excel segue tankando mais um boss.',
        '**Evento quitado.** DKP no bolso de quem apareceu e zero espaco pra fanfic numerica.',
        '**Fechamento concluido.** A conta bateu e a planilha saiu viva de mais uma raid.',
      ],
      en: [
        '**DKP landed.** The count closed without the spreadsheet reaching for alt+f4, which is a fair miracle.',
        '**Rewards distributed.** Everyone who showed up got paid and the spreadsheet tanked one more boss.',
        '**Event settled.** DKP reached the people who showed up and the count left no room for numeric fanfic.',
        '**Wrap-up complete.** The math matched and the spreadsheet lived through one more raid.',
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
