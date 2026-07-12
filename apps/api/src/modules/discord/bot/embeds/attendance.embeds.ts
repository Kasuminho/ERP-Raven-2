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
        '**Check-in abriu.** Marca no site antes que o "ja ja entro" vire patrimonio imaterial da call.',
        '**Presenca valendo.** DKP nao le aura; clique feito pesa mais que audio com drama de fundo.',
        '**Janela de presenca no ar.** Registra logo; lag de conveniencia nao passa no detector de migue.',
        '**Ponto liberado.** Entra antes da raid andar e teu nome virar NPC decorativo no rodape.',
      ],
      en: [
        '**Check-in opened.** Mark it on the site before "joining soon" becomes call heritage.',
        '**Attendance counts now.** DKP does not read auras; one click beats dramatic excuse audio.',
        '**The attendance window is live.** Register early; convenient lag fails the excuse detector.',
        '**Clock-in is unlocked.** Hit the site before the raid moves and your name becomes footer NPC decor.',
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
        '**Raid fechada e DKP pago.** A conta bateu; ate a calculadora fingiu maturidade por 3 segundos.',
        '**Distribuicao concluida.** Quem colou recebeu, quem faltou farmou "na proxima eu vou" em 4K.',
        '**Resumo liquidado.** Numero alinhado sem ritual de planilha nem oferenda ao Ctrl+Z.',
        '**Evento encerrado.** DKP entregue e a planilha saiu do ranked sem pedir remake.',
      ],
      en: [
        '**Raid closed and DKP paid.** The math matched; even the calculator pretended maturity for 3 seconds.',
        '**Distribution complete.** Whoever showed got paid; whoever missed farmed "next time I will" in 4K.',
        '**Wrap-up settled.** Numbers aligned without spreadsheet rituals or Ctrl+Z offerings.',
        '**Event closed.** DKP delivered and the spreadsheet left ranked without requesting a remake.',
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
