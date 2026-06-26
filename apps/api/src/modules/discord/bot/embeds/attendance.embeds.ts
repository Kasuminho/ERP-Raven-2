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
        '**Check-in no ar.** Marca a presenca antes que o cron te classifique como lenda do "to chegando".',
        '**Presenca abriu.** Quem bater ponto leva DKP; quem enrolar vira clip do "cinco min e to ai".',
        '**Janela de check-in viva.** Faz o registro agora; depois nao adianta culpar lag espiritual.',
        '**Presenca liberada.** Entra no site antes que a raid siga e teu nome fique AFK premium.',
      ],
      en: [
        '**Check-in is live.** Mark attendance before the cron files you under "on my way".',
        '**Attendance is open.** Tap in for DKP; stall now and you become the "five minutes" clip.',
        '**The check-in window is alive.** Register now; blaming spiritual lag later will not land.',
        '**Attendance is unlocked.** Hit the site before the raid moves on and your name goes AFK premium.',
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
        '**Raid fechada e DKP pingou.** A conta saiu reta; a planilha hoje nao pediu respawn.',
        '**Distribuicao concluida.** Quem colou recebeu, quem faltou ganhou so a nostalgia do loot.',
        '**Resumo quitado.** Os numeros bateram sem combo de calculadora nervosa.',
        '**Evento encerrado.** DKP entregue e a planilha saiu menos tiltada que ontem.',
      ],
      en: [
        '**Raid closed and DKP landed.** The math stayed straight and the spreadsheet skipped the respawn screen.',
        '**Distribution complete.** Everyone who showed up got paid; everyone else got loot nostalgia.',
        '**Wrap-up settled.** The numbers matched without any panic-calculator combo.',
        '**Event locked in.** DKP is delivered and the spreadsheet is less tilted than yesterday.',
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
