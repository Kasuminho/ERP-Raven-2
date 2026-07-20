const APP_URL = 'https://app.guild-g3x.com.br';

function route(path) {
  return `${APP_URL}${path}`;
}

const tags = [
  { key: 'start', name: 'Comece aqui', emoji: '🧭' },
  { key: 'routine', name: 'Rotina', emoji: '📋' },
  { key: 'players', name: 'Players', emoji: '👥' },
  { key: 'events', name: 'Eventos', emoji: '⚔️' },
  { key: 'loot', name: 'Loot', emoji: '💎' },
  { key: 'dkp', name: 'DKP', emoji: '🪙' },
  { key: 'guild', name: 'Guilda', emoji: '🏰' },
  { key: 'audit', name: 'Auditoria', emoji: '🔎' },
  { key: 'system', name: 'Sistema', emoji: '🖥️' },
  { key: 'comms', name: 'Comunicação', emoji: '📣' },
  { key: 'help', name: 'Ajuda', emoji: '🛟' },
];

const posts = [
  {
    slug: 'staff-comece-aqui', title: '00 · Comece aqui — mapa operacional da Staff', tag: 'start', route: '/dashboard/staff',
    visual: ['Abra o resumo matinal', 'Resolva por prioridade', 'Registre decisões no fluxo correto'],
    body: `## 🧭 Central oficial da Staff
Este fórum documenta a operação interna do ERP Raven 2. O conteúdo é **somente PT-BR** e pode incluir dados sensíveis visíveis apenas à Staff autorizada.

**Ordem recomendada do turno**
1. Abra a [Central Staff](${route('/dashboard/staff')}) e leia o resumo matinal.
2. Resolva urgências, reviews, entregas e eventos.
3. Audite decisões sensíveis antes de confirmar.
4. Use o fluxo próprio para registrar cada ação e gerar trilha de auditoria.
5. Só comunique mudança depois de confirmar o estado real.

Use as tags e o índice abaixo. Dúvidas operacionais podem ser respondidas nas threads, mas tokens, cookies, URLs completas de webhook, conteúdo de .env e comprovantes privados nunca entram aqui.

Aristolfo aceita pergunta repetida. Decisão sem registro, ele cobra com juros e log.`,
  },
  {
    slug: 'staff-central-rotina', title: '01 · Central, dia, reunião e relatórios', tag: 'routine', route: '/dashboard/staff',
    visual: ['Leia contadores e riscos', 'Copie a pauta da reunião', 'Feche ações com auditoria'],
    body: `## 📋 Rotina operacional
A [Central Staff](${route('/dashboard/staff')}) organiza ferramentas em **Resolver agora, Auditar, Configurar, Comunicar e Operar deploy**. O resumo matinal reúne urgências, leilões vencidos/próximos, reviews, entregas, integridade e saúde.

**Telas de rotina**
- [Dia](${route('/dashboard/staff/day')}): pendências e visão operacional atual.
- [Reunião](${route('/dashboard/staff/meeting')}): pauta decisória, Markdown copiável e marcação auditada de resolvido.
- [Temporada](${route('/dashboard/staff/season')}): fechamento mensal de DKP, presença, drops, requests e Daoshi.
- [Progresso da guild](${route('/dashboard/staff/guild-progress')}): relatório semanal/mensal com eventos, loot, War Room, riscos e próximas ações.

Comece pelos itens de prioridade alta. Ao concluir algo, use o botão/fluxo de domínio correspondente; marcar uma linha na pauta não substitui aprovar, entregar ou corrigir de verdade.`,
  },
  {
    slug: 'staff-players-roster', title: '02 · Players, membresia, roster e comparação', tag: 'players', route: '/dashboard/staff/players',
    visual: ['Confira identidade e status', 'Revise perfil de combate', 'Use comparação como apoio'],
    body: `## 👥 Gestão de players
Em [Players](${route('/dashboard/staff/players')}) consulte cadastro, atividade, retorno pendente e perfil operacional. O perfil individual reúne dados de presença, DKP, progresso, loot e filas relacionadas.

**Membresia**
- Desativar remove o player do roster ativo, chamadas e recálculos de presença.
- Novo login de inativo cria retorno pendente e mantém o acesso bloqueado.
- Reativar/liberar retorno exige decisão Staff e gera auditoria.
- A Staff não desativa o próprio player.

**Roster e perfil de combate:** revise função, disponibilidade, classe, camada e build. Mudanças pedidas pelo player entram em revisão; aprove ou rejeite com contexto.

Use [Comparar players](${route('/dashboard/staff/compare')}) e [Fairness](${route('/dashboard/staff/fairness')}) como apoio. Nenhum score substitui regra, prova e decisão humana documentada.`,
  },
  {
    slug: 'staff-eventos-presenca', title: '03 · Eventos, presença, bosses em lote e prontidão', tag: 'events', route: '/dashboard/admin/events',
    visual: ['Trate cada boss separado', 'Revise o checklist', 'Finalize e copie com cuidado'],
    body: `## ⚔️ Operação de eventos
Na tela de [Eventos](${route('/dashboard/admin/events')}) crie eventos, registre presença e finalize a distribuição de DKP.

**Regra central:** cada boss possui evento, presença e DKP independentes, mesmo em lote. O lote usa ordem e identificador comum, mas nunca transforma vários bosses em uma presença única.

**Antes de finalizar**
1. confira presentes e ausentes ativos;
2. revise DKP por pessoa e total previsto;
3. consulte prontidão por classe, camada, função, CP aprovado e STATUS recente;
4. confirme qual é o próximo boss ativo do lote;
5. decida conscientemente se a presença será copiada.

Eventos cancelados são pulados e presença já existente no próximo boss não é sobrescrita. STATUS ausente ou antigo aparece como risco. Nunca marque presença por suposição; memória de call não é banco transacional.`,
  },
  {
    slug: 'staff-dkp-economia', title: '04 · DKP, economia e simulações de política', tag: 'dkp', route: '/dashboard/staff/dkp',
    visual: ['Confira total, lock e disponível', 'Registre motivo objetivo', 'Simule antes de promover política'],
    body: `## 🪙 DKP com trilha auditável
Em [DKP](${route('/dashboard/staff/dkp')}) faça ajustes manuais somente quando não existir fluxo próprio. Use valor positivo, escolha adicionar/remover, confira o player e escreva motivo claro. Cada ajuste gera transação e auditoria.

DKP travado pertence ao ciclo do leilão. Não corrija lock manualmente para “desenroscar” uma decisão sem antes diagnosticar a origem.

Em [Economia](${route('/dashboard/staff/economy')}) acompanhe distribuição, mediana, concentração, atividade, locks e sinais de inflação/rotatividade. Simulações de decay e política de bid são read-only até serem salvas como rascunho.

Promover uma política de bid exige confirmação e motivo; a promoção publica regra operacional documentada. Simulação é laboratório. Produção é onde a planilha ganha dentes.`,
  },
  {
    slug: 'staff-leiloes-diagnostico', title: '05 · Leilões — simulador, diagnóstico e finalização', tag: 'loot', route: '/dashboard/staff/auction-diagnostics',
    visual: ['Selecione o leilão correto', 'Leia timeline e locks', 'Use a prévia antes de agir'],
    body: `## 🔨 Diagnóstico completo de leilão
Use o [Simulador](${route('/dashboard/staff/auction-simulator')}) para avaliar cenários sem alterar dados. No [Diagnóstico](${route('/dashboard/staff/auction-diagnostics')}) selecione o leilão por item, vencedor registrado e data.

Revise:
- motivo do estado atual;
- bids válidos/ignorados, locks e cancelamentos;
- ranking e candidato calculado;
- votos e alertas operacionais;
- transações, entrega e audit logs;
- prévia read-only de finalização;
- dossiê Markdown para discussão interna.

Na regra T4, rejeição/invalidacão sem candidato desce camadas até a 1. Só depois da falha na camada 1 o item vira relistado e volta à camada 4 conforme a janela vigente.

Dados de ranking, bids, locks e participantes permanecem Staff-only até o resultado/entrega seguro. Não cole raio-x em canal de player.`,
  },
  {
    slug: 'staff-reviews-cancelamentos', title: '06 · Reviews, alertas e cancelamentos de bid', tag: 'loot', route: '/dashboard/staff/reviews',
    visual: ['Leia os alertas assistidos', 'Vote com fundamento', 'Exija motivo em exceções'],
    body: `## 🛡️ Governança de resultado
Em [Reviews](${route('/dashboard/staff/reviews')}) analise candidato, elegibilidade, score, presença, divergência entre bid/lock e votos existentes. Alertas assistidos não decidem; eles mostram riscos antes da decisão humana.

**Ações sensíveis**
- Aprovar vencedor: confirme candidato, regra e quorum.
- Rejeitar resultado: registre justificativa objetiva.
- Invalidar/remover bid: use somente com fundamento verificável.
- Ignorar alerta: exige motivo e não aprova o vencedor sozinho.
- Reabrir/cancelar: confira impacto em locks, status e relist.

Em [Cancelamentos de bid](${route('/dashboard/staff/bid-cancellations')}) revise solicitações dentro do fluxo controlado. Não resolva por DM e depois tente reconstruir o motivo de cabeça. Primeiro evidência, depois botão, depois meme.`,
  },
  {
    slug: 'staff-entregas-drops', title: '07 · Entregas, drops e resultado público', tag: 'loot', route: '/dashboard/staff/deliveries',
    visual: ['Priorize atraso e urgência', 'Anexe a prova correta', 'Confirme o resultado seguro'],
    body: `## 📦 Fila de entregas
Em [Entregas](${route('/dashboard/staff/deliveries')}) priorize por atraso, hoje, ausência de prova, tier, player ou item. Cada pendência vem de um vencedor registrado ainda sem entrega correspondente.

**Antes de confirmar**
1. confira player e item;
2. valide a origem e o custo do leilão;
3. anexe prova legível da entrega real;
4. confirme somente uma vez;
5. verifique o registro em [Drops Staff](${route('/dashboard/staff/drops')}).

Depois da entrega de leilão com prova, o resultado bilíngue é publicado no Discord e no mural do site com apenas item, vencedor, horário e comprovante. Ranking, bids, locks e concorrentes não entram no anúncio.

Duplicar clique não duplica loot no jogo; só cria um belo incidente.`,
  },
  {
    slug: 'staff-interesses', title: '08 · Interesses, comparação e transmutar', tag: 'loot', route: '/dashboard/staff/interests',
    visual: ['Leia critério e interessados', 'Compare sinais operacionais', 'Entregue ao selecionado com prova'],
    body: `## 💎 Operação de interesses
Em [Interesses Staff](${route('/dashboard/staff/interests')}) acompanhe posts, declarações, votos, status e entrega. O comparador interno mostra classe, camada, presença, DKP, requests ativos, nota Staff, histórico de loot e sinais operacionais.

Use esses dados como suporte à regra do post; não invente critério depois de ver os nomes. O player não recebe o comparador nem a disputa interna.

**Transmutar:** quando todas as declarações do post usam transmutar, a votação Staff é dispensada e o sistema sorteia entre elegíveis, respeitando um vencedor por dia operacional de São Paulo.

Ao concluir, selecione o candidato permitido, anexe o comprovante e registre a entrega. A imagem prova a entrega; não prova retroativamente uma decisão mal fundamentada.`,
  },
  {
    slug: 'staff-requests-codex-progresso', title: '09 · Requests, Codex e progresso', tag: 'routine', route: '/dashboard/staff/codex',
    visual: ['Trate filas no prazo', 'Revise prints com critério', 'Finalize no fluxo de origem'],
    body: `## 📚 Filas que pedem revisão
Requests aparecem nas tarefas operacionais e no perfil do player. Revise criação/atualização, posição, unidades restantes, prazo do print e prioridade de material. Craft T3 pode bloquear entrega de Quintessência do mesmo material; o bloqueio é regra auditada, não preferência improvisada.

Em [Codex Staff](${route('/dashboard/staff/codex')}) confira pedido e print, marque o envio com comprovante e aguarde o player confirmar sucesso ou falha. Cancelamento e retry usam o próprio fluxo.

Em [Progresso](${route('/dashboard/staff/progress')}) revise prints:
- STATUS aprovado atualiza CP/level operacional;
- Fenda aprovada atualiza camada/andar;
- outras categorias alimentam o histórico;
- rejeição precisa de nota objetiva sobre o que faltou.

Print bonito não basta; ele precisa provar o campo que será alterado.`,
  },
  {
    slug: 'staff-daoshi', title: '10 · Daoshi — recibos, meta, cupons e sorteio', tag: 'guild', route: '/dashboard/staff/daoshi',
    visual: ['Confira comprovante e valor', 'Aprove ou rejeite com nota', 'Sorteie somente quando habilitado'],
    body: `## 🧾 Operação Daoshi
Em [Daoshi Staff](${route('/dashboard/staff/daoshi')}) revise recibos enviados pelos players, valores, datas e comprovantes. Aprove o valor confirmado ou rejeite com nota objetiva.

Somente compras aprovadas entram na meta e no saldo mensal do player. Os cupons são calculados pela soma aprovada segundo a regra vigente. O sorteio só fica disponível quando a meta coletiva foi atingida.

Antes de sortear:
1. confirme mês e total aprovado;
2. confira quantidade de cupons;
3. verifique se ainda não existe resultado;
4. execute uma vez e registre o vencedor;
5. comunique pelo canal previsto.

Comprovantes financeiros são privados. Nunca replique imagem ou dados do recibo neste fórum.`,
  },
  {
    slug: 'staff-war-room', title: '11 · War Room — operação, escala e pós-guerra', tag: 'events', route: '/dashboard/staff/war-room',
    visual: ['Defina objetivo e janela', 'Monte a escala explicável', 'Registre calls e resultado'],
    body: `## ⚔️ Central tática
Na [War Room](${route('/dashboard/staff/war-room')}) crie operações de Clash, Ancient Fortress, Abyss, Guild Raid ou tipo personalizado. Defina janela, prioridade, mapa/região, objetivo, instruções públicas e links internos.

Monte a escala com função tática, classe/camada esperadas e reservas. O dossiê cruza disponibilidade, STATUS, camada, classe, presença e conflitos de horário; sugestões apoiam a composição, mas não escalam automaticamente.

Durante a operação, use checklist e timeline para calls, notas e eventos táticos. Depois, encerre com resultado, placar livre, presença real e pontos de melhoria. O relatório pós-guerra compara planejado x realizado e gera Markdown.

Players veem somente a própria chamada e instruções públicas. Notas privadas e escala completa ficam na Staff.`,
  },
  {
    slug: 'staff-itens-wishlist-auditoria', title: '12 · Catálogo, wishlist, drops e auditoria de item', tag: 'audit', route: '/dashboard/admin/items',
    visual: ['Mantenha catálogo consistente', 'Leia demanda da wishlist', 'Audite origem e entrega'],
    body: `## 🗃️ Governança de itens
Em [Catálogo](${route('/dashboard/admin/items')}) crie e mantenha nomes, tier, tipo, imagens, flags e disponibilidade. Alteração de catálogo afeta leilões, interesses, requests e wishlist; revise antes de salvar.

Em [Wishlist Staff](${route('/dashboard/staff/wishlist')}) veja demanda agregada por item, prioridade, classe, camada e sinais operacionais. Marcar como atendida atualiza a wishlist com auditoria, mas não cria bid, interesse ou drop.

Use [Auditoria de item](${route('/dashboard/staff/item-audit')}) e [Auditoria do catálogo](${route('/dashboard/staff/item-audit/items')}) para cruzar entregas, origens, vencedores e vínculos. [Drops Staff](${route('/dashboard/staff/drops')}) mostra o histórico consolidado.

Correção manual exige motivo claro. “Era óbvio” não sobrevive ao próximo mês.`,
  },
  {
    slug: 'staff-recrutamento', title: '13 · Recrutamento e entrada de novos players', tag: 'players', route: '/dashboard/staff/recruitment',
    visual: ['Revise candidatura completa', 'Atualize o status', 'Converta com perfil inicial correto'],
    body: `## 🤝 Fila de recrutamento
Em [Recrutamento](${route('/dashboard/staff/recruitment')}) acompanhe candidaturas recebidas pelo site público, dados de jogo, disponibilidade e andamento da conversa.

Use os status para separar novo, em análise, contato, aprovado, rejeitado ou convertido. Registre notas úteis sem inserir dados pessoais desnecessários.

Ao converter uma candidatura aprovada:
1. confirme identidade Discord;
2. revise nickname, classe e camada iniciais;
3. crie/vincule o player uma única vez;
4. confira o checklist de onboarding;
5. oriente STATUS, Fenda, timezone e perfil de combate.

Conversão é auditada e não deve ser repetida. Recrutamento bom termina com player orientado, não apenas com uma linha verde na fila.`,
  },
  {
    slug: 'staff-regras-dossies-integridade', title: '14 · Regras, dossiês, integridade e legado', tag: 'audit', route: '/dashboard/staff/integrity',
    visual: ['Consulte antes de decidir', 'Mude regras com contexto', 'Resolva vínculos legados com prova'],
    body: `## 🔎 Ferramentas de investigação
Em [Dossiê universal](${route('/dashboard/staff/dossier')}) consulte player, leilão, request, interesse, drop ou evento com resumo, links e audit logs. Use [Integridade](${route('/dashboard/staff/integrity')}) para inconsistências atuais e [Auditoria legada](${route('/dashboard/staff/legacy-audit')}) para importações ainda sem vínculo.

Em [Regras](${route('/dashboard/staff/rules')}) edite configurações que controlam comportamento real, incluindo elegibilidade de presença e modo manutenção. Leia valor atual, valide o formato e registre motivo/contexto.

**Sequência segura:** diagnosticar → reunir evidência → escolher ação de domínio → confirmar impacto → verificar auditoria.

Não altere JSON por tentativa em produção. Chave de regra não é código de Konami; apertar tudo não libera final secreto.`,
  },
  {
    slug: 'staff-discord-comunicacao', title: '15 · Anúncios, Discord, webhooks e changelog', tag: 'comms', route: '/dashboard/staff/discord-templates',
    visual: ['Faça preview do payload', 'Preserve idioma e sigilo', 'Envie changelog após produção'],
    body: `## 📣 Comunicação operacional
Em [Anúncios](${route('/dashboard/admin/announcements')}) crie avisos com tipo, título, descrição, horário e menção somente quando necessária. Anúncio não substitui evento/presença.

Use [Templates Discord](${route('/dashboard/staff/discord-templates')}) para revisar payloads sanitizados antes do envio e [Fila de webhooks](${route('/dashboard/staff/discord-webhooks')}) para status, tentativas, erro resumido e retry de falhas elegíveis.

**Regras fixas**
- Staff-only: somente PT-BR.
- Players: PT-BR e EN em blocos separados.
- Identidade: Aristolfo, 570 anos de webhook.
- Clareza antes da piada; nada de dado sigiloso.
- URL completa de webhook nunca aparece em post, wiki ou print.

Changelog Staff só é enviado depois da verificação de produção. Retry usa a chave lógica no servidor e nunca expõe o segredo.`,
  },
  {
    slug: 'staff-health-deploy', title: '16 · Saúde, deploy, smoke e rollback', tag: 'system', route: '/dashboard/staff/deploy',
    visual: ['Confira versão esperada', 'Leia health e smoke', 'Comunique somente após validar'],
    body: `## 🚀 Operação de produção
Em [Deploy](${route('/dashboard/staff/deploy')}) compare versão atual/esperada, workflow, smoke público, recibo de changelog e sinais da fila de webhooks. Em [Saúde](${route('/dashboard/staff/health')}) confira banco, storage, webhooks, automação, backup, rate limit e falhas recentes.

O smoke público exige **/health** com a versão esperada. Checks de módulos ajudam no diagnóstico. Challenge de borda/WAF é classificado separadamente de falha real da API.

**Protocolo:** validar → commit/push autorizado → Actions → Watchtower → sinal específico em produção → changelog Staff.

Se o deploy falhar, preserve logs, identifique a etapa e use o rollback/runbook correto. Não anuncie sucesso porque o ícone ficou verde por três segundos; produção adora jumpscare.`,
  },
  {
    slug: 'staff-seguranca-boas-praticas', title: '17 · Segurança, sigilo e checklist de decisão', tag: 'help', route: '/dashboard/staff',
    visual: ['Proteja segredos e provas', 'Use o botão do domínio', 'Verifique o estado final'],
    body: `## 🛟 Checklist antes de qualquer ação sensível
1. confirme ambiente, player/item/evento e estado atual;
2. consulte regra, timeline, dossiê ou comparador aplicável;
3. revise impacto em DKP, lock, presença, entrega e comunicação;
4. escreva motivo objetivo;
5. confirme uma vez e verifique o resultado/auditoria.

**Nunca publique:** token, cookie, senha, QR de login, conteúdo de .env, URL completa de webhook, comprovante financeiro ou dado pessoal desnecessário.

Ranking, bids, locks e participantes podem ser consultados por Staff autorizada, mas permanecem proibidos em canais de player até a divulgação segura prevista pelo sistema.

Não use ajuste manual para corrigir fluxo que possui botão próprio. Não aprove print inconclusivo. Não resolva exceção por DM sem registrar. Aristolfo pode improvisar a punchline; a Staff não improvisa trilha de auditoria.`,
  },
  {
    slug: 'staff-vendas-diamantes', title: '18 · Vendas por diamantes e partilha', tag: 'loot', route: '/dashboard/staff/diamond-sales',
    visual: ['Habilite o item no catálogo', 'Congele os ativos e confira a divisão', 'Anexe cada prova até publicar'],
    body: `## 💎 Venda de item e partilha
Em [Vendas por diamantes](${route('/dashboard/staff/diamond-sales')}) a Staff registra itens vendidos para compradores da guilda ou externos e acompanha a divisão completa.

**Antes de abrir**
1. em [Catálogo](${route('/dashboard/admin/items')}), habilite somente os itens autorizados para venda por diamantes;
2. selecione o item e informe se o comprador é da guilda ou externo;
3. para comprador interno, vincule o player — ele será excluído automaticamente da partilha;
4. informe onde os diamantes estão, o total inteiro e anexe separadamente o print do item e a prova da venda;
5. escolha todos os ativos ou todos os ativos exceto os players marcados.

Ao confirmar, a lista de players ativos fica congelada. Entradas, saídas ou mudanças de atividade posteriores não alteram aquela partilha. O sistema divide com arredondamento para baixo e registra a sobra separadamente.

**Entrega individual:** confira nome e valor, anexe a prova de envio e registre uma única vez. Depois da última prova, a partilha é concluída e o Aristolfo publica no canal de entregas os nomes e todas as provas em PT-BR/EN. Se o Discord falhar, use a republicação exibida na própria venda.

Diamante sem prova é só fanfic premium com brilho azul.`,
  },
];

module.exports = { APP_URL, tags, posts };
