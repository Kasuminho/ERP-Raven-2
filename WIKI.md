# ERP Raven 2 - Wiki operacional

**Ultima revisao:** 2026-07-02

Memoria consolidada para novos chats e manutencao do projeto. Nao contem segredos.

## Visao geral

Plataforma da guilda G3X para operacao de players e Staff: DKP, presencas, eventos, leiloes, drops, interesses, pedidos de item, progresso, Daoshi, auditoria, notificacoes e integracao com Discord.

Producao:

- Aplicacao: `https://app.guild-g3x.com.br`
- API publica: `/api/v1`
- Repositorio: `Kasuminho/ERP-Raven-2`
- Branch de deploy: `master`

## Stack e estrutura

- Monorepo npm workspaces.
- API: NestJS em `apps/api`.
- Web: Next.js 15 em `apps/web`.
- Banco: PostgreSQL via Prisma em `packages/database`.
- Tipos compartilhados: `packages/shared`. Contratos de operations/player tasks (`OperationPriority`, `OperationTask`, `PlayerActionPlanCard`, `PlayerActionPlan`) ficam em `packages/shared/src/types/operations.ts`; contratos Staff de diagnostico de leilao (`AuctionDiagnosticOption`, `AuctionTimelineEvent`, `AuctionFinalizationPreview`, `AuctionDossier`, `AuctionDiagnosticSummary`) ficam em `packages/shared/src/types/auctions.ts`; API e Web usam aliases locais derivados deles para respeitar data como `Date|string`/`Date` no servidor e `string` no cliente.
- Infra e utilitarios: `scripts`, `Dockerfile` e arquivos Compose.

Qualidade obrigatoria:

- A suite critica usa Node Test Runner via `tsx` e cobre DKP, bids, ALL_IN, lotes de presenca, sessao e upload seguro.
- O workflow de imagens possui um job `quality` que executa install travado, Prisma, lint, testes, politica de audit e builds antes de publicar.
- `scripts/audit-policy.js` bloqueia vulnerabilidade critica ou regressao acima do baseline versionado de severidade alta.
- O smoke publico roda depois da janela do Watchtower e valida endpoints sem usar credenciais.

Modulos principais da API:

- `announcements`, `events`, `dkp`, `auctions`, `drops`;
- `players`, `eligibility`, `item-interests`, `item-requests`, `items`;
- `discord`, `notifications`, `automation`, `audit`, `operations`;
- `business-rules`, `staff-review`, `daoshi`, `codex`, `health`, `uploads`.

No modulo `operations`, o controller encaminha rotas Staff de resumo, briefing,
weekly/season, integridade, meeting e diagnostico/dossie de leilao para servicos
de dominio em `apps/api/src/modules/operations/services`. `IntegrityService` ja
possui implementacao propria para integridade e legacy audit, e
`WeeklySummaryService` ja calcula resumo semanal/mensal e publica o resumo
operacional sem depender do `OperationsService` legado. `MeetingService` ja
monta a pauta Staff com dia, reviews, interesses e eventos abertos sem depender
do legado. `OperationalBriefingService` ja monta o resumo matinal Staff com
pendencias, leiloes vencidos/proximos, saude e integridade sem depender do
legado. `StaffSummaryService` ja calcula o resumo do dia Staff (`staff/day`)
e o resumo Staff completo com filas de review, Codex, requests, interesses,
entregas, progresso, eventos e anuncios. `StaffSummaryService` tambem calcula
health Staff e health operacional com banco, storage, webhooks, automacao,
backup verificado, falhas recentes e aproximacao de fila, alem do painel Staff
de deploy com versao atual/esperada, health publico, smoke publico, changelog
documentado e protocolo; este dominio nao injeta mais o `OperationsService`
legado.
`AuctionDiagnosticsService` ja monta diretamente a lista de selecao de leiloes
do diagnostico Staff, incluindo item, vencedor quando houver e data de fim; os
detalhes pesados de timeline operacional e o raio-x completo tambem ja sairam
para esse dominio. A previa read-only de finalizacao, o dossie Staff de leilao e
o dossie universal do tipo `auction` tambem ja sao calculados no dominio de
diagnostico. `AuctionDiagnosticsService` nao injeta mais o `OperationsService`
legado; dossies universais de outros tipos ainda delegam ao legado pelo
controller.
`StaffInsightsService` calcula diretamente os insights Staff de fairness de loot
e comparacao de players, removendo mais duas rotas Staff do `OperationsService`
legado.
`DiscordOperationsService` calcula os previews Staff de webhooks, a fila
sanitizada de entregas e o retry manual de webhook, removendo essas rotas de
comunicacao do `OperationsService` legado.
`OperationsRulesService` calcula o resumo de regras da guilda e le o modo
manutencao diretamente de `BusinessRulesService`, removendo essas rotas de
configuracao operacional do legado.
`PlayerOperationsService` calcula o resumo player, notices e action plan de
`operations/me/*`, mantendo o payload sem ranking, concorrentes, locks ou bids
de terceiros para players.
`OperationsAuditService` lista o audit recente Staff de `operations/staff/audit`
com limite sanitizado e actor resumido, removendo a rota de auditoria simples do
`OperationsService` legado.

## Regras de comunicacao

Fonte detalhada: `docs/DISCORD_WEBHOOK_VOICE.md`.

- Identidade: **Aristolfo, 570 anos de webhook**.
- Avatar publico: `/aristolfo-webhooks.png`.
- Staff-only: somente PT-BR.
- Players: PT-BR e EN no mesmo post, em blocos separados.
- Nao usar espanhol nos posts normais atuais.
- Estilo curto, sarcastico, gamer e de internet, sem preconceito ou ataque pessoal.
- Alertas criticos explicam o problema antes da punchline.
- Bancos de voz dos webhooks usam selecao deterministica por contexto; quando ha par PT-BR/EN equivalente, a variante escolhida e espelhada entre os dois blocos.
- Changelog da Staff e enviado com `npm.cmd run discord:update -- ARQUIVO --staff`.
- Avisos extraordinarios para players podem ser redigidos/revisados no chat Codex e publicados com `npm.cmd run discord:update -- ARQUIVO --announcements`; fazer `--dry-run` antes, manter PT-BR/EN em blocos separados e exigir confirmacao humana antes do envio.
- A tela Staff `/dashboard/staff/discord-templates` consome `GET /operations/staff/discord-templates` e mostra preview real sanitizado de webhooks para anuncios, leiloes, interesses, drops, presenca, requests e review Staff. O payload inclui `username`, `avatar_url`, `content`, `embeds` e `allowed_mentions`, nunca a URL do webhook. Templates player-facing exibem PT-BR e EN; Staff-only fica PT-BR.
- A tela Staff `/dashboard/staff/discord-webhooks` consome `GET /operations/staff/discord-webhooks` e lista entregas persistidas em `DiscordWebhookDelivery`: alvo logico, canal, action, target, status, tentativas, erro resumido e payload sanitizado. `POST /operations/staff/discord-webhooks/:deliveryId/retry` reenvia apenas entregas `FAILED` e `retryable`, buscando a URL pelo `webhookKey` no servidor sem expor segredo.
- Nunca documentar URLs completas de webhook.

Automacao ativa:

- ID `webhook-joke-rotation`.
- Executa a cada 72 horas em worktree.
- Renova variacoes e piadas, preserva regras de idioma e negocio, valida, publica e envia changelog apos producao.
- A rotacao atual cobre embeds, DMs, healthcheck, DKP-LOG, resumo semanal e punchlines do changelog, com bancos renovados em 2026-07-02 para evitar reciclar as frases das revisoes anteriores.

## Seguranca, sessao e uploads

- O navegador autentica por cookie `guild_session` HttpOnly, Secure em producao e SameSite=Lax.
- JWT nao passa em query string e nao fica em localStorage ou acessivel ao JavaScript.
- `GET /auth/me` hidrata o perfil; `POST /auth/logout` encerra a sessao. Bearer token continua aceito para automacoes e smoke autenticado.
- A API aplica headers defensivos, HSTS em producao, limite de body, rate limit para OAuth/upload, CORS com credenciais e `ValidationPipe` com transformacao.
- O rate limit de OAuth/upload usa `apps/api/src/common/rate-limit`: `createRateLimiter`, regras por rota e `RateLimitStore`. O provider atual e `InMemoryRateLimitStore`, adequado para instancia unica; multi-replica deve trocar por Redis/gateway preservando a interface. O health Staff mostra check `rate-limit` com essa condicao operacional.
- O modo manutencao usa a regra de negocio `maintenanceMode` com `{ enabled, message }`. Quando ativo, um guard global bloqueia mutacoes sensiveis em leiloes, finalizacao/automacao, entregas/drops, ajustes DKP, progresso, requests, anuncios, interesses, eventos, Codex, Daoshi, uploads e webhooks operacionais; leituras e health continuam liberados. `PATCH /business-rules/maintenanceMode` permanece liberado para Staff desativar o modo, e `GET /operations/maintenance` alimenta o banner da Web.
- Nao habilitar `whitelist`/`forbidNonWhitelisted` globalmente enquanto os DTOs legados forem classes sem decorators; isso remove ou rejeita campos validos. A migracao deve ser feita por modulo, com teste do contrato antes de endurecer o pipe.
- `staff-review` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam UUIDs, notas e motivos antes de aprovar/rejeitar vencedor, override, remover bid, reabrir/cancelar leilao ou revisar cancelamento de bid.
- `codex` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam print do pedido, print de comprovante opcional, nota opcional e motivo de cancelamento antes do fluxo player/Staff.
- `daoshi` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam print, data, valores positivos, lancamento manual e nota de review antes de processar recibos e revisoes Staff.
- Upload aceita somente PNG, JPEG e WebP confirmados por magic bytes, usa UUID/extensao controlada e remove temporarios. SVG e conteudo disfarçado sao rejeitados.
- Em producao, novos uploads usam `IMAGE_STORAGE_PROVIDER=local` com volume persistente `UPLOADS_HOST_DIR` montado em `/app/uploads`; o proxy publico deve rotear `/uploads/` para a API. Links antigos do Google Drive podem continuar existindo ate a migracao do legado.
- A migracao do legado do Google Drive usa `npm run images:migrate-drive`: primeiro `--dry-run`, depois `--apply --limit 10`, e por fim `--apply`; o script gera manifesto em `reports/`, valida magic bytes e atualiza campos de imagem para `/uploads/...`.
- `GET /health` e publico e minimo: status, horario e `APP_VERSION`. Detalhes exigem Staff/Admin em `GET /health/details`.
- A Web aplica CSP, protecao contra framing, politica de referrer e permissoes restritas.

## UX e navegacao

- A navegacao principal e agrupada em Agora, Loot, Progresso e Conta.
- No mobile ficam quatro destinos principais e o menu `Mais`; a central Staff agrupa ferramentas por contexto operacional.
- A busca global `Ctrl+K` consulta itens, leiloes e eventos; resultados de players existem apenas no endpoint Staff.
- Busca possui modulo e hook proprios; novos dominios nao devem ser adicionados ao `operations.service.ts` ou `use-guild-api.ts` quando puderem ter ownership independente.
- Na Web, `apps/web/src/hooks/use-guild-api.ts` e apenas um barrel temporario. Hooks ficam separados por dominio: `use-profile-api`, `use-dkp-api`, `use-staff-operations-api`, `use-auctions-api`, `use-items-api`, `use-requests-api`, `use-events-api`, `use-codex-api`, `use-daoshi-api` e `use-drops-api`; telas novas devem importar direto do dominio.
- A central de pendencias filtra por severidade e mostra responsavel, abertura e prazo quando aplicavel. Prazos Staff derivam dos thresholds configuraveis.
- Acoes destrutivas e financeiras usam `ConfirmationDialog` acessivel, sem `window.confirm` ou `window.prompt`.
- O shell possui skip-link, foco visivel global e respeito a `prefers-reduced-motion`.
- A politica oficial esta em `/privacy`; a rota legada redireciona para ela.
- O dashboard do player em `/dashboard` consulta `GET /operations/me/action-plan` e mostra cards acionaveis com proximo passo, motivo, impacto, prioridade e link direto para codex, progresso, requests, bids proprios, interesses, leiloes disponiveis e eventos proximos. O payload nao inclui ranking, bids nem concorrentes de outros players.
- A timeline do player em `/dashboard/timeline` usa `GET /players/me/history` e mostra historico narrado com filtros por tipo e periodo. O payload segue compativel com o historico antigo e enriquece `timeline` com texto PT-BR/EN, tom visual, link de acao e metadados seguros. Entradas de leilao continuam restritas ao proprio bid e status do leilao, sem ranking, concorrentes ou locks de terceiros.
- A pagina de leilao para player mostra um painel "antes do bid" com elegibilidade propria: camada atual/exigida, DKP disponivel/exigido, attendance, modo do leilao e se a entrega passa por review Staff. O endpoint `GET /eligibility/player/:playerId/auction/:auctionId` inclui esses campos apenas para o player consultado e nao expõe ranking, concorrentes ou bids de terceiros.
- No perfil do player, `dimensionalLayer` e a camada operacional de 1 a 10. CP nao e editado diretamente ali: o player deve postar progresso `STATUS` com print, e a Staff aprova para atualizar o CP.
- Em interesses abertos de equipamento, o player pode marcar o atalho de transmutar: a Web dispensa upload manual, usa o asset publico `/transmutar.png` como `imageUrl`, grava `ItemInterestEntry.isTransmuteRequest` e pede confirmacao do Aristolfo antes de registrar.
- A tela player de interesses em `/dashboard/interests` permite selecionar varios posts abertos e declarar em lote. Cada post mantem nota, print ou transmutar proprio; a confirmacao unica envia cada declaracao pelo endpoint existente para preservar validacoes de duplicidade, janela aberta e print obrigatorio.
- Ao fechar um interesse em que todas as declaracoes sao de transmutar, o sistema pula a votacao da Staff e sorteia aleatoriamente um vencedor entre os elegiveis. Um mesmo player so pode ser selecionado para um item de transmutar por dia operacional de Sao Paulo; se todos os interessados ja foram selecionados no dia, o post fecha sem vencedor e fica auditado.
- A tela Staff de interesses em `/dashboard/staff/interests` consome `GET /item-interests/staff/list`, endpoint Staff-only que adiciona `staffComparison` por interessado: classe, camada, presenca, DKP total/travado/disponivel, requests ativos, ultima nota Staff, historico de loot e sinais operacionais. O endpoint normal dos players nao recebe esse comparador sensivel.
- A central Staff em `/dashboard/staff` abre com o resumo matinal Staff de `GET /operations/staff/morning-briefing`, reunindo urgencias, leiloes vencidos/proximos, reviews, entregas, integridade, saude e secoes acionaveis com Markdown copiavel. Abaixo ficam abas de jornada (`Resolver agora`, `Auditar`, `Configurar`, `Comunicar`, `Operar deploy`) com contadores, cards filtrados e proximas acoes por grupo, alem de pendencias, saude e auditoria.
- O modo reuniao Staff em `/dashboard/staff/meeting` consome `GET /operations/staff/meeting`, que preserva os campos antigos e adiciona `meetingDay`, `sections`, `resolvedItemKeys` e `markdown`. As secoes cobrem decisoes de loot, pendencias travadas, economia DKP, players sensiveis, progresso de boss/lote, comunicados e acoes ate a proxima reuniao. `POST /operations/staff/meeting/items/:itemKey/resolve` marca item como resolvido no dia operacional via audit log `STAFF_MEETING_ITEM_RESOLVED`.
- O dossie universal Staff em `/dashboard/staff/dossier` consome `GET /operations/staff/dossiers/:type/:id` e gera contexto auditavel com resumo, links internos, audit logs e Markdown copiavel para `player`, `auction`, `request`, `interest`, `drop` e `event`. O endpoint e Staff-only e nao retorna segredos, URLs de webhook ou payload privado desnecessario.
- O diagnostico Staff de leilao em `/dashboard/staff/auction-diagnostics` seleciona qualquer leilao por lista, exibindo item, vencedor registrado por `AUCTION_WIN` quando houver e data de encerramento antes de consultar o raio-x completo. A tela tambem mostra motivo visual do estado atual, previa de finalizacao Staff-only, dossie Markdown copiavel e timeline operacional derivada de leilao, bids, locks, cancelamentos, votos, transacoes, entrega e audit logs. Endpoints sensiveis: `GET /operations/staff/auction-diagnostics/:auctionId/finalization-preview` e `GET /operations/staff/auction-diagnostics/:auctionId/dossier`.
- A tela Staff `/dashboard/staff/deliveries` consome `GET /drops/pending-auction-deliveries`, que preserva `auction`, `player` e `transaction` e adiciona `urgency`, `ageHours`, `deliveryDueAt` e `priorityReason`. A tela mostra contadores, filtros por todos/atrasados/hoje/sem prova, busca por player/item, filtro por tier, badges de urgencia e prazo para impedir drop vencido esquecido. As tarefas Staff `DROP_DELIVERY` tambem carregam idade e motivo de prioridade no metadata para dashboard e meeting.
- O programa completo de melhorias de produto/UX/processo fica em `docs/RAVEN2_PRODUCT_IMPROVEMENT_PROGRAM.md`, com epicos para leiloes, Staff, players, requests, interesses, eventos, Discord, auditoria, deploy e arquitetura.

## Leiloes e sigilo

- Players nao veem ranking, bids, locks nem participantes durante o leilao.
- Endpoints sensiveis exigem papel Staff/Admin.
- O player pode consultar apenas o proprio bid pelo contrato especifico.
- Resultado e entrega liberam apenas as informacoes apropriadas ao fluxo publico.
- Nunca reintroduzir listas de participantes em payload publico, pagina publica ou webhook de players.
- Quando uma review de leilao e rejeitada com quorum ou um leilao e relistado manualmente, o sistema libera locks e invalida os bids antigos; a proxima abertura deve exigir novos bids e novos locks.
- Para leiloes T4, rejeicao/invalidacao sem bids antes da camada 1 nao marca `RELISTED`: o sistema avanca para a proxima camada e mantem o ciclo aberto. So depois de chegar na camada 1 e ainda nao haver vencedor apto o item vira `RELISTED`, voltando para camada 4 com `reopensAt` em 7 dias a partir da primeira abertura do ciclo.

## Eventos, presenca e DKP

Cada evento distribui seu proprio DKP quando finalizado.

Criacao simples:

- Um tipo selecionado cria um evento com o titulo base.

Criacao em lote:

- A Staff informa um titulo base, por exemplo `BOSSES T4`.
- Seleciona varios bosses e define a ordem com botoes subir/descer.
- O anuncio fica `BOSSES T4 - PRIMEIRO - SEGUNDO - ...`.
- Cada evento fica independente: `BOSSES T4 - LUNOS`, `BOSSES T4 - RIGRETO`, etc.
- `Event.attendanceBatchId` identifica o lote pelo ID do anuncio.
- `Event.batchOrder` persiste a ordem.
- A tela Staff de eventos mostra um painel de lote quando o evento selecionado
  possui `attendanceBatchId`. O painel consome `GET /events/batches/:batchId`,
  exibe ordem, status, presentes, ausentes, DKP distribuido, cancelados/pulados,
  proximo boss ativo e acao para abrir/finalizar o proximo evento.
- A mesma tela mostra prontidao do boss via `GET /events/:id/readiness`,
  cruzando presenca, players ativos, camadas, classes, CP aprovado e ultimo
  progresso `STATUS`. STATUS ausente ou com mais de 14 dias entra como
  desatualizado. Roles operacionais: `VANGUARD` tank, `DIVINE_CASTER` healer,
  `DEATHBRINGER` suporte/off-heal e demais classes DPS. O painel informa gaps,
  mas nao decide composicao automaticamente.

Encadeamento de presenca:

- Ao finalizar um boss, o DKP dele e distribuido normalmente.
- Antes de finalizar, a tela Staff de eventos consulta `GET /events/:id/finalization-checklist` e mostra checklist com boss atual, proximo boss do lote, presentes, ausentes ativos, DKP por pessoa, DKP total, previsao de copia e alertas de presenca/estado.
- A presenca e copiada para o proximo evento ativo do mesmo lote.
- A tela seleciona o proximo boss para a Staff revisar e finalizar explicitamente.
- Eventos cancelados sao pulados.
- Presenca ja existente no proximo evento nunca e sobrescrita.
- O ultimo boss encerra a cadeia sem copiar.
- A copia gera auditoria `EVENT_BATCH_ATTENDANCE_COPIED`.

Migration: `20260620143000_add_event_attendance_batches`.

## DKP-LOG

- Canal interno da Staff, apenas PT-BR.
- Publica novas transacoes de DKP automaticamente.
- Na primeira ativacao, busca os ultimos tres dias em ordem cronologica.
- Divide mensagens para respeitar limites do Discord.
- Registra entregas em `DiscordDkpLogDelivery` para nao repetir transacoes apos restart.
- Estado persistido em `DiscordDkpLogState`.
- Configuracao usa `DISCORD_DKP_WEBHOOK_URL`; nunca registrar o valor.

## Pedidos de craft

- Materiais solicitados para concluir itens T3 possuem prioridade sobre pedidos do mesmo material destinados a Quintessencia.
- Um pedido de Quintessencia continua valido, mas so deve ser atendido quando nao houver player aguardando aquele material para fabricar um item T3.
- A regra existe para elevar primeiro quem ainda esta abaixo na progressao e melhorar o resultado coletivo da guilda.
- Requests em `/dashboard/item-requests` recebem `queueForecast` nos endpoints existentes. A previsao e calculada a partir da fila atual e `DropHistory`, mostrando posicao/tamanho da fila, pedidos e unidades antes, idade do update, ultima entrega conhecida, estagio do update e resumo PT-BR/EN. Nao muda a ordenacao, nao promete entrega automatica e nao exige migration.
- Requests tambem podem receber `swapSuggestions`: ate tres itens requestaveis ativos da mesma categoria e, quando aplicavel, mesmo tier/tipo, com fila menor. A UI mostra posicao estimada, unidades na fila e trade-off PT-BR/EN; a troca continua manual/controlada pela Staff.
- Requests tambem recebem `materialPriority`: requests de craft T3 mostram selo de prioridade operacional, e requests de Quintessencia afetados por craft T3 do mesmo material inferido mostram aviso simplificado para player e texto operacional para Staff.
- A entrega Staff de Quintessencia bloqueada por prioridade T3 e impedida e gera auditoria `ITEM_REQUEST_T3_PRIORITY_DELIVERY_BLOCKED` com material inferido e requests de craft que bloquearam.

## Deploy e producao

Fonte detalhada: `docs/ICP_DOCKER_IMAGES.md`.

Fluxo:

1. Push em `master`.
2. GitHub Actions cria imagens API/Web e publica no GHCR.
3. Watchtower da VPS consulta novas imagens a cada 300 segundos.
4. Containers `guild-api` e `guild-web` sao recriados.
5. API executa `prisma migrate deploy` na inicializacao.

Confiabilidade:

- Deploy de imagens usa `DEPLOY_IMAGE_TAG` imutavel e registra historico para rollback.
- `APP_VERSION` identifica o artefato no health e no smoke de producao.
- `scripts/authenticated-smoke-test.js` roda o smoke autenticado pos-deploy com Bearer token de automacao (`SMOKE_AUTH_TOKEN` ou `SMOKE_BEARER_TOKEN`), validando `/auth/me`, central Staff, diagnostico de leilao, entregas pendentes, health privado e painel de deploy. No GitHub Actions, o job `deploy-smoke` executa a etapa se o secret `PRODUCTION_SMOKE_BEARER_TOKEN` estiver configurado; sem o secret, a etapa e pulada explicitamente sem falhar o deploy.
- `scripts/prod/deploy-images.sh` e `rollback-images.sh` controlam promocao e retorno de versao.
- Containers possuem healthcheck e limites configuraveis de CPU/memoria.
- `docker-compose.monitoring.yml` oferece Uptime Kuma independente da API; fonte operacional em `docs/MONITORING.md`.
- Backup gera SHA-256, aplica retencao, aceita criptografia GPG e hook off-site. `verify-backup.sh` restaura em PostgreSQL temporario para provar integridade e grava `last-verified-backup.json` sem segredo. A API le `BACKUP_STATUS_FILE` ou `/app/backups/last-verified-backup.json` e mostra idade do ultimo backup verificado no health privado e nos checks Staff; acima de `BACKUP_MAX_AGE_HOURS` (26h padrao) fica degradado.
- Runbooks de banco, Discord, deploy, leilao e DKP ficam em `docs/OPERATIONS_RUNBOOKS.md`.
- A tela Staff `/dashboard/staff/deploy` consome `GET /operations/staff/deploy` e centraliza versao atual da API, SHA esperado do `master` quando o GitHub publico responde, health publico, health privado Staff, smoke publico, ultimo changelog Staff documentado e checklist do protocolo. O frontend nao recebe token GitHub nem segredo; o campo de changelog explicita que envios por CLI nao gravam recibo interno.

Imagens:

- `ghcr.io/kasuminho/erp-raven-2-api:latest`
- `ghcr.io/kasuminho/erp-raven-2-web:latest`

Nao considere apenas o Actions verde como deploy concluido. Verifique um campo, endpoint, asset ou comportamento especifico em producao antes do changelog.

## SaaS single-tenant

Plano vivo: `docs/SAAS_SINGLE_TENANT_ROADMAP.md`.

- A direcao de SaaS para o Raven e single-tenant operacional: um Compose
  explicito, uma database PostgreSQL, um usuario de banco restrito, um volume
  de uploads, um conjunto de envs e uma integracao Discord por guilda.
- Nao iniciar com banco multi-tenant compartilhado. O schema atual e a regra de
  negocio foram desenhados como plataforma single-guild; o caminho seguro e
  automatizar varias instancias antes de considerar `tenantId` em todos os
  modelos.
- A G3X deve ser tratada como primeira instalacao/preset, nao como identidade
  rigida do produto SaaS.
- Trabalhos de descoberta, documentacao e infraestrutura SaaS interna nao devem
  enviar changelog no Discord da G3X. Changelog da Staff continua reservado para
  mudancas publicadas e verificadas na operacao da G3X.
- Antes de piloto externo, cada guilda precisa ter provisionamento repetivel,
  backup/restore, smoke, update e rollback independentes.
- Para novas guildas, criar um arquivo Compose proprio, por exemplo
  `docker-compose.guilda-teste.yml`, com nomes de containers, portas, banco,
  uploads e envs explicitos. Nao usar uma camada generica de nomes por env para
  esconder diferencas entre guildas.
- O PostgreSQL da VPS pode ser compartilhado entre clientes, desde que cada
  guilda use database propria e usuario que so tenha acesso a ela. O guia
  pratico fica em `docs/SAAS_GUILD_COMPOSE_GUIDE.md`.
- A Web resolve a API em runtime pelo hostname `*.guild-g3x.com.br`, usando
  `https://HOST/api/v1`; isso permite reutilizar a mesma imagem Web em stacks
  de teste/guilda sem ficar presa ao `NEXT_PUBLIC_API_URL` gravado no build.

## Comandos usuais

```powershell
npm.cmd run lint
npm.cmd run build --workspace apps/api
npm.cmd run build --workspace apps/web
npx.cmd prisma validate --schema packages/database/prisma/schema.prisma
npx.cmd prisma generate --schema packages/database/prisma/schema.prisma
npm.cmd run discord:update -- docs/ARQUIVO.md --staff
npm.cmd run discord:configure-webhooks
```

## Cuidados conhecidos

- No ambiente Codex atual, `.git` pode aparecer somente leitura e o checkout local pode ficar atrasado.
- Em 2026-06-21, `origin/master` estava em `a4f1c22`, enquanto o HEAD local permanecia em `bdae4fd`. Entre eles estao o lote de eventos `695bd37` e a rotacao de voz `a4f1c22`.
- Antes de interpretar arquivos locais como trabalho novo ou publicar, busque e compare `origin/master`; automacoes usam worktrees separadas.
- O lint possui um warning preexistente em `eligibility.service.ts:467` sobre `client` nao usado.
- `.env`, `.env.production`, tokens e URLs de webhooks nunca entram em documentacao ou resposta publica.
- O audit de 2026-06-21 ficou em 0 criticas e 8 altas conhecidas; o gate impede regressao, mas upgrades maiores de Nest/Discord devem continuar em sprint controlada.
- O rate limit atual usa provider em memoria local por tras de `RateLimitStore`. Se a API escalar para varias replicas, implementar provider Redis ou delegar ao gateway compartilhado.

## Documentos de referencia

- `AGENTS.md`: regras obrigatorias para chats futuros.
- `docs/ICP_DOCKER_IMAGES.md`: deploy por imagens e Watchtower.
- `docs/SAAS_SINGLE_TENANT_ROADMAP.md`: plano para empacotar o Raven como SaaS por instancia Docker isolada por guilda.
- `docs/SAAS_GUILD_COMPOSE_GUIDE.md`: guia pratico para Compose por guilda e database PostgreSQL isolada.
- `docs/RAVEN2_PRODUCT_IMPROVEMENT_PROGRAM.md`: programa completo de melhorias de produto, UX, operacao e arquitetura.
- `docs/DEPLOY_ICP.md`: contexto de deploy ICP.
- `docs/DISCORD_WEBHOOK_VOICE.md`: identidade, idioma e tom.
- `docs/staff-guide-current.md`: guia funcional atual da Staff, somente PT-BR.
- `docs/player-guide-current.md`: guia funcional atual dos players, com blocos PT-BR e EN.
- `docs/staff-guide-2026-06-04.md` e `docs/player-guide-2026-06-04.md`: guias historicos, substituidos em 2026-07-01.
- `docs/discord-*.md`: historico de comunicacoes e mudancas.

## Historico recente

| Data | Mudanca | Referencia |
| --- | --- | --- |
| 2026-07-02 | Audit recente Staff de `operations/staff/audit` saiu do `OperationsService` legado para `OperationsAuditService`. | arquitetura/API |
| 2026-07-02 | Resumo player, notices e action plan de `operations/me/*` sairam do `OperationsService` legado para `PlayerOperationsService`. | arquitetura/API |
| 2026-07-02 | Regras da guilda e leitura do modo manutencao sairam do `OperationsService` legado para `OperationsRulesService`. | arquitetura/API |
| 2026-07-02 | Previews de webhooks, fila sanitizada e retry manual sairam do `OperationsService` legado para `DiscordOperationsService`. | arquitetura/API |
| 2026-07-02 | Insights Staff de fairness de loot e comparacao de players sairam do `OperationsService` legado para `StaffInsightsService`. | arquitetura/API |
| 2026-07-02 | Modulo `daoshi` ganhou DTOs com `class-validator` e pipe local forte com whitelist/forbidNonWhitelisted. | validacao/API |
| 2026-07-02 | Modulo `codex` ganhou DTOs com `class-validator` e pipe local forte com whitelist/forbidNonWhitelisted. | validacao/API |
| 2026-07-02 | Contratos Staff de diagnostico de leilao passaram para `packages/shared/src/types/auctions.ts`, com aliases locais na API e Web para data de servidor/cliente. | contratos/shared |
| 2026-07-02 | Modulo `staff-review` ganhou DTOs com `class-validator` e pipe local forte com whitelist/forbidNonWhitelisted. | validacao/API |
| 2026-07-02 | Contratos compartilhados de operations/player tasks foram criados em `packages/shared`, e API/Web passaram a derivar `OperationTask` e `PlayerActionPlan` deles. | contratos/shared |
| 2026-07-02 | Rate limit de OAuth/upload saiu do bootstrap e passou para abstracao `RateLimitStore` com provider em memoria e caminho preparado para Redis/gateway. | arquitetura/API |
| 2026-07-02 | Hooks Web sairam do arquivo gigante `use-guild-api.ts` para arquivos por dominio, com barrel temporario e telas migradas para imports diretos. | arquitetura/Web |
| 2026-07-02 | Modo reuniao Staff virou pauta decisoria por secoes com Markdown copiavel e marcacao auditavel de item resolvido por dia operacional. | Staff/reuniao |
| 2026-07-02 | Central Staff passou a organizar ferramentas por jornada com abas, contadores e proximas acoes por grupo: resolver agora, auditar, configurar, comunicar e operar deploy. | UX Staff |
| 2026-07-02 | Fila Staff de entregas de leilao ganhou urgencia, idade, prazo, motivo operacional, busca por player/item e filtros por atraso/hoje/sem prova/tier; tasks `DROP_DELIVERY` passaram a carregar idade e motivo no metadata. | leiloes/Staff |
| 2026-07-02 | `AuctionDiagnosticsService` deixou de injetar `OperationsService`; o controller roteia apenas dossie universal `auction` para esse dominio e mantem os demais tipos no legado. | arquitetura/API |
| 2026-07-02 | Dossie universal Staff do tipo `auction` saiu da delegacao e passou a ser montado em `AuctionDiagnosticsService`, reaproveitando o dossie especifico, resumo, links e audit logs de leilao. | arquitetura/API |
| 2026-07-02 | Dossie Staff especifico do diagnostico de leilao saiu da delegacao e passou a ser montado em `AuctionDiagnosticsService`, combinando diagnostico, previa, timeline e Markdown copiavel. | arquitetura/API |
| 2026-07-02 | Previa read-only de finalizacao do diagnostico Staff de leilao saiu da delegacao e passou a ser calculada em `AuctionDiagnosticsService`, preservando candidato, locks, bids ignorados, riscos e proximo estado. | arquitetura/API |
| 2026-07-02 | Raio-x completo do diagnostico Staff de leilao saiu da delegacao e passou a ser calculado em `AuctionDiagnosticsService`, preservando contadores, issues, estado visual, bids, locks, votos e audit logs. | arquitetura/API |
| 2026-07-02 | Timeline operacional do diagnostico Staff de leilao saiu da delegacao e passou a ser calculada em `AuctionDiagnosticsService`. | arquitetura/API |
| 2026-07-02 | Lista de selecao do diagnostico Staff de leilao saiu da delegacao e passou a ser calculada em `AuctionDiagnosticsService`. | arquitetura/API |
| 2026-07-02 | `StaffSummaryService` deixou de injetar `OperationsService`; resumo Staff, dia, health e deploy estao desacoplados do legado. | arquitetura/API |
| 2026-07-02 | Painel Staff de deploy de `operations` saiu da delegacao e passou a ser montado em `StaffSummaryService`, preservando versao, health publico, smoke, changelog documentado e protocolo. | arquitetura/API |
| 2026-07-02 | Health Staff e health operacional de `operations` sairam da delegacao e passaram a ser calculados em `StaffSummaryService`, preservando checks de banco, storage, webhooks, automacao, backup e auditoria recente. | arquitetura/API |
| 2026-07-02 | Resumo Staff principal de `operations` saiu da delegacao e passou a ser calculado em `StaffSummaryService`, preservando filas, thresholds e contadores. | arquitetura/API |
| 2026-07-02 | Quinta rotacao automatica renovou o humor dos webhooks, DMs, healthcheck, DKP-LOG, resumo semanal e changelog sem mudar payloads, identidade, idiomas ou regras. | webhook-joke-rotation |
| 2026-07-02 | Resumo do dia Staff de `operations` saiu da delegacao e passou a ser calculado em `StaffSummaryService`, preservando contadores diarios e tarefas urgentes. | arquitetura/API |
| 2026-07-02 | Resumo matinal Staff de `operations` saiu da delegacao e passou a ser montado em `OperationalBriefingService`, preservando secoes, contadores e Markdown. | arquitetura/API |
| 2026-07-02 | Modo reuniao Staff de `operations` saiu da delegacao e passou a ser montado em `MeetingService`, preservando a pauta de dia, reviews, interesses e eventos. | arquitetura/API |
| 2026-07-02 | Resumos semanal e mensal de `operations` sairam da delegacao e passaram a ser calculados em `WeeklySummaryService`, preservando contratos e webhook operacional. | arquitetura/API |
| 2026-07-01 | `operations` iniciou separacao por dominio com servicos para Staff summary, briefing, weekly, integridade, meeting e diagnostico de leilao; integridade/legacy audit ja sairam para `IntegrityService`. | arquitetura/API |
| 2026-07-01 | Health privado e painel de saude Staff passaram a mostrar idade do ultimo backup verificado a partir do marcador gerado por `verify-backup.sh`. | backup/health |
| 2026-07-01 | Deploy ganhou smoke autenticado pos-Watchtower para validar auth/me, Staff, diagnostico de leilao, entregas, health privado e painel de deploy com token de automacao. | deploy/smoke |
| 2026-07-01 | Staff ganhou painel de deploy com versao atual/esperada, health publico/privado, smoke publico, changelog documentado e checklist operacional sem expor tokens. | deploy/Staff |
| 2026-07-01 | Modo manutencao passou a bloquear mutacoes sensiveis por regra `maintenanceMode`, com banner na Web e auditoria ao ligar/desligar. | seguranca/operacao |
| 2026-07-01 | Staff ganhou dossie universal para player, leilao, request, interesse, drop e evento com resumo, links, audit logs e Markdown copiavel. | auditoria/Staff |
| 2026-07-01 | Guias funcionais atuais foram recriados com Staff PT-BR, players PT-BR/EN, identidade Aristolfo correta e guias antigos marcados como historicos. | docs/guias |
| 2026-07-01 | Staff ganhou fila persistente de webhooks com status, payload seguro, erro resumido e retry manual controlado. | Discord/Staff |
| 2026-07-01 | Staff ganhou preview real sanitizado de webhooks com payload/embed PT-BR/EN quando player-facing, sem expor URL de webhook. | Discord/Staff |
| 2026-07-01 | Sorteio de interesses 100% transmutar passou a bloquear no limite diario apenas o player vencedor do dia, nao todos os participantes do post premiado. | interesses/transmutar |
| 2026-07-01 | Eventos Staff ganharam prontidao por boss com camadas, classes, roles, CP aprovado e players sem STATUS recente. | eventos/Staff |
| 2026-07-01 | Eventos Staff ganharam painel visual de lote por `attendanceBatchId`, com trilha de bosses, proximo boss ativo, presenca, DKP e acao direta. | eventos/Staff |
| 2026-06-29 | Finalizacao de evento ganhou checklist Staff com presentes, ausentes, DKP, proximo boss do lote, previsao de copia e alertas antes de confirmar. | eventos/Staff |
| 2026-06-29 | Player pode declarar interesse em lote, mantendo print/nota/transmutar por post e uma confirmacao unica antes de enviar. | interesses/player |
| 2026-06-29 | Interesses Staff ganharam comparador por interessado com classe, camada, presenca, DKP, requests ativos, nota Staff e historico de loot em endpoint Staff-only. | interesses/Staff |
| 2026-06-29 | Requests ganharam transparencia da prioridade de material T3 sobre Quintessencia, com badge, texto Staff/player e bloqueio auditado de entrega quando aplicavel. | requests/craft |
| 2026-06-29 | Requests passaram a sugerir alternativas comparaveis com fila menor, mostrando trade-off sem trocar automaticamente. | requests/UX |
| 2026-06-29 | Requests ganharam previsao operacional de fila com pedidos/unidades antes, idade do update, ultima entrega e resumo PT-BR/EN. | requests/UX |
| 2026-06-29 | Timeline do player ganhou historico narrado PT-BR/EN com filtros por tipo/periodo, links de acao e sigilo preservado em leiloes. | player/UX |
| 2026-06-29 | Pagina de leilao passou a explicar elegibilidade antes do bid com camada, DKP, attendance, modo e review Staff sem expor concorrentes. | leiloes/player |
| 2026-06-29 | Dashboard do player ganhou action plan com proximo passo, motivo, impacto e links diretos sem expor informacao sigilosa de leilao. | player/UX |
| 2026-06-29 | Central Staff ganhou resumo matinal com pauta acionavel, leiloes vencidos/proximos, riscos de integridade/saude e Markdown copiavel. | Staff/operacao |
| 2026-06-29 | Diagnostico Staff de leilao ganhou previa read-only de finalizacao, dossie Markdown copiavel e correcao da previsao T4 para expandir camada antes de relistar quando aplicavel. | leiloes/diagnostico |
| 2026-06-29 | Criado programa completo de melhorias Raven2 e iniciado o epico de leiloes com motivo visual de estado e timeline operacional no diagnostico Staff. | produto/UX/leiloes |
| 2026-06-29 | Quarta rotacao automatica renovou o humor dos webhooks, DMs, healthcheck, DKP-LOG, resumo semanal e changelog sem mudar payloads, identidade, idiomas ou regras. | webhook-joke-rotation |
| 2026-06-29 | Diagnostico Staff de leilao ganhou selecao de todos os leiloes por item, vencedor quando houver e data, sem exigir colar ID manualmente. | leiloes/diagnostico |
| 2026-06-28 | Regra T4 ajustada: rejeicao/invalidacao sem bids desce camadas ate a 1; somente apos falhar na camada 1 o leilao relista para camada 4 em 7 dias desde a abertura original. Justificativas em modais deixaram de perder foco ao digitar. | leiloes/relist |
| 2026-06-26 | Terceira rotacao automatica renovou os bancos de zoeira dos webhooks, DMs, healthcheck, DKP-LOG, resumo semanal e changelog sem mexer em payloads nem regras. | webhook-joke-rotation |
| 2026-06-26 | Interesses de transmutar passaram a ter flag persistida, backfill da print fixa e sorteio automatico com limite diario por player quando todos os pedidos sao de transmutar. | interesses/transmutar |
| 2026-06-25 | Web passou a resolver a API por hostname em runtime para permitir stacks `*.guild-g3x.com.br` com a mesma imagem. | SaaS single-tenant |
| 2026-06-25 | Registrada a direcao SaaS single-tenant por guilda, com Compose explicito, database/usuario PostgreSQL isolados, uploads, envs e Discord por cliente. | `docs/SAAS_SINGLE_TENANT_ROADMAP.md` |
| 2026-06-25 | Central Staff passou a mostrar ferramentas primeiro e ganhou mais respiro visual nos cards. | UX Staff |
| 2026-06-24 | Interesses de equipamento ganharam atalho de pedido para transmutar com print padrao e confirmacao antes do registro. | interesses/transmutar |
| 2026-06-23 | Segunda rotacao automatica renovou o repertorio dos webhooks, alinhou variantes PT-BR/EN por contexto e trocou punchlines do changelog. | webhook-joke-rotation |
| 2026-06-23 | Criado runbook/script para inventariar e migrar imagens legadas do Google Drive para uploads locais com manifesto. | migracao de imagens |
| 2026-06-23 | Uploads novos passaram a ser documentados como armazenamento local persistente na VPS, com `/uploads/` roteado para a API. | uploads/producao |
| 2026-06-23 | Perfil do player passou a validar camada 1-10 com erro 400, carregar dados reais no formulario e orientar que CP muda via progresso aprovado pela Staff. | perfil/progresso |
| 2026-06-22 | Registrada a prioridade de materiais para T3 sobre Quintessencia e o fluxo de avisos extraordinarios bilingues pelo Aristolfo. | comunicacao operacional |
| 2026-06-22 | Hotfix preserva contratos dos DTOs legados no pipe global e cobre agendamento de bosses em lote. | trabalho atual |
| 2026-06-21 | Endurecimento completo: sessao HttpOnly, upload seguro, CI/testes, busca e navegacao, confirmacoes, monitoramento, backups verificados e rollback. | trabalho atual |
| 2026-06-21 | Criados `AGENTS.md` e `WIKI.md` como memoria viva obrigatoria para novos chats. | este commit |
| 2026-06-21 | Primeira rotacao automatica renovou as variacoes dos webhooks. | `a4f1c22` |
| 2026-06-20 | Anuncios em lote ganharam ordem persistente e copia de presenca boss a boss. | `695bd37` |
| 2026-06-20 | DKP-LOG ganhou backfill de tres dias e entrega persistente. | `bdae4fd` |
| 2026-06-19 | Webhooks de players voltaram a PT-BR/EN; Staff permaneceu PT-BR. | `4b851a8` |
| 2026-06-19 | Identidade Aristolfo aplicada aos webhooks. | `e316b44` |
| 2026-06-19 | Ranking e bids de leilao ficaram restritos a Staff. | `1377157` |
