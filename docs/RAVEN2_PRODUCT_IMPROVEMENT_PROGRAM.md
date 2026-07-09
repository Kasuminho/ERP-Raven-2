# Programa completo de melhorias Raven2

Documento vivo para transformar as ideias de produto em implementacao rastreavel.
O objetivo nao e listar desejos soltos, e sim definir entregas completas para a
guilda operar melhor DKP, loot, presenca, progresso, comunicacao, deploy e
incidentes.

Este trabalho e interno do produto. Mudancas publicadas para a operacao G3X ainda
seguem o protocolo normal: validar, publicar, verificar producao e so entao enviar
changelog Staff quando houver impacto operacional.

## Contexto do jogo e direcao de produto

Raven 2 e um MMORPG centrado em progressao persistente, boss fights, craft,
conteudo de guilda, Abyss/Rift, dungeons, Field Bosses, Guild Dungeon, PvP/GvG e
preparacao por classe/equipamento. A propria documentacao oficial lista sistemas
como Guild, Rankings, Market, Personal Trade, Craft, Field Bosses, Rift, Abyss,
Ancient Fortress, Dimensional Rift, Transmute, Rune, Relic, Stigmas, Stellas e
Equipment.

Implicacao para o ERP:

- o Raven2 nao deve ser apenas livro-caixa de DKP;
- a Staff precisa enxergar prontidao, risco, prioridade e historico operacional;
- players precisam saber qual acao ajuda a propria conta e a guilda agora;
- leiloes, interesses, requests, progresso e presenca precisam formar uma historia
  unica do item/player;
- o sistema deve reduzir ambiguidade, favoritismo percebido e retrabalho no Discord.

Referencias consultadas em 2026-06-29:

- Guia oficial Netmarble de Raven 2, especialmente sistemas de progressao e
  conteudo como Guild Dungeon, Guild, Rankings, PvP, Market, Craft, Field Bosses,
  Rift, Abyss, Ancient Fortress, Dimensional Rift, Transmute, Rune e Relic:
  `https://guide.netmarble.com/raven2`
- Entrevista sobre o lancamento ocidental destacando guerra de guilda, conteudo
  cooperativo pequeno e conteudo massivo de guilda/GvG:
  `https://massivelyop.com/2025/10/27/interview-raven2-boss-doo-hyun-cho-on-the-western-launch-of-netmarbles-grimdark-fantasy-mmorpg/`
- Guia BlueStacks de Raven 2 sobre progressao, economia, bosses, recursos e
  rotina de crescimento:
  `https://www.bluestacks.com/blog/game-guides/raven-2/rvn2-beginners-guide-en.html`

## Principios de implementacao

- Sigilo de leilao continua absoluto para players ate resultado/entrega.
- Conteudo Staff permanece PT-BR.
- Conteudo player permanece PT-BR/EN em blocos separados quando virar webhook.
- Toda decisao sensivel precisa de rastro auditavel.
- Primeiro mostrar contexto, depois pedir confirmacao.
- Toda tela operacional deve responder: o que aconteceu, o que falta, quem esta
  bloqueado, qual o proximo passo.
- Preferir endpoints Staff especificos para payloads sensiveis, sem aumentar
  payload publico.
- Reaproveitar `operations`, `audit`, `search`, `business-rules` e React Query,
  mas separar dominios quando o arquivo crescer demais.

## Epico A - Leiloes com timeline, simulacao e dossie

### A1. Timeline de leilao

Objetivo: transformar dados dispersos em historia operacional.

Entrega:

- Endpoint Staff de timeline por leilao.
- Component `AuctionTimeline`.
- Exibir na tela de detalhes Staff e no diagnostico Staff.
- Eventos minimos:
  - criado;
  - abriu/reabriu;
  - bid registrado;
  - lock criado;
  - cancelamento solicitado/aprovado/rejeitado;
  - invalidacao de bid;
  - fim planejado;
  - automacao processou;
  - review iniciado;
  - voto Staff;
  - vencedor aprovado;
  - relist/camada expandida;
  - `AUCTION_WIN` criado;
  - lock liberado;
  - entrega registrada.
- Cada evento deve ter horario, ator quando houver, resumo, alvo e link interno.

Validacao:

- teste unitario para ordenacao e mapeamento;
- smoke manual com leilao `OPEN`, `PENDING_REVIEW`, `FINISHED` e `RELISTED`.

### A2. Motivo visual do estado

Objetivo: explicar por que o leilao esta em determinado status.

Estado em 2026-07-02: o raio-x Staff completo do diagnostico, incluindo
`stateReason`, contadores, issues, bids, locks, votos e audit logs, e calculado
em `AuctionDiagnosticsService`; a previa de finalizacao tambem ja saiu do legado,
e o dossie Staff especifico de leilao tambem ja e montado no dominio.

Entrega:

- Campo calculado `stateReason` em endpoint Staff:
  - `OPEN`: ainda nao venceu, venceu e aguarda automacao, ou reaberto;
  - `PENDING_REVIEW`: modo exige Staff, ALL_IN, quorum, ou decisao manual;
  - `FINISHED`: vencedor e transacao encontrados;
  - `RELISTED`: sem vencedor apto apos regra de camada;
  - `CANCELLED`: cancelado manualmente.
- UI com badge e texto curto.
- No diagnostico, mostrar a regra usada para chegar ali.

### A3. Previa de finalizacao

Objetivo: permitir que a Staff simule o fechamento sem executar.

Estado em 2026-07-02: implementado no diagnostico Staff de leilao e calculado
em `AuctionDiagnosticsService`, sem delegar ao `OperationsService` legado.

Entrega:

- Endpoint Staff `GET /operations/staff/auction-diagnostics/:id/finalization-preview`.
- Retornar:
  - acao provavel: finalizar, review, expandir camada, relistar, nenhuma;
  - candidato vencedor quando autorizado;
  - locks que seriam consumidos ou liberados;
  - bids desconsiderados e motivo;
  - regra de camada T4 aplicada;
  - riscos encontrados.
- UI no diagnostico com acao prevista, candidato, proximo estado, locks,
  bids ignorados e riscos.
- A regra T4 do diagnostico acompanha a ordem real da finalizacao: quando a
  camada minima atual e maior que 1 e nao ha bid apto nessa camada, a previa
  indica expansao de camada antes de relist.

Validacao:

- cobrir STANDARD, ALL_IN, T4 com camada minima, sem bids, bids sem lock e review.

### A4. Fila de entrega com urgencia

Objetivo: impedir drop vencido esquecido.

Estado em 2026-07-02: implementado em `/dashboard/staff/deliveries` e no
endpoint Staff `GET /drops/pending-auction-deliveries`, com urgencia, idade,
prazo e motivo operacional por entrega pendente.

Entrega:

- Enriquecer entregas pendentes com idade, prioridade e motivo.
- Filtro Staff: hoje, atrasado, sem prova, por player, por tier.
- Mostrar no dashboard Staff e meeting.
- Changelog Staff quando publicar.
- O endpoint preserva `auction`, `player` e `transaction` e adiciona `urgency`,
  `ageHours`, `deliveryDueAt` e `priorityReason`.
- A tela Staff mostra contadores, filtros `Todos`, `Atrasados`, `Hoje` e
  `Sem prova`, busca por player/item, filtro por tier, badges de urgencia,
  prazo e status da prova.
- O dashboard Staff e o modo reuniao continuam recebendo a tarefa
  `DROP_DELIVERY`, agora com idade e motivo de prioridade no metadata.

### A5. Dossie de leilao

Objetivo: resolver treta de loot sem abrir 8 abas.

Estado em 2026-07-02: implementado no diagnostico Staff de leilao e montado em
`AuctionDiagnosticsService`, combinando diagnostico, previa, timeline e Markdown;
o dossie universal Staff do tipo `auction` tambem reaproveita esse dominio. O
servico de diagnostico de leilao nao injeta mais o `OperationsService` legado.

Entrega:

- Endpoint Staff `GET /operations/staff/auction-diagnostics/:id/dossier`.
- Card "Dossie Staff" no diagnostico com Markdown copiavel.
- Payload com timeline, issues, bids Staff-only, locks, votos, AUCTION_WIN, entrega,
  audit logs e links.
- UI copiavel em Markdown Staff-only.
- Nunca expor em rota player.

## Epico B - Central Staff orientada por jornada

### B1. Reorganizar hub Staff por trabalho

Objetivo: Staff pensa em tarefa, nao modulo.

Estado em 2026-07-02: implementado em `/dashboard/staff` com abas de jornada,
contadores e proximas acoes por grupo.

Entrega:

- Manter cards atuais, mas agrupar em abas ou secoes:
  - Resolver agora;
  - Auditar;
  - Configurar;
  - Comunicar;
  - Operar deploy.
- Cada grupo mostra contadores e proximas acoes.
- As abas filtram os cards existentes sem remover rotas e usam tarefas do resumo
  Staff/resumo matinal para listar ate quatro proximas acoes contextualizadas.

### B2. Resumo matinal Staff

Objetivo: abrir o dia da guilda com prioridade clara.

Estado em 2026-06-29: implementado no topo da central Staff.

Entrega:

- Endpoint `GET /operations/staff/morning-briefing`.
- Dados:
  - leiloes vencidos/perto de vencer;
  - reviews pendentes;
  - entregas pendentes;
  - progressos aguardando;
  - eventos abertos;
  - requests urgentes;
  - interesses fechados/votando;
  - anomalias de locks/DKP;
  - saude de webhooks.
- Tela Staff com resumo, contadores, secoes acionaveis e copia Markdown para
  pauta/changelog interno manual.

### B3. Modo reuniao completo

Objetivo: transformar `/dashboard/staff/meeting` em pauta decisoria.

Estado em 2026-07-02: implementado com secoes decisorias, export Markdown e
marcacao auditavel de item resolvido por dia operacional.

Entrega:

- Pauta com secoes:
  - Decisoes de loot;
  - Pendencias travadas;
  - Economia DKP;
  - Players sensiveis;
  - Progresso de boss/lote;
  - Comunicados a preparar;
  - Acoes ate proxima reuniao.
- Itens marcaveis como resolvidos com audit log.
- Exportar resumo Staff em Markdown.
- A API preserva o contrato antigo e adiciona `sections`, `meetingDay`,
  `resolvedItemKeys` e `markdown`; a rota
  `POST /operations/staff/meeting/items/:itemKey/resolve` grava
  `STAFF_MEETING_ITEM_RESOLVED` em audit log.

## Epico C - Dashboard player: "o que eu faco agora?"

### C1. Cards acionaveis

Objetivo: o player entrar e saber a melhor acao.

Estado em 2026-06-29: implementado no dashboard do player.

Entrega:

- Endpoint `GET /operations/me/action-plan`.
- Cards:
  - bid ativo e DKP travado;
  - leilao que pode participar;
  - interesse aberto sem declaracao;
  - request precisando print;
  - progresso comentado pela Staff;
  - entrega ou codex aguardando confirmacao;
  - evento proximo.
- Cada card tem `href`, prioridade e motivo.
- Cada card tambem mostra impacto esperado e acao direta, sem expor ranking,
  bids ou concorrentes de outros players.

### C2. Elegibilidade antes do bid

Objetivo: reduzir duvida e reclamacao.

Estado em 2026-06-29: implementado na pagina do leilao para players.

Entrega:

- Na pagina do leilao, antes do bid:
  - pode participar;
  - motivo de inelegibilidade;
  - camada exigida;
  - DKP disponivel;
  - attendance considerada;
  - Staff Review obrigatorio quando aplicavel.
- Para players, nunca mostrar ranking nem concorrentes.
- Endpoint de elegibilidade do proprio player retorna os campos operacionais
  necessarios para o painel sem expor outros participantes.

### C3. Historico pessoal narrado

Objetivo: trocar extrato frio por narrativa compreensivel.

Estado em 2026-06-29: implementado em `/dashboard/timeline`.

Entrega:

- Feed pessoal com DKP, drops, bids, locks, progresso, codex e requests.
- Filtros por tipo e periodo.
- Textos PT-BR/EN na UI conforme locale.
- `GET /players/me/history` manteve o payload historico e passou a enriquecer
  `timeline` com `titleEn`, `descriptionEn`, `tone`, `href` e metadados seguros.
- Eventos de leilao no feed do player continuam limitados ao proprio bid e ao
  status do leilao, sem ranking, concorrentes, locks de terceiros ou identidade
  de outros participantes.

## Epico D - Requests e craft com previsao operacional

### D1. Previsao de fila

Objetivo: mostrar expectativa e reduzir pergunta no Discord.

Estado em 2026-06-29: implementado em `/dashboard/item-requests`.

Entrega:

- Para cada request:
  - posicao;
  - quantas entregas faltam antes;
  - ultima entrega desse item/material;
  - idade da propria atualizacao;
  - se precisa print novo.
- Staff ve fila completa; player ve propria posicao e explicacao sem dados
  indevidos.
- Os endpoints existentes de item request continuam compativeis e agora retornam
  `queueForecast` calculado com posicao, tamanho da fila, pedidos/unidades antes,
  idade do update, ultima entrega conhecida, estagio do update e resumo PT-BR/EN.
- A previsao usa a fila atual e `DropHistory`; nao cria promessa automatica de
  entrega nem muda a ordenacao/entrega existente.

### D2. Sugestao de troca

Objetivo: ajudar progressao da guilda quando uma fila esta congestionada.

Estado em 2026-06-29: implementado em `/dashboard/item-requests`.

Entrega:

- Sugerir itens requestaveis alternativos do mesmo tipo/tier/categoria.
- Mostrar trade-off: fila menor, menos prioridade, falta material, etc.
- Somente sugestao; troca continua fluxo controlado.
- Os endpoints existentes de item request agora retornam `swapSuggestions`
  quando houver alternativas requestaveis ativas comparaveis com fila menor.
- A UI mostra ate tres alternativas com posicao estimada, unidades na fila e
  trade-off PT-BR/EN, sem acao automatica de troca.

### D3. Transparencia da prioridade T3

Objetivo: explicar quando Quintessencia perde prioridade para craft T3.

Estado em 2026-06-29: implementado em `/dashboard/item-requests`.

Entrega:

- Badge em request afetado por prioridade de material.
- Texto operacional Staff e texto player simplificado.
- Audit log quando prioridade impactar ordenacao/entrega.
- Os endpoints existentes de Item Request retornam `materialPriority`, calculado
  a partir da fila ativa e do catalogo do item.
- Requests de craft T3 aparecem com selo de prioridade operacional.
- Requests de Quintessencia afetados por craft T3 do mesmo material inferido
  exibem aviso para player e texto detalhado para Staff.
- A entrega Staff de um request de Quintessencia bloqueado pela prioridade T3 e
  impedida com audit log `ITEM_REQUEST_T3_PRIORITY_DELIVERY_BLOCKED`.

## Epico E - Interesses com decisao comparavel

### E1. Comparador Staff dos interessados

Objetivo: reduzir decisao por feeling.

Estado em 2026-06-29: implementado em `/dashboard/staff/interests`.

Entrega:

- Na tela Staff de interesses, comparar:
  - camada;
  - classe;
  - presenca;
  - DKP atual;
  - ultimo drop;
  - requests ativos;
  - notas Staff relevantes;
  - historico recente do item/tipo.
- Sem expor essa comparacao para players.
- Endpoint Staff-only `GET /item-interests/staff/list` retorna `staffComparison`
  por interessado, com classe, camada, presenca, DKP total/travado/disponivel,
  requests ativos, ultima nota Staff, historico de loot e sinais operacionais.
- A tela Staff mostra uma tabela comparativa por post antes dos cards de voto,
  mantendo a declaracao de player no endpoint normal sem o comparador sensivel.

### E2. Declaracao de interesse em lote

Objetivo: facilitar quando varios itens parecidos abrem juntos.

Estado em 2026-06-29: implementado em `/dashboard/interests`.

Entrega:

- Tela player para declarar interesse em multiplos posts abertos.
- Permitir print por item quando necessario.
- Confirmacao unica com resumo.
- Manter validacoes atuais de cada interesse.
- O lote usa o endpoint existente de declaracao, enviando cada post
  individualmente para preservar as validacoes atuais de post aberto, player
  principal, duplicidade e print/transmutar.
- Cada card continua com nota, print ou transmutar proprio; o painel superior
  seleciona itens prontos, aponta pendencias e confirma todos juntos.

## Epico F - Eventos, presenca e lote de bosses

### F1. Checklist de finalizacao de evento

Objetivo: evitar finalize errado.

Estado em 2026-06-29: implementado em `/dashboard/admin/events` com endpoint
Staff-only `GET /events/:id/finalization-checklist`.

Entrega:

- Modal antes de finalizar:
  - presentes;
  - ausentes;
  - DKP por pessoa;
  - DKP total;
  - boss atual;
  - proximo boss do lote;
  - se copiara presenca;
  - alertas de presenca incomum.
- O checklist usa a mesma regra de proximo boss da finalizacao real: copia para
  o proximo evento ativo do lote quando ele ainda nao possui presenca; se ja
  tiver chamada, mostra aviso e nao sobrescreve.
- A modal mostra listas de presentes e ausentes ativos com classe/camada,
  totais de DKP, status da copia e avisos de baixa presenca, evento futuro,
  evento encerrado/cancelado ou ultimo boss do lote.

### F2. Painel visual de lote

Objetivo: operar `BOSSES T4` como trilha, nao como eventos soltos.

Estado em 2026-07-01: implementado em `/dashboard/admin/events` com endpoint
Staff-only `GET /events/batches/:batchId`.

Entrega:

- Tela Staff por `attendanceBatchId`.
- Mostrar ordem, status, presenca, DKP distribuido, proximo boss, cancelados e
  eventos pulados.
- Acao direta para abrir/finalizar o proximo evento.
- O painel aparece ao selecionar qualquer evento com `attendanceBatchId`, mostra
  progresso do lote, total de DKP ja distribuido, eventos pendentes/cancelados,
  presenca por boss e destaca o proximo evento ativo.
- A acao principal seleciona o proximo boss quando ele ainda nao esta aberto na
  tela; quando ele ja esta selecionado e possui presenca, abre a finalizacao.

### F3. Prontidao de boss/guilda

Objetivo: conectar progressao do player ao que a guilda vai fazer.

Estado em 2026-07-01: implementado em `/dashboard/admin/events` com endpoint
Staff-only `GET /events/:id/readiness`.

Entrega:

- Visao Staff por evento/boss:
  - jogadores ativos por camada;
  - classes presentes;
  - CP informado/aprovado;
  - gaps de healer/tank/DPS por classe;
  - players sem status recente.
- Nao automatizar decisao de composicao; apenas informar.
- A prontidao cruza presenca do evento com players ativos, CP/camada aprovados
  no perfil e ultimo progresso `STATUS`; STATUS com mais de 14 dias ou ausente
  aparece como desatualizado.
- Roles operacionais: `VANGUARD` como tank, `DIVINE_CASTER` como healer,
  `DEATHBRINGER` como suporte/off-heal e demais classes como DPS.

## Epico G - Discord e comunicacao operacional

### G1. Previa real de webhook

Objetivo: ver antes de postar.

Estado em 2026-07-01: implementado em `/dashboard/staff/discord-templates`
via `GET /operations/staff/discord-templates`.

Entrega:

- Preview de embeds para anuncios, leiloes, interesses, drops e updates.
- Mostrar blocos PT-BR/EN quando player-facing.
- Usar mesmo builder de embeds ou payload equivalente.
- O endpoint retorna payload sanitizado com `username`, `avatar_url`, `content`,
  `embeds` e `allowed_mentions`, sem expor URL de webhook.
- Templates player-facing mostram previews PT-BR e EN lado a lado; Staff-only
  mostra apenas PT-BR.

### G2. Fila de webhooks

Objetivo: auditar falhas sem entrar em log.

Estado em 2026-07-01: implementado em `/dashboard/staff/discord-webhooks`
via `GET /operations/staff/discord-webhooks` e
`POST /operations/staff/discord-webhooks/:deliveryId/retry`.

Entrega:

- Tela Staff com ultimos envios, status, retry, canal/logical target, erro
  resumido e payload seguro.
- Nunca mostrar URL de webhook.
- Acao para reenviar apenas quando idempotente/seguro.
- A fila persiste `DiscordWebhookDelivery` com `webhookKey`, canal logico,
  action, target, tentativas, payload sanitizado, erro resumido e datas de
  fila/envio/falha/retry.
- O retry manual so aceita entregas `FAILED` e `retryable`, buscando a URL pelo
  `webhookKey` configurado no servidor sem expor segredo na API ou na Web.

### G3. Atualizar guias funcionais

Objetivo: remover drift documental.

Estado em 2026-07-01: implementado com `docs/staff-guide-current.md` e
`docs/player-guide-current.md`; os guias de 2026-06-04 foram marcados como
historicos.

Entrega:

- Reescrever guias Staff/player atuais com encoding correto.
- Remover espanhol dos guias operacionais correntes se nao for mais lingua ativa
  de comunicacao.
- Corrigir identidade de webhook para `Aristolfo, 570 anos de webhook`.
- Separar guias historicos de guias atuais.
- Guia Staff atual fica somente PT-BR.
- Guia player atual fica em blocos separados PT-BR e EN.

## Epico H - Auditoria e incidentes

### H1. Dossie universal

Objetivo: qualquer entidade sensivel gerar contexto auditavel.

Estado em 2026-07-01: implementado em `/dashboard/staff/dossier` via
`GET /operations/staff/dossiers/:type/:id`.

Entrega:

- Dossie para player, leilao, request, interesse, drop e evento.
- Markdown copiavel Staff-only.
- Links internos e audit logs.
- Sem segredo, sem webhook URL, sem payload privado desnecessario.
- Tipos suportados: `player`, `auction`, `request`, `interest`, `drop`,
  `event`.
- Leiloes reaproveitam o dossie operacional existente e o formato universal
  adiciona resumo, links internos e audit logs.

### H2. Modo manutencao

Objetivo: bloquear escrita sensivel durante restore/incidente.

Estado em 2026-07-01: implementado por regra `maintenanceMode`, guard global
de mutacoes sensiveis e banner no layout autenticado.

Entrega:

- Regra/config `maintenanceMode`.
- Bloquear mutacoes sensiveis: bids, finalizacao, entrega, ajustes DKP,
  progresso, requests, anuncios.
- Permitir leitura e health.
- Banner claro na Web.
- Audit log ao ativar/desativar.
- `PATCH /business-rules/maintenanceMode` continua liberado durante a
  manutencao para a Staff poder desativar o modo.
- `GET /operations/maintenance` retorna `enabled` e `message` para a Web.

## Epico I - Deploy e operacao

### I1. Painel Staff de deploy

Objetivo: tirar deploy do ritual manual.

Estado em 2026-07-01: implementado em `/dashboard/staff/deploy` via
`GET /operations/staff/deploy`.

Entrega:

- Tela Staff com:
  - versao atual da API;
  - versao esperada do ultimo push;
  - health publico/privado;
  - ultimo smoke publico;
  - ultimo changelog Staff enviado;
  - checklist do protocolo;
  - link para Actions quando disponivel.
- Sem tokens GitHub no frontend.
- A API agrega `APP_VERSION`, consulta publica opcional ao GitHub para o SHA do
  `master`, health publico, health privado Staff, smoke publico dos endpoints
  criticos, ultimo changelog Staff documentado em `docs/discord-staff-update-*`
  e checklist operacional.
- Quando GitHub ou smoke externo falham, a tela mostra estado degradado/manual em
  vez de quebrar.
- Como o envio de changelog por CLI nao grava recibo interno nem URL de webhook,
  o painel explicita que o ultimo changelog vem dos docs e que o recibo interno
  ainda nao esta disponivel.

### I2. Smoke autenticado pos-deploy

Objetivo: validar fluxo real sem depender do navegador humano.

Estado em 2026-07-01: implementado por `scripts/authenticated-smoke-test.js`,
com comando `npm run smoke:auth` e etapa opcional no job `deploy-smoke`.

Entrega:

- Script ou endpoint operacional que valida:
  - auth/me com token de automacao;
  - central Staff;
  - diagnostico de leilao;
  - entregas pendentes;
  - health privado.
- Documentar variaveis sem valores.
- Variaveis documentadas: `SMOKE_BASE_URL`, `SMOKE_AUTH_TOKEN`,
  `SMOKE_BEARER_TOKEN`, `SMOKE_ALLOW_EMPTY_AUCTIONS` e o secret de Actions
  `PRODUCTION_SMOKE_BEARER_TOKEN`.
- O workflow executa o smoke autenticado depois do smoke publico e pula a etapa
  explicitamente quando o secret nao estiver configurado.
- O script nao imprime token, nao le `.env` e falha quando qualquer contrato
  Staff esperado deixa de responder.

### I3. Backup novo no health privado

Objetivo: Staff saber se backup morreu.

Estado em 2026-07-01: implementado em `GET /health/details` e nos checks Staff
de `GET /operations/staff/health`.

Entrega:

- Health privado com idade do ultimo backup verificado.
- Integrar com monitor externo quando existir.
- `scripts/prod/verify-backup.sh` grava `last-verified-backup.json` com
  `status`, `verifiedAt`, `backupFile` e `tableCount` depois de restaurar o
  backup em banco temporario.
- A API le `BACKUP_STATUS_FILE` ou `/app/backups/last-verified-backup.json` por
  padrao e marca degradado quando o marcador nao existe, esta invalido ou passa
  de `BACKUP_MAX_AGE_HOURS` (26h por padrao).
- Os Compose de producao montam `${BACKUP_DIR:-/srv/guild/backups}` em
  `/app/backups:ro` para a API ler o marcador sem acesso de escrita.

## Epico J - Arquitetura e manutencao necessaria para sustentar tudo

### J1. Separar `operations.service.ts`

Objetivo: reduzir risco de mudancas cruzadas.

Estado em 2026-07-02: fase 1 implementada. O controller de `operations` passou
a depender de servicos de dominio para Staff summary, briefing operacional,
weekly/season, integridade, meeting e diagnostico/dossie de leilao, mantendo os
contratos HTTP compativeis. A implementacao pesada ainda fica parcialmente no
servico legado e sera movida em fases menores. A fase 2 moveu a implementacao de
integridade e legacy audit para `IntegrityService`. A fase 3 moveu o calculo de
resumo semanal/mensal e a publicacao do resumo operacional para
`WeeklySummaryService`. A fase 4 moveu a composicao do modo reuniao Staff para
`MeetingService`. A fase 5 moveu a composicao do resumo matinal Staff para
`OperationalBriefingService`. A fase 6 moveu o resumo do dia Staff para
`StaffSummaryService`. A fase 7 moveu o resumo Staff principal, suas filas,
thresholds e contadores para `StaffSummaryService`. A fase 8 moveu health Staff
e health operacional para `StaffSummaryService`. A fase 9 moveu o painel Staff
de deploy para `StaffSummaryService`. A fase 10 removeu a injecao do
`OperationsService` legado em `StaffSummaryService`. A fase 11 iniciou a
migracao de `AuctionDiagnosticsService`, movendo a lista de selecao de leiloes
do diagnostico Staff. A fase 12 moveu a timeline operacional de leilao para
`AuctionDiagnosticsService`. A fase 13 moveu os insights Staff de fairness de
loot e comparacao de players para `StaffInsightsService`, reduzindo mais duas
rotas que dependiam do legado. A fase 14 moveu previews de webhooks, fila de
entregas e retry manual para `DiscordOperationsService`, deixando a comunicacao
operacional Staff fora do legado. A fase 15 moveu regras da guilda e leitura do
modo manutencao para `OperationsRulesService`, reduzindo o legado tambem nas
rotas de configuracao operacional compartilhadas. A fase 16 moveu o resumo
player, notices e action plan para `PlayerOperationsService`, mantendo o
contrato das rotas `me/*` e o sigilo de leilao para players. A fase 17 moveu a
rota Staff de audit recente para `OperationsAuditService`, preservando limite
sanitizado e actor resumido. A fase 18 moveu os dossies universais Staff de
`player`, `request`, `interest`, `drop` e `event` para
`UniversalDossierService`; o tipo `auction` continua no dominio de diagnostico
de leilao para manter o raio-x e o Markdown especifico juntos. A fase 19 removeu
o provider e o arquivo `OperationsService` legado do modulo `operations`,
mantendo o controller somente com servicos de dominio.

Entrega:

- Serviços menores por dominio:
  - `StaffSummaryService`;
  - `AuctionDiagnosticsService`;
  - `IntegrityService`;
  - `MeetingService`;
  - `WeeklySummaryService`;
  - `OperationalBriefingService`;
  - `StaffInsightsService`;
  - `DiscordOperationsService`;
  - `OperationsRulesService`;
  - `PlayerOperationsService`;
  - `OperationsAuditService`;
  - `UniversalDossierService`.
- Manter controller compativel.
- Nao recriar `OperationsService` como concentrador; novas rotas devem ter dono
  de dominio proprio.
- Testes de regressao para endpoints existentes.

### J2. Separar `use-guild-api.ts`

Objetivo: facilitar manutencao Web.

Estado em 2026-07-02: implementado. `use-guild-api.ts` virou barrel
temporario e os hooks foram separados por dominio em `apps/web/src/hooks`.
As telas foram migradas para importar diretamente dos arquivos de dominio.

Entrega:

- Hooks por dominio:
  - `use-auctions-api`;
  - `use-staff-operations-api`;
  - `use-items-api`;
  - `use-requests-api`;
  - `use-events-api`;
  - `use-profile-api`.
- Reexport temporario para preservar imports, depois migrar telas.
- Dominios extras foram criados para evitar novo arquivo gigante: `use-dkp-api`,
  `use-codex-api`, `use-daoshi-api` e `use-drops-api`.

### J3. Contratos compartilhados

Objetivo: evitar divergencia API/Web.

Estado em 2026-07-02: fase 1 implementada com contratos compartilhados em
`packages/shared/src/types/operations.ts` para `OperationPriority`,
`OperationTask`, `PlayerActionPlanCard` e `PlayerActionPlan`. API e Web usam
aliases derivados desses tipos para preservar serializacao propria de data. A
fase 2 adicionou `packages/shared/src/types/auctions.ts` para contratos Staff de
diagnostico de leilao (`AuctionDiagnosticOption`, `AuctionTimelineEvent`,
`AuctionFinalizationPreview`, `AuctionDossier` e `AuctionDiagnosticSummary`),
com API usando data como `Date` e Web usando data serializada como `string`.

Entrega:

- Escolher estrategia: OpenAPI gerado pelo Nest ou pacote shared real.
- Migrar tipos criticos primeiro: auctions, operations, player tasks, requests,
  events.
- CI deve falhar se tipos gerados estiverem desatualizados.

### J4. DTOs com validacao forte

Objetivo: permitir `whitelist`/`forbidNonWhitelisted` por modulo.

Estado em 2026-07-02: fase 1 implementada no modulo `staff-review`. DTOs de
review de leilao/cancelamento de bid possuem decorators `class-validator`, e o
controller usa `ValidationPipe` local com `whitelist` e
`forbidNonWhitelisted`, sem alterar o pipe global legado. A fase 2 implementou
o mesmo padrao no modulo `codex`, validando criacao de pedido, comprovante de
envio e motivo de cancelamento antes de processar o fluxo. A fase 3 implementou
o mesmo padrao no modulo `daoshi`, validando recibos, lancamentos manuais e
revisao Staff antes de processar valores financeiros. A fase 4 implementou o
padrao no modulo `announcements`, validando criacao de anuncio, data ISO e bosses
de presenca em lote antes de processar o fluxo. A fase 5 implementou o padrao no
modulo `events`, validando criacao de evento, registro de presenca e cancelamento
antes de processar a rotina de presenca/DKP.

Entrega:

- Inventario de DTOs sem decorators.
- Migrar modulo por modulo.
- Teste de contrato antes de endurecer.
- Ativar whitelisting localmente nos controllers migrados.

### J5. Rate limit distribuivel

Objetivo: preparar escala.

Estado em 2026-07-02: fase 1 implementada. O rate limit saiu do `main.ts` e
passou para `apps/api/src/common/rate-limit`, com `RateLimitStore`,
`InMemoryRateLimitStore` e middleware configuravel por regras. Redis/gateway
continua como provider futuro por tras da mesma interface.

Entrega:

- Abstracao de rate limit com provider em memoria e Redis/gateway futuro.
- Documentar que instancia unica pode usar memoria; multi-replica precisa Redis.
- Health Staff mostra check `rate-limit` indicando provider em memoria local e
  limite operacional para multi-replica.

## Ordem sugerida de execucao

1. Documentar programa e alinhar WIKI.
2. Separar servico de diagnostico de leilao ou criar servico novo sem mover tudo.
3. Implementar timeline + stateReason + dossie de leilao.
4. Implementar preview de finalizacao.
5. Implementar action plan do player.
6. Implementar meeting/briefing Staff.
7. Implementar checklist de evento e painel de lote.
8. Implementar comparador de interesses.
9. Implementar requests com previsao/sugestao/prioridade T3 visivel.
10. Implementar preview/fila de webhooks.
11. Implementar painel de deploy e smoke autenticado.
12. Refatorar hooks/API por dominio.
13. Migrar DTOs e contratos compartilhados.
14. Atualizar guias funcionais e docs de produto.

## Definicao de pronto por fatia

- API e Web implementadas quando houver contrato novo.
- Testes proporcionais ao risco.
- `WIKI.md` atualizado quando muda fluxo/contrato.
- `git diff --check`, Prisma validate/generate, lint e builds conforme escopo.
- Producao verificada por sinal especifico antes de changelog.
