const APP_URL = 'https://app.guild-g3x.com.br';

function route(path) {
  return `${APP_URL}${path}`;
}

const tags = [
  { key: 'start', name: 'Comece aqui', emoji: '🧭' },
  { key: 'routine', name: 'Rotina', emoji: '📋' },
  { key: 'players', name: 'Players', emoji: '👥' },
  { key: 'events', name: 'Eventos', emoji: '⚔️' },
  { key: 'war', name: 'Operações', emoji: '🗺️' },
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

O ERP cobra cada player ativo em DM, uma vez por dia e de forma consolidada, quando houver build, função ou disponibilidade ausente, STATUS sem atualização há 21 dias ou presença abaixo de 50% nos bosses finalizados dos últimos 15 dias. Players sem boss elegível na janela não recebem sinal de presença baixa.

Use [Comparar players](${route('/dashboard/staff/compare')}) e [Fairness](${route('/dashboard/staff/fairness')}) como apoio. Nenhum score substitui regra, prova e decisão humana documentada.`,
  },
  {
    slug: 'staff-eventos-presenca', title: '03 · Eventos, presença, bosses em lote e prontidão', tag: 'events', route: '/dashboard/admin/events',
    visual: ['Revise RSVP, gaps e reserva', 'Controle séries e exceções', 'Finalize cada boss separado'],
    body: `## ⚔️ Operação de eventos
Na tela de [Eventos](${route('/dashboard/admin/events')}) crie eventos, registre presença e finalize a distribuição de DKP.

No evento selecionado, o painel de RSVP mostra **confirmados, talvez, recusas e sem resposta**, além da composição confirmada por classe, role e camada. A Staff vê as notas; para outros players, só aparece nota marcada pelo autor como pública.

Períodos de ausência cobrem automaticamente os eventos do intervalo. O painel mostra a quantidade indisponível e os detalhes para a Staff, sem enviar cobrança invasiva. Motivos são privados por padrão; players veem somente o total, salvo quando o autor escolhe compartilhar.

**Séries recorrentes:** configure primeiro horário, duração, intervalo semanal, timezone e exceções. O cron mantém o horizonte materializado. Pausar cancela as instâncias futuras da série; retomar restaura somente datas que não sejam exceção.

**Composição e reserva:** defina alvos mínimos por role/classe para medir cobertura e gaps, nunca para selecionar players automaticamente. Reserva exige ordem e motivo Staff-only. Ao oferecer vaga, o player precisa aceitar; só então o RSVP vira confirmado. O histórico da reserva e a auditoria permanecem. Conflitos aparecem no timezone cadastrado pelo membro.

**Lembretes e no-show:** nas 24h anteriores, o cron chama somente players sem resposta ou confirmados e respeita Web/Discord/ambos/nenhum para comunicação não crítica. Talvez, recusas, ausências e reservas não promovidas ficam fora. Ao finalizar, confirmado sem presença e sem ausência registrada vira contexto de no-show; o player pode justificar e a Staff vê o texto. Uma ocorrência isolada não pune, não altera DKP/elegibilidade e não cria risk flag automática.

RSVP é previsão operacional. Ele não marca presença, não concede DKP e não substitui a conferência real de cada boss.

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
    visual: ['Trate filas no prazo', 'Marque Codex uma única vez', 'Finalize no fluxo de origem'],
    body: `## 📚 Filas que pedem revisão
Requests aparecem nas tarefas operacionais e no perfil do player. Revise criação/atualização, posição, unidades restantes, prazo do print e prioridade de material. Craft T3 pode bloquear entrega de Quintessência do mesmo material; o bloqueio é regra auditada, não preferência improvisada.

Em [Codex Staff](${route('/dashboard/staff/codex')}) confira pedido e print, marque o envio com comprovante e aguarde o player confirmar sucesso ou falha. Um Codex já marcado como enviado não aceita novo envio: o player precisa confirmar ou pedir retry antes de outra tentativa. Cancelamento e retry usam o próprio fluxo.

Ao marcar como enviado, o ERP chama o player imediatamente em DM. Enquanto o pedido permanecer em **SENT**, a pendência entra também na cobrança diária até confirmação ou retry.

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
4. registre a nota inicial e confira o plano instanciado;
5. oriente regras, timezone, build, wishlist, presença, primeiro evento e canais.

Em [Onboarding Staff](${route('/dashboard/staff/onboarding')}) publique templates versionados com prazo e etapas obrigatórias/opcionais. Título e descrição de cada etapa exigem PT-BR/EN. Conversões futuras recebem um snapshot; publicar template novo não reescreve o plano de quem já entrou. Planos atrasados pedem acompanhamento humano, nunca punição automática.

Conversão é auditada e não deve ser repetida. Recrutamento bom termina com player orientado, não apenas com uma linha verde na fila.`,
  },
  {
    slug: 'staff-casos-recursos-privados', title: '14 · Casos, denúncias e recursos privados', tag: 'audit', route: '/dashboard/staff/cases',
    visual: ['Separe resposta de nota interna', 'Defina dono, prazo e status', 'Decisão disciplinar continua humana'],
    body: `## 🛡️ Caixa privada com trilha, não tribunal automático
Em [Casos e recursos](${route('/dashboard/staff/cases')}) trate dúvidas, denúncias operacionais e recursos. Revise fatos, classifique severidade, associe responsável Staff, defina prazo e mantenha status coerente.

**Separação obrigatória:** nota interna fica somente para Staff. Resposta ao player exige blocos PT-BR e EN e gera aviso privado. Novo contexto do player pode reabrir um caso resolvido; toda ação relevante fica no histórico e na auditoria.

Contestações de leilão aparecem como referência do fluxo nativo e continuam sendo revisadas no domínio do leilão. Não copie status, review ou evidência para um caso genérico.

Volume, severidade e atraso ajudam a organizar trabalho. Nenhum deles pune, expulsa ou decide disciplina automaticamente. Planilha com capa não vira juiz de raid.`,
  },
  {
    slug: 'staff-regras-dossies-integridade', title: '15 · Regras, dossiês, integridade e legado', tag: 'audit', route: '/dashboard/staff/integrity',
    visual: ['Consulte antes de decidir', 'Mude regras com contexto', 'Resolva vínculos legados com prova'],
    body: `## 🔎 Ferramentas de investigação
Em [Dossiê universal](${route('/dashboard/staff/dossier')}) consulte player, leilão, request, interesse, drop ou evento com resumo, links e audit logs. Use [Integridade](${route('/dashboard/staff/integrity')}) para inconsistências atuais e [Auditoria legada](${route('/dashboard/staff/legacy-audit')}) para importações ainda sem vínculo.

Em [Regras](${route('/dashboard/staff/rules')}) edite configurações que controlam comportamento real, incluindo elegibilidade de presença e modo manutenção. Leia valor atual, valide o formato e registre motivo/contexto.

**Política versionada:** BusinessRule muda a operação, mas não reescreve o documento vigente. Crie rascunho com título/resumo PT-BR e EN, defina vigência, atualize o snapshot e revise o drift. Publicar grava versão sequencial, autoria e diff; depois disso o snapshot fica imutável e qualquer mudança exige nova versão.

Se for emergência, marque o selo e informe um motivo objetivo. A publicação cria recibos e chama os players ativos. A cobertura mostra quantos abriram, quantos marcaram **Li e entendi** e os nomes de quem ainda não abriu quando houver necessidade operacional. Recibo é ciência, não aceite jurídico amplo; cobre comunicação, não obediência por algoritmo.

**Sequência segura:** diagnosticar → reunir evidência → escolher ação de domínio → confirmar impacto → verificar auditoria.

Não altere JSON por tentativa em produção. Chave de regra não é código de Konami; apertar tudo não libera final secreto.`,
  },
  {
    slug: 'staff-discord-comunicacao', title: '16 · Anúncios, Discord, webhooks e changelog', tag: 'comms', route: '/dashboard/staff/discord-templates',
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
    slug: 'staff-health-deploy', title: '17 · Saúde, deploy, smoke e rollback', tag: 'system', route: '/dashboard/staff/deploy',
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
  {
    slug: 'staff-trials', title: '19 · Trial com criterio visivel', tag: 'players', route: '/dashboard/staff/trials',
    visual: ['Publique criterios antes', 'Registre fatos em D7/D14/D30', 'Decida com motivo auditado'],
    body: `## Avaliacao transparente, sem score oculto
Em [Trials Staff](${route('/dashboard/staff/trials')}) publique inicio/fim, objetivo e criterios PT-BR/EN antes de avaliar o player.

Registre check-ins D7, D14 e D30 com texto bilingue visivel ao player. A nota interna possui campo separado e nunca aparece na resposta dele. Ausencias declaradas pausam o periodo e ajustam o fim exibido.

Aprovar, estender ou encerrar exige motivo PT-BR/EN e gera auditoria. O dominio nao cria score, nao pune automaticamente e nao altera loot, ranking, bids, locks ou sigilo. Criterio surpresa e boss invisivel: os dois so servem para dar wipe.`,
  },
  {
    slug: 'staff-mentoria', title: '20 · Mentoria voluntaria e acolhimento', tag: 'players', route: '/dashboard/staff/mentorship',
    visual: ['Use apenas voluntarios', 'Encaminhe ajuda por tema/role', 'Nunca exponha notas Staff'],
    body: `## Acolhimento com limite de poder
Em [Mentoria Staff](${route('/dashboard/staff/mentorship')}) associe somente um mentor que registrou consentimento/disponibilidade ou escolha um grupo de acolhimento.

Pedidos de ajuda entram por conteudo e role, sem depender de DM. Encaminhe ao voluntario adequado e resolva no ERP. Primeiro evento, boss, request, interesse e War Room sao marcos por data, nunca pontos.

Mentor nao recebe poder disciplinar nem acesso a notas Staff. Se o caso exige decisao ou registro sensivel, continua sendo trabalho da Staff no dominio correto.`,
  },
  {
    slug: 'staff-pulso-anonimo', title: '21 · Pulso anonimo e politica de dados', tag: 'players', route: '/dashboard/staff/pulse',
    visual: ['Defina grupo minimo', 'Nunca veja score individual', 'Modere e respeite a retencao'],
    body: `## Tendencia coletiva, nao vigilancia
Em [Pulso Staff](${route('/dashboard/staff/pulse')}) crie o ciclo em rascunho, configure abertura, fechamento, grupo minimo e retencao do texto. Revise antes de publicar.

A resposta numerica nao possui identidade. O recibo de participacao fica separado. Abaixo do grupo minimo, medias e comentarios continuam bloqueados; acima dele, a Staff recebe somente medias e texto anonimo para aprovar ou ocultar. Cron diario apaga texto vencido.

Pular nao gera consequencia. E proibido tentar reidentificar, criar score de lealdade ou usar o pulso para loot, DKP, acesso ou disciplina. Leia a politica de dados canonica antes de operar.`,
  },
  {
    slug: 'staff-saude-explicavel', title: '22 · Sinais de saude explicaveis', tag: 'players', route: '/dashboard/staff/guild-health',
    visual: ['Leia fato e janela', 'Converse antes de concluir', 'Nenhuma acao automatica'],
    body: `## Sinal e pergunta, nao sentenca
Em [Saude explicavel](${route('/dashboard/staff/guild-health')}) veja queda de participacao, onboarding parado, confirmacoes revertidas, retorno de inativo e coorte de classe pouco presente.

Cada card informa fatos, amostra e janela. Queda compara dois periodos de 15 dias; reversao de confirmacao vem do historico auditado; coorte exige ao menos tres ativos. Abra a evidencia e converse antes de concluir.

Nao existe score unico de churn/lealdade. O painel nao remove, bloqueia, pune nem altera loot. A recomendacao sempre e humana: acolher, perguntar, ajustar ou oferecer ajuda.`,
  },
  {
    slug: 'staff-saude-lideranca', title: '23 · Carga, plantao e cobertura da Staff', tag: 'routine', route: '/dashboard/staff/leadership-health',
    visual: ['Registre carga real', 'Identifique area sem backup', 'Delegue ou pause'],
    body: `## Guilda saudavel tambem precisa de Staff respirando
Em [Saude da lideranca](${route('/dashboard/staff/leadership-health')}) registre carga de 1 a 5 e disponibilidade de plantao por eventos, loot, recrutamento, Discord, deploy, tesouraria ou cuidado com players.

O painel usa o check-in mais recente e 14 dias de acoes auditadas para mostrar area sem substituto e trabalho concentrado. Alerta de carga alta recomenda delegar, reduzir escopo ou pausar. Nao e convite para cobrar ainda mais de quem ja esta segurando o boss nas costas.

Responsabilidade nao concede permissao, alerta nao escala sozinho e nenhum check-in vira avaliacao disciplinar.`,
  },
  {
    slug: 'staff-fila-handoff-roadmap', title: '24 · Fila, handoff e roadmap visivel', tag: 'routine', route: '/dashboard/staff/tasks',
    visual: ['Revise frentes e evidencias', 'Registre entrevistas sem identidade', 'Congele 4 semanas reais'],
    body: `## Trabalho visivel sobrevive ao logout do lider
Em [Fila Staff](${route('/dashboard/staff/tasks')}) registre area, prioridade, dono, substituto, prazo, estado e link direto para o objeto. Sugestoes do briefing, pauta e sinais nao criam nada sozinhas: revise e confirme a conversao.

No handoff, escreva contexto final e proximo passo antes de transferir o dono. A trilha fica auditada e a chave da origem impede duplicar a mesma sugestao.

Use o [Roadmap visivel](${route('/dashboard/staff/roadmap')}) para validar frentes, estado e evidencias. A Frente 0 so libera decisao depois dos tres perfis Staff, pelo menos cinco entrevistas cobrindo veterano/novato/ativo/baixa atividade, quatro semanas consecutivas congeladas e confirmacao de que RSVP reduz cobranca manual real.

Entrevista nao guarda nome nem conteudo privado de voz/DM: registre apenas perfil, canais acompanhados, visibilidade aceitavel de ausencia e sintese operacional. Na semana encerrada iniciada na segunda-feira, o ERP calcula eventos, presenca, no-shows, recruits com atividade e tarefas sem substituto; informe presenca esperada, quando conhecida, e minutos de cobranca. IMPLEMENTADO significa codigo local validado; producao e Centrais live continuam pendentes ate o protocolo completo.`,
  },
  {
    slug: 'staff-cobertura-areas', title: '25 · Areas, plantao e cobertura', tag: 'routine', route: '/dashboard/staff/coverage',
    visual: ['Defina primario e backup', 'Declare indisponibilidade', 'Nao confunda responsabilidade com permissao'],
    body: `## Cobertura declarada, sem adivinhar silencio
Em [Cobertura da Staff](${route('/dashboard/staff/coverage')}) configure responsavel primario, backup, janela de plantao e timezone para eventos, loot, recrutamento, Discord, deploy, tesouraria e cuidado com players.

Cada membro registra a propria indisponibilidade com inicio e fim. Durante esse periodo, o painel aponta o backup como responsavel efetivo. Fora dele, continua o primario. Silencio, demora ou ausencia de clique nunca aciona escalonamento automatico.

Responsabilidade operacional nao concede role, permissao nem acesso adicional. Se uma area ficar sem cobertura, redistribua ou reduza o plantao conscientemente; nao promova alguem no susto porque o boss piscou vermelho.`,
  },
  {
    slug: 'staff-automacao-segura', title: '26 · Automacao segura e kill switch', tag: 'routine', route: '/dashboard/staff/automations',
    visual: ['Exija padrao observado', 'Revise dry-run e confirme', 'Use limites e kill switch'],
    body: `## Automatize a rotina, nao a autoridade
Em [Automacoes seguras](${route('/dashboard/staff/automations')}) aparecem somente padroes com pelo menos tres tarefas concluidas nos ultimos 90 dias. Criar o dry-run salva a regra desligada e mostra exatamente qual tarefa seria criada.

Depois da revisao, uma confirmacao separada ativa a rotina. Frequencia minima, limite diario, chave idempotente e auditoria evitam spam e duplicacao. O kill switch desliga a regra imediatamente; libera-lo nao reativa a rotina sozinho.

A unica acao disponivel e criar tarefa Staff sem dono. Automacao nunca aprova loot, remove player, muda permissao ou altera politica social. Robo bom carrega checklist; martelo de ban continua na mao humana.`,
  },
  {
    slug: 'staff-playbooks-licoes', title: '27 · Playbooks, licoes e leitura por papel', tag: 'war', route: '/dashboard/staff/playbooks',
    visual: ['Publique versao imutavel', 'Decida a licao com dono e revisao', 'Anexe a versao exata'],
    body: `## Planejar, executar, aprender e reutilizar
Em [Playbooks Staff](${route('/dashboard/staff/playbooks')}) registre objetivo/brief PT-BR e EN, composicao, posicionamento, chamadas, riscos, links, checklist e instrucoes por papel. Notas Staff ficam em campo separado. Cada publicacao cria versao imutavel.

Anexe a versao escolhida ao evento ou War Room. O vinculo preserva o contexto usado mesmo quando surgir v2. No after-action, os sinais sao candidatos: a Staff decide **manter, testar ou descartar**, define dono e data de revisao. Manter/testar pode gerar nova versao com origem na operacao e na licao.

Players escalados recebem apenas o brief publico e o trecho do proprio papel. **Li minha funcao** e diferente de RSVP/presenca; a Staff enxerga lacunas de leitura sem expor nota interna. Estrategia sem versao vira lenda oral — e lenda oral costuma dar wipe.`,
  },
  {
    slug: 'staff-comunicacao-adaptativa', title: '28 · Comunicacao adaptativa e estado canonico', tag: 'comms', route: '/dashboard/communications',
    visual: ['Respeite canal e quiet hours', 'Agrupe no digest', 'Bot chama o mesmo dominio da Web'],
    body: `## Menos ping manual, sem criar dois bancos
Em [Comunicacao](${route('/dashboard/communications')}) cada membro configura canal por categoria, timezone, quiet hours, digest e teste. Defaults usam Web; alerta critico so fura silencio quando foi explicitamente classificado.

O digest diario/semanal agrupa notificacoes do proprio player por tipo e link canonico, preserva prazo quando existe e nao consulta dados de terceiros. Entrega possui chave por periodo para evitar duplicacao.

Os comandos /erp-rsvp, /erp-ausencia, /erp-instrucao e /erp-regra resolvem a conta Discord vinculada e chamam os mesmos servicos de dominio da Web. A resposta confirma o estado salvo e devolve a rota de revisao. Discord e controle remoto; o site continua sendo o console e a fonte de verdade.`,
  },
];

module.exports = { APP_URL, tags, posts };
