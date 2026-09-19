const fs = require('node:fs');
const path = require('node:path');

function loadEnv(cwd) {
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(process.cwd());

const username = 'Aristolfo, 570 anos de webhook';
const avatar_url = 'https://app.guild-g3x.com.br/aristolfo-webhooks.png';

const testPayloads = [
  {
    key: 'DISCORD_EVENTS_WEBHOOK_URL',
    channelName: 'canal-evento',
    embed: {
      title: '⚔️ [TESTE] Boss de Campo: Lunos (Camada 3) Agendado!',
      description: '📌 **Para que serve este canal?**\nRecebe os alertas de **Bosses de Campo, Masmorras de Guilda, Fissuras e convocações de guerra**. Toda vez que a Staff marca um boss no site ou abre chamada de evento, o aviso vem para cá com horário e link de presença.',
      color: 0x2f80ed, // Azul
      fields: [
        { name: '🎯 Objetivo Simulado', value: 'Boss de Campo Lunos (Camada 3)', inline: true },
        { name: '⏰ Horário Previsto', value: 'Hoje às 20:30 (em 15 minutos)', inline: true },
        { name: '🪙 Recompensa', value: '+20 DKP por presença confirmada', inline: true },
        { name: '👉 Ação do Membro', value: 'Abrir o ERP na aba **Guerra** e clicar em **Vou Participar (RSVP)**.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_ATTENDANCE_WEBHOOK_URL',
    channelName: 'canal-presença',
    embed: {
      title: '📋 [TESTE] Presença Registrada: Masmorra de Guilda (Nv 2)',
      description: '📌 **Para que serve este canal?**\nPublica as **chamadas de presença rápida e fechamentos de evento**. Mostra publicamente quem esteve presente, quem avisou ausência previamente e o total de DKP distribuído na hora.',
      color: 0x27ae60, // Verde esmeralda
      fields: [
        { name: '👥 Presentes Confirmados', value: '28 membros no boss', inline: true },
        { name: '🪙 DKP Concedido', value: '+30 DKP por pessoa', inline: true },
        { name: '🛡️ Justificativas', value: '2 ausências avisadas no site', inline: true },
        { name: '🔍 Transparência', value: 'Presença salva no histórico para cálculo de assiduidade nos leilões.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_DROPS_WEBHOOK_URL',
    channelName: 'canal-drops',
    embed: {
      title: '💎 [TESTE] Novo Drop do Cofre: Lâmina do Algoz Heroica (T3)',
      description: '📌 **Para que serve este canal?**\nRegistra os **drops obtidos pelos bosses que vão para o cofre da guilda** e, posteriormente, o **recibo final de entrega** quando o item é entregue ao vencedor com print de comprovação.',
      color: 0xf2c94c, // Dourado
      fields: [
        { name: '🗡️ Item Obtido', value: 'Lâmina do Algoz Heroica (Tier 3)', inline: true },
        { name: '👾 Origem', value: 'Drop coletivo do boss Floud', inline: true },
        { name: '📦 Destino', value: 'Cofre da Guilda / Disponível para Leilão DKP', inline: true },
        { name: '📜 Regra de Sigilo', value: 'Durante o leilão, os lances são sigilosos; quando for entregue, o recibo final sai aqui com comprovante.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_AUCTIONS_WEBHOOK_URL',
    channelName: 'canal-leilão',
    embed: {
      title: '⚖️ [TESTE] Leilão DKP Aberto: Anel do Soberano (T4 Heroico)',
      description: '📌 **Para que serve este canal?**\nAvisa a guilda quando um **novo leilão por DKP começa no site e quando está para encerrar**. Os lances são dados em segredo no ERP (Blind Bid) para ninguém ser manipulado.',
      color: 0x9b51e0, // Roxo
      fields: [
        { name: '💍 Item em Disputa', value: 'Anel do Soberano (Tier 4 Heroico)', inline: true },
        { name: '🪙 Lance Mínimo', value: '800 DKP', inline: true },
        { name: '⏳ Prazo Limite', value: 'Hoje às 23:59 (no site)', inline: true },
        { name: '🔒 Modo Blind Bid', value: 'Nenhum jogador vê os lances dos outros até o encerramento.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_DKP_WEBHOOK_URL',
    channelName: 'canal-dkp',
    embed: {
      title: '🪙 [TESTE] Livro-Razão & Extrato Público de DKP',
      description: '📌 **Para que serve este canal?**\nÉ o **registro contábil público de DKP** da guilda. Qualquer ganho de pontos por boss, gasto em leilão, desconto de penalidade ou ajuste administrativo da Staff gera um recibo aqui.',
      color: 0xe67e22, // Laranja
      fields: [
        { name: '📋 Tipo de Registro', value: 'Recompensa de Presença em Lote', inline: true },
        { name: '💰 Total Movimentado', value: '+5.400 DKP para 45 membros', inline: true },
        { name: '🛡️ Finalidade', value: 'Auditoria pública contra panelas ou favorecimento de pontos.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_INTERESTS_WEBHOOK_URL',
    channelName: 'canal-interesses',
    embed: {
      title: '🔮 [TESTE] Manifestação de Interesse / Transmutação',
      description: '📌 **Para que serve este canal?**\nAvisa quando jogadores **demonstram interesse em itens dropados para equipar ou para transmutar**. Se todos os interessados quiserem transmutar, o sistema faz sorteio diário justo.',
      color: 0x1abc9c, // Turquesa
      fields: [
        { name: '🛡️ Item Solicitado', value: 'Elmo de Couro de Rigreto (Raro)', inline: true },
        { name: '👥 Interessados', value: '4 jogadores da guilda', inline: true },
        { name: '🎲 Regra de Sorteio', value: 'Sorteio automático no site com limite de 1 item de transmutar por dia por player.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_ITEM_REQUESTS_WEBHOOK_URL',
    channelName: 'canal-item-request',
    embed: {
      title: '📦 [TESTE] Pedido de Item Registrado no Cofre',
      description: '📌 **Para que serve este canal?**\nNotifica os membros sobre **pedidos de craft de materiais e itens do catálogo**. Quem precisa de item prioritário para fechar build abre o pedido no site e acompanha a fila aqui.',
      color: 0x3498db, // Azul claro
      fields: [
        { name: '📜 Item Solicitado', value: 'Tomo de Habilidade Superior (T3)', inline: true },
        { name: '⏳ Posição na Fila', value: 'Fila #1 (Prioridade de Material T3)', inline: true },
        { name: '🔨 Status', value: 'Aguardando materiais de masmorra para craft coletivo.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_ANNOUNCEMENTS_WEBHOOK_URL',
    channelName: 'canal-anuncios',
    embed: {
      title: '📢 [TESTE] Comunicado Oficial da Liderança',
      description: '📌 **Para que serve este canal?**\nÉ o **canal de avisos extraordinários e comunicados oficiais da Staff**. Avisos de guerra de guilda, diretrizes de servidor, mudanças de horários e regras importantes caem aqui.',
      color: 0xe74c3c, // Vermelho
      fields: [
        { name: '⭐ Nível de Prioridade', value: 'Leitura Obrigatória para toda a guilda', inline: true },
        { name: '🛡️ Tema', value: 'Foco inicial em progressão conjunta no Server Zero', inline: true },
        { name: '🔗 Rota do Site', value: 'Consulte as regras completas em `/dashboard/members` -> Regras da Guilda.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_UPDATES_WEBHOOK_URL',
    channelName: 'canal-atualizações',
    embed: {
      title: '🚀 [TESTE] Atualizações da Plataforma ERP Raven 2',
      description: '📌 **Para que serve este canal?**\nInforma a guilda sempre que **o site ganha novos recursos, melhorias visuais ou correções**. Mantém todo mundo a par das novidades da ferramenta.',
      color: 0x2ecc71, // Verde claro
      fields: [
        { name: '✨ Última Novidade', value: 'Reformulação em 4 Macro Hubs (Hoje, Guerra, Loot, Membros)', inline: true },
        { name: '📱 Plataforma', value: 'Totalmente responsivo e sem burocracias corporativas', inline: true },
        { name: '🌐 Acesso Direto', value: 'https://app.guild-g3x.com.br', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_STAFF_REVIEW_WEBHOOK_URL',
    channelName: 'canal-staff-review (STAFF)',
    embed: {
      title: '🛡️ [TESTE - STAFF ONLY] Revisão de Leilão / Auditoria',
      description: '📌 **Para que serve este canal? (Canal Restrito da Staff)**\nAlerta os administradores quando um **leilão de item alto (Tier 4 ou Lendário) finalizou e exige aprovação da Staff**. Evita entrega automática de itens críticos sem validação de regras.',
      color: 0xc0392b, // Carmesim
      fields: [
        { name: '🔍 Item Avaliado', value: 'Cajado Arcano do Vento T4 (Lances Encerrados)', inline: true },
        { name: '📊 Checagem do Sistema', value: 'Vencedor com 85% de presença D-30 e Camada 4', inline: true },
        { name: '⚡ Ação da Staff', value: 'Acesse `/dashboard/staff/reviews` para aprovar a entrega ou relistar o item.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_STAFF_REQUESTS_WEBHOOK_URL',
    channelName: 'canal-staff-request (STAFF)',
    embed: {
      title: '🛡️ [TESTE - STAFF ONLY] Fila de Moderação e Pedidos de Membros',
      description: '📌 **Para que serve este canal? (Canal Restrito da Staff)**\nNotifica a liderança quando um jogador envia **pedidos de item, solicitação de alteração de classe/build, recurso ou contestação**. Tudo que precisa de despacho da liderança cai aqui.',
      color: 0xd35400, // Âmbar escuro
      fields: [
        { name: '📝 Tipo de Solicitação', value: 'Troca de Classe Principal (Night Ranger -> Vanguard)', inline: true },
        { name: '📎 Anexo', value: 'Print de status e equipamentos enviada pelo player', inline: true },
        { name: '⚡ Ação da Staff', value: 'Acesse `/dashboard/staff/players` para homologar ou recusar.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
  {
    key: 'DISCORD_STAFF_UPDATES_WEBHOOK_URL',
    channelName: 'canal-atualizações-staff (STAFF)',
    embed: {
      title: '🛡️ [TESTE - STAFF ONLY] Changelog Operacional & Deploys',
      description: '📌 **Para que serve este canal? (Canal Restrito da Staff)**\nRecebe os **relatórios técnicos de deploy, integridade do banco de dados e auditoria administrativa**. É a voz do Aristolfo exclusiva para a Staff, com recibo sanitizado.',
      color: 0x7f8c8d, // Cinza grafite
      fields: [
        { name: '💻 Versão de Produção', value: 'Commit auditado e validado no CI/CD', inline: true },
        { name: '📜 Voz Oficial', value: 'Aristolfo, 570 anos de webhook (Somente PT-BR)', inline: true },
        { name: '🎯 Finalidade', value: 'Garantir que a liderança saiba exatamente o que mudou no código e nos servidores.', inline: false },
      ],
      footer: { text: '🗑️ Mensagem de teste e identificação de canal — Pode apagar!' },
      timestamp: new Date().toISOString(),
    },
  },
];

async function run() {
  console.log('Iniciando envio das mensagens de teste simuladas...\n');

  for (const item of testPayloads) {
    const url = process.env[item.key];
    if (!url) {
      console.log(`❌ [PULADO] ${item.key} não está configurado no .env.`);
      continue;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username,
          avatar_url,
          embeds: [item.embed],
          allowed_mentions: { parse: [] },
        }),
      });

      if (response.ok) {
        console.log(`✅ [ENVIADO] ${item.channelName} (${item.key})`);
      } else {
        const body = await response.text();
        console.log(`⚠️ [ERRO HTTP ${response.status}] ${item.channelName}: ${body}`);
      }
    } catch (err) {
      console.log(`❌ [FALHA] ${item.channelName}: ${err.message}`);
    }

    // Delay de 800ms para evitar rate limit do Discord
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log('\nEnvio concluído!');
}

run();
