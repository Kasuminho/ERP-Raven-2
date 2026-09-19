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
        '**Check-in na mesa.** Clica logo no site antes do boss puxar e voce virar poca de dano em area.',
        '**Presenca liberada.** DKP nao aceita "tava no loading screen"; confirma no ERP e bota o boneco na arena.',
        '**Janela aberta.** Bate o ponto no site; telepatia com Discord mutado nao pontua no extrato.',
        '**Hora do boss.** Confirma antes do pull; quem chega depois do 1% vira espectador de luxo.',
        '**Check-in valendo.** Marca presenca no site. Ficar AFK batendo em parede nao da DKP.',
      ],
      en: [
        '**Check-in is live.** Click on the site before boss pull turns you into an AoE puddle.',
        '**Attendance open.** DKP does not accept "I was loading"; confirm on the ERP and bring your character to the arena.',
        '**Window unlocked.** Clock in on the site; telepathy on a muted Discord earns zero points.',
        '**Boss time.** Confirm before the pull; showing up at 1% HP makes you a luxury spectator.',
        '**Check-in running.** Mark attendance on the site. AFK hitting a rock yields zero DKP.',
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
        '**Boss deitado e DKP pago.** Conta fechada no centavo; ate o tesoureiro sorriu sem tremer o olho.',
        '**Presenca processada.** Quem colou ta com DKP no bolso; quem faltou pode ir chorar no chat global.',
        '**Lote finalizado.** Os pontos cairam na conta. Menos drama de partilha, mais machado afiado pro proximo.',
        '**Evento encerrado.** Presenca auditada e salva. O extrato ta limpo igual inventario depois de falhar craft.',
        '**Fechamento concluido.** DKP entregue com recibo. Reclamar de saldo agora so com print e testemunha.',
      ],
      en: [
        '**Boss down and DKP paid.** Math closed to the penny; even the treasurer smiled without twitching.',
        '**Attendance processed.** Whoever showed up has DKP in pocket; whoever skipped can go vent in world chat.',
        '**Batch finalized.** Points hit your account. Less loot drama, sharper axes for the next spawn.',
        '**Event concluded.** Attendance audited and saved. The ledger is cleaner than inventory after failed craft.',
        '**Wrap-up done.** DKP delivered with receipts. Complaining about balance now requires screenshots and witnesses.',
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
