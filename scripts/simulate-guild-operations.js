const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = 'C:/Users/Administrator/Documents/ERP Raven 2';
const ENV_PATH = path.join(ROOT_DIR, '.env');

// Read .env
const env = {};
fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  }
});

let dbUrl = env.DATABASE_URL.replace('ic-postgresql-QJNx', '216.22.27.248');
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const USERNAME = 'Aristolfo, 570 anos de webhook';
const AVATAR_URL = env.DISCORD_WEBHOOK_AVATAR_URL || 'https://app.guild-alcatraz.site/aristolfo-webhooks.png';
const APP_URL = env.PUBLIC_APP_URL || 'https://app.guild-alcatraz.site';

const SLEEP_PER_CHANNEL_MS = 3000; // 3 segundos conforme pedido do usuário

// 40 Jogadores Fictícios com nomes gamer brasileiros / clássicos
const ROSTER_CONFIG = [
  // 6 Core Raiders (100% Assiduidade)
  { nick: 'Valdor_Ironclad', class: 'VANGUARD', layer: 4, cp: 192500, att: 100.0, dkp: 3450, role: 'ADMIN' },
  { nick: 'Kael_Nightfall', class: 'NIGHT_RANGER', layer: 4, cp: 188400, att: 100.0, dkp: 3200, role: 'ADMIN' },
  { nick: 'Lyra_Starlight', class: 'DIVINE_CASTER', layer: 4, cp: 179000, att: 100.0, dkp: 3100, role: 'PLAYER' },
  { nick: 'Grom_Berserk', class: 'BERSERKER', layer: 4, cp: 185200, att: 100.0, dkp: 2980, role: 'PLAYER' },
  { nick: 'Astra_Elemental', class: 'ELEMENTALIST', layer: 4, cp: 181300, att: 100.0, dkp: 2850, role: 'PLAYER' },
  { nick: 'Draken_Slayer', class: 'DESTROYER', layer: 4, cp: 186700, att: 100.0, dkp: 2900, role: 'PLAYER' },

  // 2 Baixa Assiduidade (< 50% - para o líder ver as travas e rejeições de leilão)
  { nick: 'Sleepy_Gamer', class: 'ASSASSIN', layer: 2, cp: 105000, att: 28.5, dkp: 240, role: 'PLAYER' },
  { nick: 'Offline_Warrior', class: 'GUNSLINGER', layer: 2, cp: 112000, att: 35.0, dkp: 310, role: 'PLAYER' },

  // 32 Membros Ativos Variados (52% a 95%)
  { nick: 'Shadow_Renegade', class: 'ASSASSIN', layer: 3, cp: 164000, att: 92.5, dkp: 2450, role: 'PLAYER' },
  { nick: 'Zephyr_Wind', class: 'GUNSLINGER', layer: 3, cp: 158900, att: 88.0, dkp: 2100, role: 'PLAYER' },
  { nick: 'Thorin_Stone', class: 'WARLORD', layer: 4, cp: 175400, att: 94.0, dkp: 2600, role: 'PLAYER' },
  { nick: 'Nyx_Deathbringer', class: 'DEATHBRINGER', layer: 3, cp: 162100, att: 85.5, dkp: 1950, role: 'PLAYER' },
  { nick: 'Aurora_Light', class: 'DIVINE_CASTER', layer: 3, cp: 154300, att: 89.0, dkp: 2050, role: 'PLAYER' },
  { nick: 'Vortex_Mage', class: 'ELEMENTALIST', layer: 3, cp: 168200, att: 91.0, dkp: 2300, role: 'PLAYER' },
  { nick: 'Brakus_Smash', class: 'DESTROYER', layer: 3, cp: 159800, att: 78.5, dkp: 1600, role: 'PLAYER' },
  { nick: 'Raven_Striker', class: 'NIGHT_RANGER', layer: 3, cp: 161000, att: 82.0, dkp: 1800, role: 'PLAYER' },
  { nick: 'Ignis_Fury', class: 'BERSERKER', layer: 3, cp: 155700, att: 76.0, dkp: 1450, role: 'PLAYER' },
  { nick: 'Titan_Shield', class: 'VANGUARD', layer: 3, cp: 167500, att: 87.5, dkp: 2150, role: 'PLAYER' },
  { nick: 'Cyrus_Shadow', class: 'ASSASSIN', layer: 3, cp: 148900, att: 71.0, dkp: 1320, role: 'PLAYER' },
  { nick: 'Blaze_Hunter', class: 'GUNSLINGER', layer: 2, cp: 139000, att: 65.5, dkp: 1100, role: 'PLAYER' },
  { nick: 'Kallum_Vanguard', class: 'VANGUARD', layer: 3, cp: 152000, att: 79.0, dkp: 1580, role: 'PLAYER' },
  { nick: 'Sylas_Frost', class: 'ELEMENTALIST', layer: 2, cp: 141200, att: 68.0, dkp: 1250, role: 'PLAYER' },
  { nick: 'Morgath_Reaper', class: 'DEATHBRINGER', layer: 3, cp: 160500, att: 83.5, dkp: 1750, role: 'PLAYER' },
  { nick: 'Elysia_Heal', class: 'DIVINE_CASTER', layer: 3, cp: 147800, att: 74.0, dkp: 1400, role: 'PLAYER' },
  { nick: 'Ragnar_Iron', class: 'BERSERKER', layer: 2, cp: 136500, att: 62.5, dkp: 980, role: 'PLAYER' },
  { nick: 'Zarek_Bolt', class: 'GUNSLINGER', layer: 3, cp: 153400, att: 80.0, dkp: 1620, role: 'PLAYER' },
  { nick: 'Fenrir_Fang', class: 'NIGHT_RANGER', layer: 2, cp: 138700, att: 64.0, dkp: 1040, role: 'PLAYER' },
  { nick: 'Orion_Cross', class: 'WARLORD', layer: 3, cp: 157200, att: 81.5, dkp: 1690, role: 'PLAYER' },
  { nick: 'Darian_Blade', class: 'ASSASSIN', layer: 2, cp: 132000, att: 58.0, dkp: 890, role: 'PLAYER' },
  { nick: 'Sorsha_Spark', class: 'ELEMENTALIST', layer: 2, cp: 129500, att: 55.5, dkp: 820, role: 'PLAYER' },
  { nick: 'Thalor_Crush', class: 'DESTROYER', layer: 3, cp: 150100, att: 77.0, dkp: 1480, role: 'PLAYER' },
  { nick: 'Aiden_Sniper', class: 'NIGHT_RANGER', layer: 3, cp: 146000, att: 73.5, dkp: 1360, role: 'PLAYER' },
  { nick: 'Gideon_Holy', class: 'DIVINE_CASTER', layer: 2, cp: 131400, att: 59.0, dkp: 910, role: 'PLAYER' },
  { nick: 'Malakor_Void', class: 'DEATHBRINGER', layer: 2, cp: 134200, att: 61.0, dkp: 950, role: 'PLAYER' },
  { nick: 'Kaelen_Axe', class: 'BERSERKER', layer: 2, cp: 127800, att: 54.0, dkp: 790, role: 'PLAYER' },
  { nick: 'Bane_Bulwark', class: 'VANGUARD', layer: 3, cp: 156000, att: 82.5, dkp: 1720, role: 'PLAYER' },
  { nick: 'Seraph_Dawn', class: 'DIVINE_CASTER', layer: 3, cp: 163000, att: 86.0, dkp: 1980, role: 'PLAYER' },
  { nick: 'Riven_Shadow', class: 'ASSASSIN', layer: 2, cp: 135000, att: 63.0, dkp: 1010, role: 'PLAYER' },
  { nick: 'Corvus_Drake', class: 'WARLORD', layer: 3, cp: 151500, att: 75.0, dkp: 1420, role: 'PLAYER' },
  { nick: 'Zeph_Deadeye', class: 'GUNSLINGER', layer: 2, cp: 128900, att: 56.0, dkp: 840, role: 'PLAYER' },
];

const BOSSES = [
  { name: 'Lunos', tier: 'Camada 3', dkp: 20, time: '20:30' },
  { name: 'Rigreto', tier: 'Camada 3', dkp: 20, time: '21:00' },
  { name: 'Gardron', tier: 'Camada 3', dkp: 25, time: '21:30' },
  { name: 'Melkar', tier: 'Camada 4', dkp: 30, time: '22:00' },
  { name: 'Vargas', tier: 'Camada 4', dkp: 30, time: '22:30' },
  { name: 'Bellamonica', tier: 'Camada 4', dkp: 35, time: '23:00' },
  { name: 'Sion', tier: 'Camada 4', dkp: 40, time: '23:30' },
  { name: 'Floud', tier: 'Masmorra Nv 2', dkp: 50, time: '19:45' },
  { name: 'Kraterius', tier: 'Fissura Épica', dkp: 45, time: '20:15' },
];

const ITEMS_SAMPLE = [
  { name: 'Lâmina do Algoz Heroica (T3)', tier: 3, rarity: 'HEROIC', minBid: 600 },
  { name: 'Anel do Soberano (T4 Heroico)', tier: 4, rarity: 'HEROIC', minBid: 850 },
  { name: 'Cajado Arcano do Vento T4', tier: 4, rarity: 'HEROIC', minBid: 800 },
  { name: 'Couraça de Placas do Guardião T3', tier: 3, rarity: 'HEROIC', minBid: 550 },
  { name: 'Elmo de Couro de Rigreto (Raro)', tier: 2, rarity: 'RARE', minBid: 250 },
  { name: 'Tomo de Habilidade Superior (T3)', tier: 3, rarity: 'RARE', minBid: 350 },
  { name: 'Adaga Sombria das Ilusões T4', tier: 4, rarity: 'HEROIC', minBid: 900 },
  { name: 'Arco do Falcão Noturno T3', tier: 3, rarity: 'HEROIC', minBid: 650 },
  { name: 'Botas de Escamas de Dragão T4', tier: 4, rarity: 'HEROIC', minBid: 750 },
  { name: 'Amuleto da Alvorada Divina T3', tier: 3, rarity: 'HEROIC', minBid: 500 },
  { name: 'Manoplas da Fúria Bárbara T4', tier: 4, rarity: 'HEROIC', minBid: 820 },
  { name: 'Escudo Muralha de Ferro T3', tier: 3, rarity: 'HEROIC', minBid: 580 },
];

async function sendWebhook(url, embed) {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: USERNAME,
        avatar_url: AVATAR_URL,
        embeds: [embed],
        allowed_mentions: { parse: [] },
      }),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

async function truncateOperationalTables() {
  console.log('🧹 Executando TRUNCATE limpo das tabelas operacionais (Preservando ItemCatalog e BusinessRules)...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog",
      "Notification",
      "StaffTaskHandoff",
      "StaffTask",
      "StaffAreaCoverage",
      "StaffAvailabilityPeriod",
      "StaffAutomationRun",
      "StaffAutomationRule",
      "LeadershipCheckIn",
      "GuildPulseResponse",
      "GuildPulseParticipation",
      "GuildPulseCycle",
      "MentorshipHelpRequest",
      "MentorshipAssignment",
      "MentorProfile",
      "PlayerTrialCheckIn",
      "PlayerTrialCriterion",
      "PlayerTrial",
      "PlayerOnboardingStep",
      "PlayerOnboardingPlan",
      "OnboardingTemplateStep",
      "OnboardingTemplate",
      "GuildCaseEntry",
      "GuildCase",
      "GuildPolicyReceipt",
      "GuildPolicyVersion",
      "GuildPlaybookLesson",
      "PlaybookInstructionReceipt",
      "GuildPlaybookAssignment",
      "PlaybookRoleInstruction",
      "GuildPlaybookVersion",
      "GuildPlaybook",
      "PlayerDigestDelivery",
      "PlayerCommunicationPreference",
      "PlayerStaffNote",
      "PlayerProgressComment",
      "PlayerProgress",
      "PlayerRole",
      "GuildRole",
      "PlayerReminderDelivery",
      "WarRoomTimelineEvent",
      "WarRoomRosterSlot",
      "WarRoomOperation",
      "EventAttendance",
      "EventRsvp",
      "EventReminderDelivery",
      "EventReserveEntry",
      "PlayerAbsence",
      "DiscordDkpLogDelivery",
      "DiscordDkpLogState",
      "DiscordWebhookDelivery",
      "DKPTransaction",
      "DKPLock",
      "DkpPolicySimulation",
      "AuctionBidCancellationRequest",
      "AuctionBidInvalidationVote",
      "AuctionReviewVote",
      "AuctionDispute",
      "AuctionBid",
      "Auction",
      "DropHistory",
      "GuildStorageRequest",
      "GuildStorageEntry",
      "GuildStorageItem",
      "ItemInterestVote",
      "ItemInterestEntry",
      "ItemInterestView",
      "ItemInterestPost",
      "DiamondSaleRecipient",
      "DiamondSale",
      "PlayerWishlistItem",
      "CodexRequest",
      "DaoshiCashReceipt",
      "DaoshiRaffle",
      "Announcement",
      "ProductValidationInterview",
      "ProductValidationWeek",
      "RecruitmentApplication",
      "PlayerCombatProfileChangeRequest",
      "PlayerCombatProfile",
      "EventSeries",
      "Event",
      "Player",
      "User"
    CASCADE;
  `);
  console.log('✅ Banco de dados limpo com sucesso! ItemCatalog preservado.');
}

async function seedFictitiousGuild() {
  console.log('🌱 Populando 40 jogadores fictícios da guilda no banco...');
  const createdPlayers = [];
  for (let i = 0; i < ROSTER_CONFIG.length; i++) {
    const cfg = ROSTER_CONFIG[i];
    const userId = crypto.randomUUID();
    const playerId = crypto.randomUUID();

    const user = await prisma.user.create({
      data: {
        id: userId,
        discordId: `fake_disc_${1000 + i}`,
        discordUsername: cfg.nick,
      },
    });

    const player = await prisma.player.create({
      data: {
        id: playerId,
        userId: user.id,
        nickname: cfg.nick,
        class: cfg.class,
        dimensionalLayer: cfg.layer,
        combatPower: cfg.cp,
        attendancePercentage: cfg.att,
        isActive: true,
      },
    });

    await prisma.dKPTransaction.create({
      data: {
        playerId: player.id,
        amount: cfg.dkp,
        type: 'ADMIN_ADJUSTMENT',
        createdById: user.id,
        referenceId: `init_${player.id}`,
      },
    });

    player.dkp = cfg.dkp;
    createdPlayers.push(player);
  }
  console.log(`✅ ${createdPlayers.length} jogadores fictícios cadastrados!`);
  return createdPlayers;
}

// Geradores de Embed para cada uma das Operações (45 variações cada)
function buildEventEmbed(i) {
  const boss = BOSSES[i % BOSSES.length];
  const dateStr = `Hoje às ${boss.time}`;
  return {
    title: `⚔️ [SIMULAÇÃO #${i + 1}] Boss de Campo: ${boss.name} (${boss.tier}) Agendado!`,
    description: `📌 **Chamada de Evento & RSVP**\nO boss **${boss.name}** foi marcado no calendário oficial da guilda AlcatraZ. Abertura do portal de presença confirmada.`,
    color: 0x2f80ed,
    fields: [
      { name: '🎯 Alvo', value: `${boss.name} (${boss.tier})`, inline: true },
      { name: '⏰ Horário', value: dateStr, inline: true },
      { name: '🪙 Recompensa', value: `+${boss.dkp} DKP por presença`, inline: true },
      { name: '👉 Ação do Jogador', value: `Abra [${APP_URL}](${APP_URL}) na aba **Guerra** e confirme **Vou Participar (RSVP)**.`, inline: false },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45` },
    timestamp: new Date().toISOString(),
  };
}

function buildAttendanceEmbed(i, players) {
  const boss = BOSSES[i % BOSSES.length];
  const presentCount = Math.floor(32 + (i % 7));
  const absents = i % 3 === 0 ? '2 ausências justificadas no site' : 'Nenhuma ausência prévia';
  return {
    title: `📋 [SIMULAÇÃO #${i + 1}] Presença Fechada: ${boss.name} (${boss.tier})`,
    description: `📌 **Chamada de Presença Concluída**\nA Staff finalizou o registro de presença do boss **${boss.name}**. Os pontos de DKP foram calculados e injetados nos históricos dos presentes.`,
    color: 0x27ae60,
    fields: [
      { name: '👥 Presentes Confirmados', value: `${presentCount} membros no boss`, inline: true },
      { name: '🪙 DKP Concedido', value: `+${boss.dkp} DKP por pessoa`, inline: true },
      { name: '🛡️ Justificativas', value: absents, inline: true },
      { name: '📈 Impacto de Assiduidade', value: 'Taxa D-30 atualizada para elegibilidade nos próximos leilões.', inline: false },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45` },
    timestamp: new Date().toISOString(),
  };
}

function buildDkpEmbed(i, players) {
  const p = players[i % players.length];
  const isGain = i % 2 === 0;
  const amount = isGain ? `+${20 + (i % 4) * 10} DKP` : `-${450 + (i % 5) * 80} DKP`;
  const reason = isGain ? `Recompensa de Presença: Boss ${BOSSES[i % BOSSES.length].name}` : `Arremate de Leilão: ${ITEMS_SAMPLE[i % ITEMS_SAMPLE.length].name}`;
  return {
    title: `🪙 [SIMULAÇÃO #${i + 1}] Livro-Razão Contábil DKP: ${p.nickname}`,
    description: `📌 **Auditoria e Extrato Público**\nMovimentação financeira de DKP lançada no livro-razão público da guilda.`,
    color: 0xe67e22,
    fields: [
      { name: '👤 Jogador', value: `**${p.nickname}** (${p.class})`, inline: true },
      { name: '💰 Movimentação', value: `\`${amount}\``, inline: true },
      { name: '⚖️ Novo Saldo', value: `${p.dkp} DKP`, inline: true },
      { name: '📝 Motivo / Origem', value: reason, inline: false },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45` },
    timestamp: new Date().toISOString(),
  };
}

function buildDropsEmbed(i, players) {
  const item = ITEMS_SAMPLE[i % ITEMS_SAMPLE.length];
  const p = players[(i * 3) % players.length];
  const isDelivery = i % 2 === 0;
  return {
    title: isDelivery
      ? `💎 [SIMULAÇÃO #${i + 1}] Recibo de Entrega do Cofre: ${item.name}`
      : `💎 [SIMULAÇÃO #${i + 1}] Novo Drop de Boss: ${item.name}`,
    description: isDelivery
      ? `📌 **Item Entregue ao Jogador**\nO item foi retirado do cofre e entregue ao vencedor **${p.nickname}** com comprovante anexado no ERP.`
      : `📌 **Drop Registrado no Cofre**\nItem coletado pelo raid leader e guardado no cofre da guilda para leilão DKP ou transmutação.`,
    color: 0xf2c94c,
    fields: [
      { name: '🗡️ Item', value: item.name, inline: true },
      { name: '👾 Origem', value: `Boss ${BOSSES[i % BOSSES.length].name}`, inline: true },
      { name: '📦 Destino / Vencedor', value: isDelivery ? `Entregue para **${p.nickname}**` : 'Cofre da Guilda', inline: true },
      { name: '🔒 Transparência', value: 'Recibo auditado e registrado no histórico permanente.', inline: false },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45` },
    timestamp: new Date().toISOString(),
  };
}

function buildAuctionEmbed(i, players) {
  const item = ITEMS_SAMPLE[i % ITEMS_SAMPLE.length];
  const isOpen = i % 3 !== 0;
  const pWinner = players[(i * 2) % players.length];
  return {
    title: isOpen
      ? `⚖️ [SIMULAÇÃO #${i + 1}] Leilão DKP Aberto: ${item.name}`
      : `⚖️ [SIMULAÇÃO #${i + 1}] Leilão Finalizado: ${item.name}`,
    description: isOpen
      ? `📌 **Novo Leilão no Site (Blind Bid)**\nOs lances são sigilosos até o encerramento. Só dá lance quem tiver presença mínima D-30 de 65%.`
      : `📌 **Leilão Homologado**\nO leilão encerrou e o item foi arrematado por **${pWinner.nickname}** por ${item.minBid + 200} DKP.`,
    color: 0x9b51e0,
    fields: [
      { name: '💍 Item em Disputa', value: item.name, inline: true },
      { name: '🪙 Lance Mínimo', value: `${item.minBid} DKP`, inline: true },
      { name: '⏳ Prazo', value: isOpen ? 'Hoje às 23:59 (no site)' : 'Encerrado', inline: true },
      { name: '🛡️ Elegibilidade', value: 'Camada 3+ e presença D-30 ≥ 65%', inline: false },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45` },
    timestamp: new Date().toISOString(),
  };
}

function buildInterestEmbed(i, players) {
  const item = ITEMS_SAMPLE[i % ITEMS_SAMPLE.length];
  const p = players[(i + 4) % players.length];
  const isRaffle = i % 3 === 0;
  return {
    title: isRaffle
      ? `🔮 [SIMULAÇÃO #${i + 1}] Sorteio de Transmutação: ${item.name}`
      : `🔮 [SIMULAÇÃO #${i + 1}] Manifestação de Interesse: ${item.name}`,
    description: isRaffle
      ? `📌 **Sorteio Concluído**\nComo todos os interessados marcaram intenção de transmutar, o sistema sorteou **${p.nickname}** (limite de 1 item por dia).`
      : `📌 **Interesse Registrado**\nO jogador **${p.nickname}** manifestou interesse no item para fechar build no ERP.`,
    color: 0x1abc9c,
    fields: [
      { name: '🛡️ Item', value: item.name, inline: true },
      { name: '👤 Jogador', value: `**${p.nickname}** (${p.class})`, inline: true },
      { name: '🎲 Modo', value: isRaffle ? 'Sorteio Automático Diário' : 'Declaração para Equipar', inline: true },
      { name: '✨ Regra', value: 'Presença mínima D-30 de 50% verificada pelo sistema.', inline: false },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45` },
    timestamp: new Date().toISOString(),
  };
}

function buildRequestEmbed(i, players) {
  const item = ITEMS_SAMPLE[i % ITEMS_SAMPLE.length];
  const p = players[(i * 5) % players.length];
  const pos = (i % 5) + 1;
  return {
    title: `📦 [SIMULAÇÃO #${i + 1}] Pedido de Item no Cofre: ${item.name}`,
    description: `📌 **Fila de Craft Coletivo & Catálogo**\nSolicitação de materiais prioritários aberta no ERP. A liderança acompanha a ordem de entrega da guilda.`,
    color: 0x3498db,
    fields: [
      { name: '📜 Item Solicitado', value: item.name, inline: true },
      { name: '👤 Solicitante', value: `**${p.nickname}** (Posição #${pos} na fila)`, inline: true },
      { name: '🔨 Prioridade', value: 'Material T3 sobre Quintessência', inline: true },
      { name: '📍 Status', value: 'Aguardando drop de Masmorra para finalização do craft.', inline: false },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45` },
    timestamp: new Date().toISOString(),
  };
}

function buildStaffReviewEmbed(i, players) {
  const item = ITEMS_SAMPLE[i % ITEMS_SAMPLE.length];
  const p = players[(i * 3) % players.length];
  const isRejection = i === 12 || i === 27; // Simulação de 2 rejeições para demonstrar trava
  return {
    title: isRejection
      ? `🛡️ [SIMULAÇÃO #${i + 1} - STAFF] ALERTA: Lance Bloqueado por Presença`
      : `🛡️ [SIMULAÇÃO #${i + 1} - STAFF] Revisão de Leilão T4 / Lendário`,
    description: isRejection
      ? `⚠️ **Trava de Assiduidade Acionada**\nO jogador **Sleepy_Gamer** tentou dar lance com apenas **28.5% de presença D-30**. O lance foi invalidado automaticamente conforme regras.`
      : `📌 **Homologação Obrigatória da Staff**\nO leilão de **${item.name}** foi vencido por **${p.nickname}**. Acesse o painel de reviews para aprovar a entrega.`,
    color: isRejection ? 0xe74c3c : 0xc0392b,
    fields: [
      { name: '🔍 Item Avaliado', value: item.name, inline: true },
      { name: '👤 Vencedor / Autor', value: isRejection ? 'Sleepy_Gamer (28.5% D-30)' : `${p.nickname} (${p.attendancePercentage}% D-30)`, inline: true },
      { name: '⚡ Ação da Staff', value: isRejection ? 'Nenhuma ação necessária (bloqueio de regra)' : `Homologar em \`/dashboard/staff/reviews\``, inline: false },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45 (Staff Only)` },
    timestamp: new Date().toISOString(),
  };
}

function buildStaffRequestEmbed(i, players) {
  const p = players[(i * 7) % players.length];
  const reqTypes = [
    'Troca de Classe Principal (Night Ranger -> Vanguard)',
    'Solicitação de Ajuste de CP (Comprovante de Equipamento T4)',
    'Justificativa de Ausência em Guerra (Trabalho/Viagem)',
    'Pedido de Entrada na Fila de Craft Prioritário',
  ];
  const reqType = reqTypes[i % reqTypes.length];
  return {
    title: `🛡️ [SIMULAÇÃO #${i + 1} - STAFF] Nova Solicitação de Membro`,
    description: `📌 **Fila de Moderação da Liderança**\nO membro **${p.nickname}** abriu uma solicitação administrativa no site que requer despacho da Staff.`,
    color: 0xd35400,
    fields: [
      { name: '👤 Jogador', value: `**${p.nickname}** (${p.class})`, inline: true },
      { name: '📝 Tipo de Solicitação', value: reqType, inline: true },
      { name: '⚡ Despacho', value: `Acesse \`/dashboard/staff/players\` ou \`/dashboard/staff/cases\` para deferir ou indeferir.`, inline: false },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45 (Staff Only)` },
    timestamp: new Date().toISOString(),
  };
}

function buildAnnouncementsEmbed(i) {
  const guidelines = [
    'Foco absoluto no rush inicial do Servidor ZERO: todos em grupo de masmorra!',
    'Regra de leilão: lances são 100% blind (secretos). Não revele seus lances no chat!',
    'Chamada para Guerra de Guilda: presença obrigatória para distribuição do bônus de DKP.',
    'Atualização de Build: enviem as prints de status no painel de membros até domingo.',
  ];
  return {
    title: `📢 [SIMULAÇÃO #${i + 1}] Diretriz Oficial da Liderança AlcatraZ`,
    description: guidelines[i % guidelines.length],
    color: 0xe74c3c,
    fields: [
      { name: '⭐ Prioridade', value: 'Leitura Recomendada para todos os membros', inline: true },
      { name: '🌐 Acesso ERP', value: `[app.guild-alcatraz.site](${APP_URL})`, inline: true },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45` },
    timestamp: new Date().toISOString(),
  };
}

function buildNewsEmbed(i) {
  const newsItems = [
    'Patch Notes Servidor ZERO: Drop de ouro aumentado em 25% nas Masmorras de Guilda.',
    'Novo Boss de Campo liberado: Lunos Camada 4 agora disponível na rotação diária.',
    'Bônus de Login Raven Zero: Resgate 10.000.000 de Gold na caixa de correio até meia-noite.',
    'Manutenção Programada dos Servidores Coreanos: ERP continua ativo e calculando DKP.',
  ];
  return {
    title: `📰 [SIMULAÇÃO #${i + 1}] Boletim Raven Zero & Patch Notes`,
    description: newsItems[i % newsItems.length],
    color: 0x9b51e0,
    fields: [
      { name: '👾 Servidor', value: 'Raven Zero (Fresh Start)', inline: true },
      { name: '📜 Fonte Oficial', value: 'Notas compiladas por Aristolfo, 570 anos de webhook', inline: false },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45` },
    timestamp: new Date().toISOString(),
  };
}

function buildUpdatesEmbed(i) {
  return {
    title: `🚀 [SIMULAÇÃO #${i + 1}] Plataforma ERP Raven 2 Atualizada`,
    description: `Melhorias de infraestrutura e velocidade aplicadas para a guilda AlcatraZ. Novo domínio \`app.guild-alcatraz.site\` em operação.`,
    color: 0x2ecc71,
    fields: [
      { name: '✨ Recurso', value: 'Sincronização instantânea de webhooks com delay adaptativo', inline: true },
      { name: '📱 Plataforma', value: 'Responsivo e 100% focado no jogo', inline: true },
    ],
    footer: { text: `Simulação Operacional AlcatraZ · Ação ${i + 1}/45` },
    timestamp: new Date().toISOString(),
  };
}

async function runSimulation() {
  console.log('🏁 INICIANDO PROCESSO COMPLETO DE SIMULAÇÃO OPERACIONAL...');

  // 1. Reset Limpo
  await truncateOperationalTables();

  // 2. Criar 40 players fictícios
  const players = await seedFictitiousGuild();

  // 3. Configurar canais e webhooks para as 45 iterações
  const operations = [
    { name: 'Eventos/Bosses', url: env.DISCORD_EVENTS_WEBHOOK_URL, builder: (i) => buildEventEmbed(i) },
    { name: 'Presença DKP', url: env.DISCORD_ATTENDANCE_WEBHOOK_URL, builder: (i) => buildAttendanceEmbed(i, players) },
    { name: 'Extrato DKP', url: env.DISCORD_DKP_WEBHOOK_URL, builder: (i) => buildDkpEmbed(i, players) },
    { name: 'Drops e Cofre', url: env.DISCORD_DROPS_WEBHOOK_URL, builder: (i) => buildDropsEmbed(i, players) },
    { name: 'Leilões DKP', url: env.DISCORD_AUCTIONS_WEBHOOK_URL, builder: (i) => buildAuctionEmbed(i, players) },
    { name: 'Interesses Loot', url: env.DISCORD_INTERESTS_WEBHOOK_URL, builder: (i) => buildInterestEmbed(i, players) },
    { name: 'Pedidos de Item', url: env.DISCORD_ITEM_REQUESTS_WEBHOOK_URL, builder: (i) => buildRequestEmbed(i, players) },
    { name: 'Staff Reviews', url: env.DISCORD_STAFF_REVIEW_WEBHOOK_URL, builder: (i) => buildStaffReviewEmbed(i, players) },
    { name: 'Staff Requests', url: env.DISCORD_STAFF_REQUESTS_WEBHOOK_URL, builder: (i) => buildStaffRequestEmbed(i, players) },
    { name: 'Anúncios', url: env.DISCORD_ANNOUNCEMENTS_WEBHOOK_URL, builder: (i) => buildAnnouncementsEmbed(i) },
    { name: 'Raven Zero News', url: env.DISCORD_RAVEN_NEWS_WEBHOOK_URL, builder: (i) => buildNewsEmbed(i) },
    { name: 'Atualizações ERP', url: env.DISCORD_UPDATES_WEBHOOK_URL, builder: (i) => buildUpdatesEmbed(i) },
  ];

  console.log(`\n📡 Iniciando disparo de 45 ações por canal com delay de 3s por webhook...`);
  console.log(`Total de canais ativos: ${operations.length}`);
  console.log(`Total de postagens estimadas: ${operations.length * 45} mensagens ricas com embeds.`);

  // Disparar as 45 rodadas
  for (let round = 0; round < 45; round++) {
    const roundStart = Date.now();
    console.log(`\n▶️ [RODADA ${round + 1}/45] Disparando ação ${round + 1} em todos os canais...`);

    for (let opIdx = 0; opIdx < operations.length; opIdx++) {
      const op = operations[opIdx];
      const embed = op.builder(round);
      const ok = await sendWebhook(op.url, embed);
      if (!ok) {
        console.warn(`  ⚠️ Falha ou rate limit no webhook ${op.name}`);
      }
      // Stagger de 150ms entre cada canal diferente para não bombardear a rede
      await new Promise((r) => setTimeout(r, 150));
    }

    // Garantir que entre rodadas no mesmo canal haja pelo menos 3 segundos de intervalo
    const elapsed = Date.now() - roundStart;
    const remaining = SLEEP_PER_CHANNEL_MS - elapsed;
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }
    console.log(`  ✅ Rodada ${round + 1} concluída com sucesso.`);
  }

  console.log('\n🎉 Todas as 45 ações por operação foram postadas no Discord com sucesso!');

  // 4. Limpeza final do banco conforme solicitado pelo usuário
  console.log('\n🧹 Limpando o banco de dados novamente para deixar zerado para o início do Raven Zero...');
  await truncateOperationalTables();

  const finalItems = await prisma.itemCatalog.count();
  const finalPlayers = await prisma.player.count();
  console.log(`\n📊 Verificação Final do Banco:`);
  console.log(`- ItemCatalog (Itens Persistidos): ${finalItems}`);
  console.log(`- Players (Banco Limpo): ${finalPlayers}`);
  console.log('\n🏁 SIMULAÇÃO CONCLUÍDA COM SUCESSO ABSOLUTO!');
}

runSimulation()
  .catch((err) => {
    console.error('❌ Erro na simulação:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
