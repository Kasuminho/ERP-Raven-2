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
        '**Check-in abriu.** Marca no site antes que o "to chegando" vire NFT de desculpa repetida.',
        '**Presenca valendo.** DKP nao interpreta sentimento; clique registrado humilha audio dramatico.',
        '**Janela de presenca no ar.** Registra logo; lag seletivo aqui toma report sem replay.',
        '**Ponto liberado.** Entra antes da raid puxar e teu nome virar decoracao triste do rodape.',
      ],
      en: [
        '**Check-in opened.** Mark it on the site before "almost there" becomes a repeated-excuse NFT.',
        '**Attendance counts now.** DKP does not parse feelings; one registered click humiliates dramatic audio.',
        '**The attendance window is live.** Register early; selective lag gets reported without replay.',
        '**Clock-in is unlocked.** Hit the site before the raid pulls and your name becomes sad footer decor.',
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
        '**Raid fechada e DKP pago.** A conta bateu; a calculadora quase abriu live de superacao.',
        '**Distribuicao concluida.** Quem apareceu recebeu, quem faltou desbloqueou o passe "sem farm hoje".',
        '**Resumo liquidado.** Numero alinhado sem danca da planilha nem culto ao Ctrl+Z.',
        '**Evento encerrado.** DKP entregue e a aba saiu do ranked sem pedir remake no all chat.',
      ],
      en: [
        '**Raid closed and DKP paid.** The math matched; the calculator almost started a comeback stream.',
        '**Distribution complete.** Whoever showed got paid; whoever missed unlocked the "no farm today" pass.',
        '**Wrap-up settled.** Numbers aligned without spreadsheet dancing or a Ctrl+Z cult.',
        '**Event closed.** DKP delivered and the tab left ranked without asking all chat for a remake.',
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
