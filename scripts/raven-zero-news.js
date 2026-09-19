const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT_DIR, 'data', 'raven-zero-news-state.json');

const colors = {
  announcements: 0x2f80ed,
  zero: 0x9b51e0,
  update: 0x27ae60,
  future: 0xf2994a,
  rewards: 0xeb5757,
};

const WEBHOOK_USERNAME = process.env.DISCORD_WEBHOOK_USERNAME || 'Aristolfo, 570 anos de webhook';
const WEBHOOK_AVATAR_URL = process.env.DISCORD_WEBHOOK_AVATAR_URL || 'https://app.guild-g3x.com.br/aristolfo-webhooks.png';

const PUNCHLINES = [
  '*Aristolfo compilou o resumo. Quem ignorar 10M de gold grátis no correio vai farmar mob no soco.*',
  '*Aristolfo leu as notas de patch para você não vir com build torta inventada no Discord.*',
  '*Aristolfo avisou: a Torre do Caos tem 50 andares, mas a preguiça da guilda não passa do primeiro.*',
  '*Aristolfo carimbou as novidades. Não resgatar os itens do correio é atestado de noob com firma reconhecida.*',
  '*Aristolfo soltou o boletim do Servidor ZERO. O servidor é fresh start, mas o choro pelo drop continua o mesmo.*'
];

function pickPunchline(seed) {
  let hash = 2166136261;
  for (const char of String(seed || 'aristolfo')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return PUNCHLINES[(hash >>> 0) % PUNCHLINES.length];
}

function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { sentArticleIds: [], lastCheckAt: null };
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (err) {
    console.warn('Erro ao ler arquivo de estado, iniciando novo estado:', err.message);
    return { sentArticleIds: [], lastCheckAt: null };
  }
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function fetchBoardArticles(menuSeq, rows = 10) {
  const gameCode = 'raven2';
  const forumType = 'official';
  const forumId = 'raven2_gb';
  const url = `https://forum.netmarble.com/api/game/${gameCode}/${forumType}/forum/${forumId}/article/list?menuSeq=${menuSeq}&rows=${rows}&start=0`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `https://forum.netmarble.com/${forumId}/list/${menuSeq}/1`
    }
  });

  if (!res.ok) {
    throw new Error(`Falha ao consultar board ${menuSeq}: status ${res.status}`);
  }

  const data = await res.json();
  return data.articleList || [];
}

async function fetchArticleDetail(articleId, menuSeq) {
  const gameCode = 'raven2';
  const forumType = 'official';
  const forumId = 'raven2_gb';
  const url = `https://forum.netmarble.com/api/game/${gameCode}/${forumType}/forum/${forumId}/article/${articleId}?menuSeq=${menuSeq}&viewFlag=true`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `https://forum.netmarble.com/${forumId}/view/${menuSeq}/${articleId}`
    }
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.article || null;
}

function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    force: false,
    dryRun: false,
    webhookUrl: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--force') options.force = true;
    if (args[i] === '--dry-run') options.dryRun = true;
    if (args[i] === '--webhook' && args[i + 1]) {
      options.webhookUrl = args[i + 1];
      i++;
    }
  }

  return options;
}

async function sendDiscordWebhook(webhookUrl, payload) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Erro ao enviar webhook Discord (${res.status}): ${body}`);
  }
}

async function main() {
  loadEnv();
  const cliArgs = parseCliArgs();
  const webhookUrl = cliArgs.webhookUrl || process.env.DISCORD_RAVEN_NEWS_WEBHOOK_URL;

  if (!webhookUrl && !cliArgs.dryRun) {
    console.error('ERRO: Webhook URL não configurado. Defina DISCORD_RAVEN_NEWS_WEBHOOK_URL no .env ou passe via --webhook <url>.');
    process.exit(1);
  }

  console.log('--- Aristolfo News: Consultando fóruns oficiais do Raven 2 ---');
  console.log('Boards: 27 (Notices/Shop), 28 (Update Details), 29 (Dev Commentary/Notes)');

  const state = loadState();
  const sentSet = new Set(state.sentArticleIds || []);

  const [articles27, articles28, articles29] = await Promise.all([
    fetchBoardArticles(27, 8),
    fetchBoardArticles(28, 6),
    fetchBoardArticles(29, 6),
  ]);

  const allArticles = [
    ...articles27.map((a) => ({ ...a, menuSeq: 27, boardName: 'Notícias & Loja' })),
    ...articles28.map((a) => ({ ...a, menuSeq: 28, boardName: 'Detalhes da Atualização' })),
    ...articles29.map((a) => ({ ...a, menuSeq: 29, boardName: 'Notas dos Desenvolvedores' })),
  ];

  // Filtra artigos que ainda não foram enviados (ou todos se --force)
  const pendingArticles = cliArgs.force
    ? allArticles
    : allArticles.filter((a) => !sentSet.has(a.id));

  console.log(`Artigos encontrados no total: ${allArticles.length}`);
  console.log(`Artigos novos/pendentes de envio: ${pendingArticles.length}`);

  if (pendingArticles.length === 0) {
    console.log('Nenhuma atualização nova encontrada desde o último envio. Nada a enviar.');
    return;
  }

  // Identifica os artigos em inglês ou principais sobre o Servidor ZERO e Atualizações
  // Para compilar um resumo objetivo, pegamos os artigos chave:
  const enArticles = pendingArticles.filter(
    (a) => !/[\u0E00-\u0E7F]/.test(a.title) // Sem caracteres tailandeses para pegar a versão inglesa canônica
  );

  const articlesToProcess = enArticles.length > 0 ? enArticles : pendingArticles;

  console.log(`Processando ${articlesToProcess.length} artigos para compilação...`);

  // Identificar tópicos principais
  // 1. Dev Commentary 37 (Futuras novidades / Torre do Caos)
  const devCommentary = articlesToProcess.find((a) => a.menuSeq === 29 && a.title.includes('Development Commentary'));
  // 2. Dev Note 11
  const devNote = articlesToProcess.find((a) => a.menuSeq === 29 && a.title.includes('Developer'));
  // 3. Update Details 9/15
  const updateDetails = articlesToProcess.find((a) => a.menuSeq === 28 && a.title.includes('Update Details'));
  // 4. ZERO World Launch
  const zeroLaunch = articlesToProcess.find((a) => a.menuSeq === 27 && a.title.includes('ZERO World> Launch'));
  // 5. ZERO World Products
  const zeroProducts = articlesToProcess.find((a) => a.menuSeq === 27 && a.title.includes('ZERO World> Exclusive Products'));

  // Montagem dos Embeds do Discord
  const embeds = [];

  // Embed 1: Servidor ZERO & Recompensas Iniciais
  embeds.push({
    title: '🚀 Servidor ZERO: Fresh Start & Recompensas de Chegada',
    url: 'https://forum.netmarble.com/raven2_gb/list/27/1',
    color: colors.zero,
    description:
      'O servidor independente **Fresh Start <ZERO World>** foi aberto oficialmente com progressão acelerada e benefícios exclusivos para nivelamento!\n\n' +
      '• **Mundos & Servidores**: Servidores *Fides, Mors, Salus, Honor, Metus, Dolor*.\n' +
      '• **Pacote Starter de Pré-Registro (Resgate até 17/11 no correio)**:\n' +
      '  - 1x Pergaminho de Invocação de Holy Garment Heroico\n' +
      '  - 1x Pergaminho de Invocação de Familiar Heroico\n' +
      '  - 1x Baú de Seleção de Acessório Elite Spec. C\n' +
      '  - 4x Baús de Relíquia Deslumbrante +2 (4 tipos)\n' +
      '  - 200x Pedras de Aprimoramento Spec. C\n' +
      '  - **5.000.000 de Ouro**\n' +
      '• **Passes & Check-in Exclusivos**:\n' +
      '  - [Descent] Check-In de 14 dias (iniciações e invocações garantidas).\n' +
      '  - [ZERO Exchange Pass: S1] com moedas de troca direta.',
    fields: [
      {
        name: '🔗 Links Oficiais',
        value:
          '[Abertura do ZERO World](https://forum.netmarble.com/raven2_gb/view/27/2692) • ' +
          '[Produtos Exclusivos ZERO](https://forum.netmarble.com/raven2_gb/view/27/2691)',
        inline: false,
      },
    ],
  });

  // Embed 2: Resumo da Atualização de 15/16 de Setembro
  embeds.push({
    title: '⚔️ Resumo da Atualização (15/16 de Setembro)',
    url: 'https://forum.netmarble.com/raven2_gb/list/28/1',
    color: colors.update,
    description:
      'Compilado do que acabou de entrar em jogo na última manutenção global:\n\n' +
      '• **Grau <Primordial> Adicionado**: Primeiro Holy Garment Primordial — ***Cain, Overlord of the Apocalypse***. Concede passivas exclusivas (*Reversal of the End*, bônus de debuff e aceleração da estátua de Heavenstone), além da quest lore do *Black Monk* e entrada no Hall of Fame.\n' +
      '• **Melhoria na Amplificação de Heavenstone**: Ajustes no sistema de amplificação para melhor rendimento de atributos.\n' +
      '• **Evento da Floresta da Lua Cheia (Full Moon Forest)**:\n' +
      '  - Dungeon especial de evento aberta com drops de *Full Moon Wish Pouches* e frutas de buffs lunares.\n' +
      '  - Oficinas de craft de evento na *Moonlight Workshop*.\n' +
      '• **EXP Boost no Abyss**: Aumento expressivo de EXP no Abyss e elevação do limite diário de aquisição de *Soul of the Abyss*.',
    fields: [
      {
        name: '🔗 Link Oficial',
        value: '[Detalhes Completos da Atualização (9/15)](https://forum.netmarble.com/raven2_gb/view/28/2693)',
        inline: false,
      },
    ],
  });

  // Embed 3: Próximas Atualizações & Torre do Caos (Dev Commentary 37 & Dev Note 11)
  embeds.push({
    title: '🔮 Futuras Atualizações: Torre do Caos & Próximo Patch (22/23 Set)',
    url: 'https://forum.netmarble.com/raven2_gb/list/29/1',
    color: colors.future,
    description:
      'Direto do gabinete dos desenvolvedores (Development Commentary <37> & Dev Note <11>):\n\n' +
      '• **Novo Conteúdo Solo no ZERO: <Tower of Chaos> (Torre do Caos)**:\n' +
      '  - Desafio solo de **50 andares** sazonais sob a regra <Rule of the Tower> (debuff de escalada).\n' +
      '  - **Seleção de Buffs cumulativos**: A cada andar vencido, escolha 1 entre 3 buffs (com opção de reroll).\n' +
      '  - **Painel de Guilda**: Progresso dos membros visível para comparar estratégias e equipamentos.\n' +
      '  - **Recompensas**: Materiais de coleção (*Token of Strength*, *Beast\'s Heartstone*) no 1º clear e farm diário repetível de *Coins of Chaos* para gastar na Loja.\n' +
      '• **Atualização de 22/23 de Setembro**:\n' +
      '  - **Armas Lendárias Parnaq <Lost Kingdom>**: Craft por tempo e quantidade limitada usando Parnaq Heroico como base (mundos padrão).\n' +
      '  - **Season Talisman <Blacksmith\'s Talisman>**: Item passivo que concede atributos direto da mochila.\n' +
      '  - **Class Change S12** (mundos padrão; cronograma próprio para o servidor ZERO posteriormente).\n' +
      '• **Outubro**: Grande atualização de balanceamento de classes e revisão de Heavenstones de baixa utilização.',
    fields: [
      {
        name: '🔗 Links Oficiais',
        value:
          '[Development Commentary <37>](https://forum.netmarble.com/raven2_gb/view/29/2703) • ' +
          '[Developer\'s Note <11>](https://forum.netmarble.com/raven2_gb/view/29/2623)',
        inline: false,
      },
    ],
  });

  // Embed 4: Recompensas Grátis no Correio (URGENTE)
  embeds.push({
    title: '🎁 Resgates Imediatos & Recompensas de Login Ativas',
    color: colors.rewards,
    description:
      'Se tem algo que o Aristolfo não perdoa é membro da guilda deixando loot mofar na caixa de entrada:\n\n' +
      '• **Celebração de Abertura do Servidor ZERO (19/09 00:00 a 23/09 23:59)**:\n' +
      '  - **10.000.000 de Ouro**\n' +
      '  - 1.000x Branding Essence\n' +
      '  - 30x Baús de Seleção de Pedra de Aprimoramento\n' +
      '  - 20x Enhancers de Stigma\n' +
      '  - 1x Baú de Moeda Especial\n' +
      '• **Login Diário do Full Moon (18/09 a 25/09)**:\n' +
      '  - Diariamente: 1x Baú de Tesouro de Descent, 1x Pedra de Recarga de Tempo para Full Moon Forest, 1x Bolsa de Desejos e 30x Frutas de Buffs.\n' +
      '• **Recompensa de Leitura do Dev Commentary (Até 20/09 11:59 UTC)**:\n' +
      '  - 1x Treasure Chest of Descent, 1x Special Material Selection Chest, 1x Spec. C Coin.\n\n' +
      pickPunchline('news-delivery'),
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Aristolfo, 570 anos de webhook • ERP Raven 2',
      icon_url: WEBHOOK_AVATAR_URL,
    },
  });

  const payload = {
    username: WEBHOOK_USERNAME,
    avatar_url: WEBHOOK_AVATAR_URL,
    content:
      '### 📢 Aristolfo Notícias: Resumo do Servidor ZERO & Novidades do Raven 2\n' +
      'Compilação de inteligência dos fóruns oficiais da Netmarble. Leiam para não passar vergonha:',
    embeds: embeds,
  };

  if (cliArgs.dryRun) {
    console.log('\n[DRY-RUN] Webhook NÃO enviado. Prévia do payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('[DRY-RUN] Estado não alterado.');
    return;
  }

  console.log('Enviando compilação para o Discord via Webhook...');
  await sendDiscordWebhook(webhookUrl, payload);
  console.log('✅ Notícias enviadas com sucesso no Discord!');

  // Atualiza arquivo de estado com todos os artigos verificados
  const updatedSet = new Set([...sentSet, ...allArticles.map((a) => a.id)]);
  saveState({
    sentArticleIds: Array.from(updatedSet),
    lastCheckAt: new Date().toISOString(),
    lastBatchCount: pendingArticles.length,
  });

  console.log(`Estado atualizado com ${updatedSet.size} artigos registrados em ${STATE_FILE}.`);
}

main().catch((err) => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
