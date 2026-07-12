# ERP Raven 2 - Wiki operacional

**Ultima revisao:** 2026-07-11

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
- Tipos compartilhados: `packages/shared`. Contratos de operations/player tasks (`OperationPriority`, `OperationTask`, `PlayerActionPlanCard`, `PlayerActionPlan`) ficam em `packages/shared/src/types/operations.ts`; contratos Staff de diagnostico de leilao (`AuctionDiagnosticOption`, `AuctionTimelineEvent`, `AuctionFinalizationPreview`, `AuctionDossier`, `AuctionDiagnosticSummary`) ficam em `packages/shared/src/types/auctions.ts`; contratos de eventos (`EventRecord`, `FinalizeEventResult`, `EventFinalizationChecklist`, `EventBatchPanel`, `EventReadinessReport`, `EventDetails`, `AttendanceStats`, `PlayerAttendanceHistoryRow`) ficam em `packages/shared/src/types/events.ts`; contratos de requests (`ItemRequestRecord`, `ItemRequestQueueForecast`, `ItemRequestSwapSuggestion`, `ItemRequestMaterialPriority`) ficam em `packages/shared/src/types/requests.ts`; contratos de interesses (`ItemInterestPostRecord`, `ItemInterestEntryRecord`, `ItemInterestVote`, `ItemInterestStaffComparison`) ficam em `packages/shared/src/types/interests.ts`; contratos de roster/perfil de combate (`PlayerCombatRole`, `PlayerCombatAvailability`, `PlayerCombatProfileRecord`, `PlayerCombatProfileChangeRequestRecord`) ficam em `packages/shared/src/types/roster.ts`; contratos de War Room (`WarRoomOperationRecord`, `WarRoomRosterSlotRecord`, `WarRoomRosterDossier`, `PlayerWarRoomAssignment`, `WarRoomTimelineEventRecord`, `WarRoomLiveDossier`, `WarRoomAfterActionReport`) ficam em `packages/shared/src/types/war-room.ts`; API e Web usam aliases locais derivados deles para respeitar data como `Date|string`/`Date` no servidor e `string` no cliente.
- Infra e utilitarios: `scripts`, `Dockerfile` e arquivos Compose.

Qualidade obrigatoria:

- A suite critica usa Node Test Runner via `tsx` e cobre DKP, bids, ALL_IN, lotes de presenca, sessao e upload seguro.
- O workflow de imagens possui um job `quality` que executa install travado, Prisma, lint, testes, politica de audit e builds antes de publicar.
- `scripts/audit-policy.js` bloqueia vulnerabilidade critica ou regressao acima do baseline versionado de severidade alta.
- O smoke publico roda depois da janela do Watchtower e valida a API sem usar credenciais.
- O smoke publico do workflow exige `APP_VERSION` esperado em `/health` como gate obrigatorio e usa uma janela estendida de tentativas para absorver a variacao do Watchtower/edge sem afrouxar o criterio.
- Os healthchecks publicos de modulos (`/auctions/health`, `/items/health`, `/eligibility/health`, `/audit/health`) ficam como diagnostico auxiliar no smoke publico; falhas isoladas deles sao logadas sem bloquear deploy quando `/health` ja confirmou a versao esperada.
- O script de smoke publico registra sua configuracao efetiva e limita tempo por fetch; o step tambem possui timeout proprio no GitHub Actions para evitar deploy preso por conexao pendurada.
- O smoke publico usa DNS `ipv4first` por padrao, via `SMOKE_DNS_ORDER`, e cliente nativo `http/https` com familia DNS explicita para reduzir falso negativo de runner quando IPv6 do dominio existe mas o caminho saudavel observado e IPv4.
- O smoke publico envia `Accept: application/json` e `SMOKE_USER_AGENT` explicito para reduzir bloqueio de edge/WAF contra runner automatizado.
- O smoke publico adiciona query `_smoke` unica e headers `Cache-Control: no-cache`/`Pragma: no-cache` em cada request para evitar `APP_VERSION` antigo vindo de cache regional.
- No workflow, `SMOKE_ALLOW_EDGE_CHALLENGE=1` transforma challenge HTML 403 da borda/WAF contra o runner externo em warning explicito; resposta JSON com versao errada, timeout, erro de API ou falha sem esse padrao continua bloqueando.
- Quando falha, o smoke publico emite annotation `Public smoke failed` com o ultimo resultado observado para diagnostico visivel na pagina do Actions.
- O painel Staff de deploy classifica o smoke publico como `ok`, `partial`, `edge-challenge`, `api-failure` ou `not-configured`; checks individuais tambem indicam `Borda/WAF`, `HTTP`, `Rede` ou `Config` para separar desafio de borda de API realmente indisponivel.

Modulos principais da API:

- `announcements`, `events`, `dkp`, `auctions`, `drops`;
- `players`, `eligibility`, `item-interests`, `item-requests`, `items`;
- `discord`, `notifications`, `automation`, `audit`, `operations`, `war-room`, `wishlist`, `recruitment`;
- `business-rules`, `staff-review`, `daoshi`, `codex`, `health`, `uploads`.

No modulo `operations`, o controller encaminha rotas Staff e player para servicos
de dominio em `apps/api/src/modules/operations/services`; o provider legado
`OperationsService` foi removido depois da migracao completa das rotas.
`IntegrityService` ja
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
de deploy com versao atual/esperada, health publico, smoke publico, sinais da
fila de webhooks, changelog documentado/recibo e protocolo; este dominio nao
injeta mais o `OperationsService` legado.
`AuctionDiagnosticsService` ja monta diretamente a lista de selecao de leiloes
do diagnostico Staff, incluindo item, vencedor quando houver e data de fim; os
detalhes pesados de timeline operacional e o raio-x completo tambem ja sairam
para esse dominio. A previa read-only de finalizacao, o dossie Staff de leilao e
o dossie universal do tipo `auction` tambem ja sao calculados no dominio de
diagnostico. `AuctionDiagnosticsService` nao injeta mais o `OperationsService`
legado; o controller envia `auction` para esse dominio e os demais dossies para
`UniversalDossierService`.
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
`UniversalDossierService` monta os dossies universais Staff de `player`,
`request`, `interest`, `drop` e `event`; o tipo `auction` continua em
`AuctionDiagnosticsService` para manter o raio-x e o Markdown de leilao no mesmo
dominio.

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
- Apos envio real de changelog Staff, o CLI grava um recibo interno em `DiscordWebhookDelivery` com `action=STAFF_CHANGELOG_SENT`, `webhookKey=staff-updates`, arquivo/titulo/contagem e status `SENT`; URLs de webhook nao sao persistidas.
- Avisos extraordinarios para players podem ser redigidos/revisados no chat Codex e publicados com `npm.cmd run discord:update -- ARQUIVO --announcements`; fazer `--dry-run` antes, manter PT-BR/EN em blocos separados e exigir confirmacao humana antes do envio.
- A tela Staff `/dashboard/staff/discord-templates` consome `GET /operations/staff/discord-templates` e mostra preview real sanitizado de webhooks para anuncios, leiloes, interesses, drops, presenca, requests e review Staff. O payload inclui `username`, `avatar_url`, `content`, `embeds` e `allowed_mentions`, nunca a URL do webhook. Templates player-facing exibem PT-BR e EN; Staff-only fica PT-BR.
- A tela Staff `/dashboard/staff/discord-webhooks` consome `GET /operations/staff/discord-webhooks` e lista entregas persistidas em `DiscordWebhookDelivery`: alvo logico, canal, action, target, status, tentativas, erro resumido e payload sanitizado. `POST /operations/staff/discord-webhooks/:deliveryId/retry` reenvia apenas entregas `FAILED` e `retryable`, buscando a URL pelo `webhookKey` no servidor sem expor segredo.
- Nunca documentar URLs completas de webhook.

Automacao ativa:

- ID `webhook-joke-rotation`.
- Executa a cada 72 horas em worktree.
- Renova variacoes e piadas, preserva regras de idioma e negocio, valida, publica e envia changelog apos producao.
- A rotacao atual cobre embeds, DMs, healthcheck, DKP-LOG, resumo semanal e punchlines do changelog, com bancos renovados em 2026-07-11 para evitar reciclar as frases das revisoes anteriores.

## Seguranca, sessao e uploads

- O navegador autentica por cookie `guild_session` HttpOnly, Secure em producao e SameSite=Lax.
- JWT nao passa em query string e nao fica em localStorage ou acessivel ao JavaScript.
- `GET /auth/me` hidrata o perfil; `POST /auth/logout` encerra a sessao. Bearer token continua aceito para automacoes e smoke autenticado.
- A API aplica headers defensivos, HSTS em producao, limite de body, rate limit para OAuth/upload, CORS com credenciais e `ValidationPipe` com transformacao.
- O rate limit de OAuth/upload usa `apps/api/src/common/rate-limit`: `createRateLimiter`, regras por rota e `RateLimitStore`. O provider atual e `InMemoryRateLimitStore`, adequado para instancia unica; multi-replica deve trocar por Redis/gateway preservando a interface. O plano operacional fica em `docs/RATE_LIMIT_PROVIDER_PLAN_2026_07.md`, com memoria local como default e Redis/gateway sem ativacao por padrao. O health Staff mostra check `rate-limit` com essa condicao operacional.
- O modo manutencao usa a regra de negocio `maintenanceMode` com `{ enabled, message }`. Quando ativo, um guard global bloqueia mutacoes sensiveis em leiloes, finalizacao/automacao, entregas/drops, ajustes DKP, progresso, requests, anuncios, interesses, eventos, Codex, Daoshi, uploads e webhooks operacionais; leituras e health continuam liberados. `PATCH /business-rules/maintenanceMode` permanece liberado para Staff desativar o modo, e `GET /operations/maintenance` alimenta o banner da Web.
- Nao habilitar `whitelist`/`forbidNonWhitelisted` globalmente enquanto os DTOs legados forem classes sem decorators; isso remove ou rejeita campos validos. A migracao deve ser feita por modulo, com teste do contrato antes de endurecer o pipe.
- `staff-review` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam UUIDs, notas e motivos antes de aprovar/rejeitar vencedor, override, remover bid, reabrir/cancelar leilao ou revisar cancelamento de bid.
- `codex` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam print do pedido, print de comprovante opcional, nota opcional e motivo de cancelamento antes do fluxo player/Staff.
- `daoshi` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam print, data, valores positivos, lancamento manual e nota de review antes de processar recibos e revisoes Staff.
- `announcements` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seu DTO valida tipo, titulo, data ISO, campos opcionais e bosses de presenca em lote antes de criar anuncio/eventos.
- `events` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam criacao de evento, registro de presenca e cancelamento antes da rotina Staff de presenca/DKP.
- `search` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seu DTO valida a query `q`, rejeita parametros extras e limita o termo antes da busca global/player Staff.
- `item-requests` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam criacao Staff/player, comprovante de update, aprovacao de update, entrega e UUIDs de mutacoes antes do fluxo de fila/entrega.
- Upload aceita somente PNG, JPEG e WebP confirmados por magic bytes, usa UUID/extensao controlada e remove temporarios. SVG e conteudo disfarçado sao rejeitados.
- `notifications` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seu DTO valida UUID de notificacao antes de marcar leitura, preservando as rotas de listagem e marcar todas como lidas.
- `audit` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam `targetType`, `targetId`, `page` e `limit` na timeline Staff, mantendo `/audit/health` publico.
- `business-rules` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam chaves conhecidas e exigem body `{ value }` nas atualizacoes sem tipar rigidamente o JSON de cada regra.
- `war-room` ja usa `ValidationPipe` local com `whitelist` e `forbidNonWhitelisted`; seus DTOs validam tipo/status/prioridade, janela ISO, links internos, UUID de evento, slots de escala, presenca Staff, confirmacao player e eventos da timeline ao vivo antes do fluxo de operacoes competitivas.
- Em producao, novos uploads usam `IMAGE_STORAGE_PROVIDER=local` com volume persistente `UPLOADS_HOST_DIR` montado em `/app/uploads`; o proxy publico deve rotear `/uploads/` para a API. Links antigos do Google Drive podem continuar existindo ate a migracao do legado.
- A migracao do legado do Google Drive usa `npm run images:migrate-drive`: primeiro `--dry-run`, depois `--apply --limit 10`, e por fim `--apply`; o script gera manifesto em `reports/`, valida magic bytes e atualiza campos de imagem para `/uploads/...`.
- `GET /health` e publico e minimo: status, horario e `APP_VERSION`. Detalhes exigem Staff/Admin em `GET /health/details`.
- A Web aplica CSP, protecao contra framing, politica de referrer e permissoes restritas.

## UX e navegacao

- A navegacao principal e agrupada em Agora, Loot, Progresso e Conta.
- No mobile ficam quatro destinos principais e o menu `Mais`; a central Staff agrupa ferramentas por contexto operacional.
- A busca global `Ctrl+K` consulta itens, leiloes e eventos; resultados de players existem apenas no endpoint Staff.
- Busca possui modulo e hook proprios; novos dominios nao devem recriar arquivo gigante em `operations` ou `use-guild-api.ts` quando puderem ter ownership independente.
- Na Web, `apps/web/src/hooks/use-guild-api.ts` e apenas um barrel temporario. Hooks ficam separados por dominio: `use-profile-api`, `use-dkp-api`, `use-staff-operations-api`, `use-auctions-api`, `use-items-api`, `use-requests-api`, `use-events-api`, `use-codex-api`, `use-daoshi-api` e `use-drops-api`; telas novas devem importar direto do dominio.
- A central de pendencias filtra por severidade e mostra responsavel, abertura e prazo quando aplicavel. Prazos Staff derivam dos thresholds configuraveis.
- Acoes destrutivas e financeiras usam `ConfirmationDialog` acessivel, sem `window.confirm` ou `window.prompt`.
- O shell possui skip-link, foco visivel global e respeito a `prefers-reduced-motion`.
- A politica oficial esta em `/privacy`; a rota legada redireciona para ela.
- O dashboard do player em `/dashboard` consulta `GET /operations/me/action-plan` e mostra cards acionaveis com proximo passo, motivo, impacto, prioridade e link direto para codex, progresso, requests, bids proprios, interesses, leiloes disponiveis e eventos proximos. O payload nao inclui ranking, bids nem concorrentes de outros players.
- A timeline do player em `/dashboard/timeline` usa `GET /players/me/history` e mostra historico narrado com filtros por tipo e periodo. O payload segue compativel com o historico antigo e enriquece `timeline` com texto PT-BR/EN, tom visual, link de acao e metadados seguros. Entradas de leilao continuam restritas ao proprio bid e status do leilao, sem ranking, concorrentes ou locks de terceiros.
- A pagina de leilao para player mostra um painel "antes do bid" com elegibilidade propria: camada atual/exigida, DKP disponivel/exigido, attendance, modo do leilao e se a entrega passa por review Staff. O endpoint `GET /eligibility/player/:playerId/auction/:auctionId` inclui esses campos apenas para o player consultado e nao expõe ranking, concorrentes ou bids de terceiros.
- A pagina de leilao finalizado tambem consulta `GET /auctions/:id/result/me` para mostrar recibo seguro do resultado ao player autenticado. O recibo so fica disponivel quando o leilao esta `FINISHED`, diferencia `WINNER`, `PARTICIPANT` e `OBSERVER`, traz bid proprio quando houver, custo apenas para o vencedor, regra aplicada, status de entrega e mensagens PT-BR/EN. `GET /auctions/:id/timeline/me` mostra timeline player-facing sanitizada em PT-BR/EN com abertura, janela encerrada, review Staff, resultado, entrega pendente/concluida, relist ou cancelamento. Esses payloads nao incluem ranking, bids de terceiros, locks de terceiros, identidade de concorrentes nem custo do vencedor para nao vencedores; a timeline completa segue Staff-only no diagnostico operacional.
- Contestacao pos-leilao usa `AuctionDispute`: um registro unico por leilao/player, motivo, print opcional, status `PENDING`/`ACCEPTED`/`REJECTED`, nota Staff interna e notas externas PT-BR/EN. `auctionDisputeRules` em `BusinessRule` controla `enabled` e `windowHours` (default 48h). Player consulta/cria por `GET /auctions/:id/dispute/me` e `POST /auctions/:id/disputes`; somente participante de leilao `FINISHED` dentro da janela pode abrir. Staff usa `GET /auctions/staff/disputes?status=...` e `POST /auctions/staff/disputes/:disputeId/review`; revisar contestacao audita a decisao e nao reabre leilao automaticamente.
- No perfil do player, `dimensionalLayer` e a camada operacional de 1 a 10. CP nao e editado diretamente ali: o player deve postar progresso `STATUS` com print, e a Staff aprova para atualizar o CP.
- O perfil de combate do player fica em `PlayerCombatProfile`: classe primaria/secundaria, build declarada, papel preferido, papeis aceitos, disponibilidade e notas publica/Staff. O player visualiza apenas o proprio perfil em `/dashboard/profile` e pode enviar `PlayerCombatProfileChangeRequest` com nota/print opcional; a Staff revisa os pedidos em `/dashboard/staff/players`, aprova/rejeita com auditoria e pode editar o roster diretamente. A classe primaria aprovada sincroniza `Player.class`.
- A matriz de composicao Staff fica em `GET /players/combat-roster` e e consumida por `/dashboard/staff/players`: contagens por classe, role, camada e disponibilidade, filtros por disponibilidade/camada/classe/role/presenca/STATUS, alertas de falta de frontline/suporte, reservas demais, build ausente, STATUS antigo, baixa presenca e disponibilidade incompleta, alem de Markdown copiavel para reuniao Staff. O endpoint e Staff-only.
- O dossie de escala do War Room em `GET /war-room/operations/:operationId/roster` tambem retorna `compositionImpact` e `suggestions`: cobertura por papel/classe, lacunas de comp e candidatos ativos ainda nao escalados com score, papel sugerido, motivos e alertas. `/dashboard/staff/war-room` mostra esses dados e permite aplicar sugestao ao formulario, mas a criacao do slot continua manual e Staff-only.
- O War Room Staff fica em `/dashboard/staff/war-room` e consome `/war-room/operations`: operacoes competitivas Staff-only com tipo (`CLASH`, `ANCIENT_FORTRESS`, `ABYSS`, `GUILD_RAID`, `CUSTOM`), janela, status, prioridade, mapa/regiao, objetivo, notas, resultado, placar livre, pontos de melhoria, links internos e evento vinculado opcional. O fluxo atual cobre criar, editar via API, abrir, encerrar e cancelar com auditoria; a escala por operacao usa `WarRoomRosterSlot` com funcao tatica, status, classe/camada esperadas, instrucoes publicas PT-BR/EN, notas, confirmacao do player e presenca real. A Staff ve contadores de confirmados/pendentes/recusados/reservas/ausentes e conflitos de operacao sobreposta, STATUS antigo, camada baixa, classe ausente e baixa presenca. O painel ao vivo usa `WarRoomTimelineEvent` e `GET /war-room/operations/:operationId/live` para checklist calculado, timeline persistida, calls/notas/eventos taticos tipados e autoria Staff; `GET /war-room/operations/:operationId/after-action` gera pos-guerra Staff com planejado vs realizado, sinais e Markdown copiavel. O player usa `/dashboard/my-war-room` e `/war-room/me` para ver apenas a propria chamada e confirmar/recusar, com instrucoes PT-BR e EN em blocos separados.
- A tela Staff `/dashboard/staff/economy` consome `GET /dkp/staff/economy` e mostra snapshot Staff-only da economia DKP: distribuicao por faixas, media, mediana, concentracao dos top 10, atividade 30d, DKP travado, top acumuladores, ganhos/gastos, acumuladores inativos, sinais de inflacao/concentracao/rotatividade e Markdown copiavel. O simulador de decay usa `POST /dkp/staff/simulations/decay/preview` para calculo hipotetico read-only e `POST /dkp/staff/simulations/decay` para salvar rascunho auditado em `DkpPolicySimulation` tipo `DECAY`. O simulador de politica de bids usa `POST /dkp/staff/simulations/bid-policy/preview` e `POST /dkp/staff/simulations/bid-policy` para calcular/salvar rascunhos `BID_POLICY` sobre leiloes finalizados recentes com `AUCTION_WIN`, comparando gasto atual vs proposto por custo minimo, taxa do vencedor, teto por tier/tipo/camada, custo fixo por tier e multiplicador por modo de leilao. `POST /dkp/staff/simulations/:simulationId/promote` promove apenas rascunho `BID_POLICY` em `DRAFT` com `confirm` e motivo Staff, grava `DkpPolicySimulation.status = PROMOTED`, `promotedAt`, `promotedById`, `promotionReason`, audita a acao e publica a regra operacional documentada `dkpBidPolicy` em `BusinessRule`. `GET /dkp/staff/simulations` lista rascunhos recentes de todos os tipos. Players continuam sem acesso a distribuicao global, ranking Staff de economia ou simulacoes.
- Em interesses abertos de equipamento, o player pode marcar o atalho de transmutar: a Web dispensa upload manual, usa o asset publico `/transmutar.png` como `imageUrl`, grava `ItemInterestEntry.isTransmuteRequest` e pede confirmacao do Aristolfo antes de registrar.
- A tela player de interesses em `/dashboard/interests` permite selecionar varios posts abertos e declarar em lote. Cada post mantem nota, print ou transmutar proprio; a confirmacao unica envia cada declaracao pelo endpoint existente para preservar validacoes de duplicidade, janela aberta e print obrigatorio.
- Ao fechar um interesse em que todas as declaracoes sao de transmutar, o sistema pula a votacao da Staff e sorteia automaticamente. Quem recebeu item de transmutar do mesmo `ItemType` nas ultimas 24h fica fora enquanto houver ao menos um interessado livre. Se todos os interessados estiverem nesse bloqueio de 24h, o post nao fecha vazio: o sistema faz fallback ponderado com base nos recebimentos de transmutar dos ultimos 30 dias, dando menos peso a quem recebeu mais.
- As regras de sorteio/transmutar de interesses pertencem ao dominio `ItemInterestTransmuteRaffleService`; `ItemInterestsService` apenas coordena fechamento, status, auditoria e persistencia.
- A tela Staff de interesses em `/dashboard/staff/interests` consome `GET /item-interests/staff/list`, endpoint Staff-only que adiciona `staffComparison` por interessado: classe, camada, presenca, DKP total/travado/disponivel, requests ativos, ultima nota Staff, historico de loot e sinais operacionais. O endpoint normal dos players nao recebe esse comparador sensivel.
- A implementacao Web de `/dashboard/staff/interests` fica em componentes locais da rota (`_components/staff-interests-page-content.tsx` e filtros), mantendo a pagina fina e o estado/mutacoes no nivel da experiencia Staff.
- A implementacao Web de `/dashboard/admin/items` fica em componentes locais da rota (`_components/item-create-form-card.tsx`, `item-catalog-controls-card.tsx` e `item-catalog-card.tsx`), mantendo estado e mutacoes na pagina para preservar contratos e comportamento de leilao/interesse.
- A central Staff em `/dashboard/staff` abre com o resumo matinal Staff de `GET /operations/staff/morning-briefing`, reunindo urgencias, leiloes vencidos/proximos, reviews, entregas, integridade, saude e secoes acionaveis com Markdown copiavel. Abaixo ficam abas de jornada (`Resolver agora`, `Auditar`, `Configurar`, `Comunicar`, `Operar deploy`) com contadores, cards filtrados e proximas acoes por grupo, alem de pendencias, saude e auditoria.
- O modo reuniao Staff em `/dashboard/staff/meeting` consome `GET /operations/staff/meeting`, que preserva os campos antigos e adiciona `meetingDay`, `sections`, `resolvedItemKeys` e `markdown`. As secoes cobrem decisoes de loot, pendencias travadas, economia DKP, players sensiveis, progresso de boss/lote, comunicados e acoes ate a proxima reuniao. `POST /operations/staff/meeting/items/:itemKey/resolve` marca item como resolvido no dia operacional via audit log `STAFF_MEETING_ITEM_RESOLVED`.
- O dossie universal Staff em `/dashboard/staff/dossier` consome `GET /operations/staff/dossiers/:type/:id` e gera contexto auditavel com resumo, links internos, audit logs e Markdown copiavel para `player`, `auction`, `request`, `interest`, `drop` e `event`. O endpoint e Staff-only e nao retorna segredos, URLs de webhook ou payload privado desnecessario.
- Para dossie universal de `player`, o payload Staff-only inclui `riskFlags`: sinais explicativos com severidade e link de evidencia para trial/recente, baixa presenca, ausencia recente, loot caro recente, falta de progresso aprovado recente, build incompleta, classe critica, muitas contestacoes, muitas trocas de classe/build e DKP travado alto. Flags nao bloqueiam nem punem automaticamente; sao contexto para decisao humana da Staff.
- O dossie Staff de player tambem consulta `GET /operations/staff/player-eligibility/:playerId/context` para elegibilidade contextual Staff-only de `auction`, `request`, `war-room` e `recruitment`. O payload retorna decisao `eligible`/`review`/`blocked`, motivos por camada, presenca, DKP, classe/build, historico recente, regra aplicada e links de evidencia. Leilao reutiliza o calculo transacional de elegibilidade sem auditar tentativa de bid; players continuam vendo apenas a elegibilidade propria ja permitida.
- O diagnostico Staff de leilao em `/dashboard/staff/auction-diagnostics` seleciona qualquer leilao por lista, exibindo item, vencedor registrado por `AUCTION_WIN` quando houver e data de encerramento antes de consultar o raio-x completo. A tela tambem mostra motivo visual do estado atual, previa de finalizacao Staff-only, dossie Markdown copiavel e timeline operacional derivada de leilao, bids, locks, cancelamentos, votos, transacoes, entrega e audit logs. Endpoints sensiveis: `GET /operations/staff/auction-diagnostics/:auctionId/finalization-preview` e `GET /operations/staff/auction-diagnostics/:auctionId/dossier`.
- A tela Staff `/dashboard/staff/reviews` recebe `assistedReview` em `GET /staff/reviews/:auctionId`: alertas compactos de candidato inelegivel, review exigida, divergencia bid/lock, baixa presenca, score baixo e votos divididos. `POST /staff/reviews/:auctionId/alerts/override` registra `AUCTION_REVIEW_ALERT_OVERRIDDEN` com motivo obrigatorio para ignorar alerta, sem aprovar vencedor, rejeitar resultado ou invalidar bid automaticamente; a decisao humana e o quorum continuam soberanos.
- A tela Staff `/dashboard/staff/deliveries` consome `GET /drops/pending-auction-deliveries`, que preserva `auction`, `player` e `transaction` e adiciona `urgency`, `ageHours`, `deliveryDueAt` e `priorityReason`. A tela mostra contadores, filtros por todos/atrasados/hoje/sem prova, busca por player/item, filtro por tier, badges de urgencia e prazo para impedir drop vencido esquecido. As tarefas Staff `DROP_DELIVERY` tambem carregam idade e motivo de prioridade no metadata para dashboard e meeting.
- Eventos possuem metadados operacionais opcionais versionados pela migration `20260711170000_add_event_operational_planning`: `operationalCategory` (`BOSS`, `ABYSS`, `GUILD_RAID`, `FARM`, `TRAINING`, `CLASH`, `CUSTOM`), `priority`, `endsAt`, `responsibleUserId`, `checklist` JSON e `operationalNotes`. Defaults mantem eventos antigos compativeis e boss batch continua criando eventos/presencas/DKP independentes.
- A tela Staff `/dashboard/admin/events` cria e mostra categoria, prioridade, janela, responsavel, notas e checklist por conteudo. `POST /events/:id/checklist/:key` marca/desmarca item com nota opcional e audita `EVENT_CHECKLIST_ITEM_UPDATED`; War Room vinculada a evento inclui esse checklist no live dossier junto do checklist tatico.
- `GET /events/:id/readiness` e Staff-only e mostra prontidao pre-evento com presentes provaveis, ausencias relativas aos ativos, gaps de classe/papel, camadas, CP aprovado, STATUS desatualizado, notas PT-BR e `actionLinks` para presenca, requests, interesses, roster, War Room e progresso. Nenhum dado sensivel dessa leitura e exposto a players.
- Wishlist inteligente usa `PlayerWishlistItem` com prioridade `LOW`/`MEDIUM`/`HIGH`/`CRITICAL`, status `ACTIVE`/`PAUSED`/`FULFILLED`/`REMOVED`, motivo, build, nota e print opcional vinculados ao `ItemCatalog`. Player usa `/dashboard/wishlist` e `GET/POST /wishlist/me`, alem de `PATCH /wishlist/me/:wishlistItemId/pause|resume|remove`, vendo apenas os proprios desejos.
- Staff usa `/dashboard/staff/wishlist` e `GET /wishlist/staff/items` para demanda agregada por item, prioridade, classe, camada, atividade e sinais operacionais; `POST /wishlist/staff/:wishlistItemId/fulfill` marca desejo como atendido com nota e auditoria `WISHLIST_ITEM_FULFILLED_BY_STAFF`. Esse fluxo nao cria bid, nao inscreve interesse e nao registra drop automaticamente.
- `GET /operations/staff/guild-progress?period=week|month` gera relatorio Staff read-only com eventos, presencas, drops, leiloes, requests, progresso, War Room, wishlist, riscos, distribuicao de classes, proximas acoes e Markdown copiavel; `/dashboard/staff/guild-progress` e a tela executiva da Staff.
- `GET /operations/me/weekly-summary?period=week|month` gera resumo player-facing seguro em PT-BR/EN com apenas numeros coletivos e links para eventos, progresso e wishlist; `/dashboard/weekly-summary` nao mostra ranking individual nem dados sensiveis de terceiros.
- Recrutamento publico usa `/apply` e `POST /recruitment/applications` com conteudo PT-BR/EN, aceite obrigatorio de regras e rate limit local por origem. A candidatura registra nick, Discord, classe, CP, camada, disponibilidade, foco, experiencia, print/prova opcional e observacoes sem publicar dados sensiveis.
- Staff usa `/dashboard/staff/recruitment`, `GET /recruitment/staff/applications?status=...`, `POST /recruitment/staff/applications/:applicationId/review` e `POST /recruitment/staff/applications/:applicationId/convert`. Status operacionais: `PENDING`, `TRIAGE`, `ACCEPTED`, `REJECTED`, `CONVERTED`, `ARCHIVED`; toda decisao exige motivo e auditoria.
- A conversao de recrutamento cria `Player`, perfil de combate inicial e nota Staff com checklist de onboarding, vinculando `convertedPlayerId/convertedAt` na candidatura e bloqueando duplicidade por nick/usuario. O fluxo exige `userId` existente e nao automatiza Discord, roles ou permissoes externas.
- O programa completo de melhorias de produto/UX/processo fica em `docs/RAVEN2_PRODUCT_IMPROVEMENT_PROGRAM.md`, com epicos para leiloes, Staff, players, requests, interesses, eventos, Discord, auditoria, deploy e arquitetura.
- O programa de melhorias original e historico consolidado da primeira rodada:
  itens com `Estado em ... implementado` nao devem ser reexecutados como backlog
  ativo. A rodada de implantacao 2026-07 fica em
  `docs/RAVEN2_IMPLEMENTATION_ROADMAP_2026_07.md` e esta concluida. A proxima
  rodada curta fica em `docs/RAVEN2_MAINTENANCE_ROADMAP_2026_07.md`; antes de
  programar qualquer fatia, reconciliar roadmap, `git log`, wiki e arquivos
  citados.

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
- Requests em `/dashboard/item-requests` recebem `queueForecast` nos endpoints existentes. A previsao e calculada por `ItemRequestQueueService` a partir da fila atual e `DropHistory`, mostrando posicao/tamanho da fila, pedidos e unidades antes, idade do update, ultima entrega conhecida, estagio do update e resumo PT-BR/EN. Nao muda a ordenacao, nao promete entrega automatica e nao exige migration.
- Requests tambem podem receber `swapSuggestions`: ate tres itens requestaveis ativos da mesma categoria e, quando aplicavel, mesmo tier/tipo, com fila menor. A UI mostra posicao estimada, unidades na fila e trade-off PT-BR/EN; a troca continua manual/controlada pela Staff.
- Requests tambem recebem `materialPriority`: requests de craft T3 mostram selo de prioridade operacional, e requests de Quintessencia afetados por craft T3 do mesmo material inferido mostram aviso simplificado para player e texto operacional para Staff.
- A entrega Staff de Quintessencia bloqueada por prioridade T3 e impedida e gera auditoria `ITEM_REQUEST_T3_PRIORITY_DELIVERY_BLOCKED` com material inferido e requests de craft que bloquearam.
- A rota Web `/dashboard/item-requests` usa componentes locais em `_components`: `page.tsx` fica como guard/entrada, `item-request-panels.tsx` concentra os paineis player/Staff e `item-request-common.tsx` guarda paineis reutilizados de forecast, sugestoes e prioridade.

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
- Backup gera SHA-256, aplica retencao, aceita criptografia GPG e hook off-site. `BACKUP_VERIFY_AFTER=1 scripts/prod/backup-postgres.sh` cria o dump e roda `verify-backup.sh` no arquivo recem-gerado; o verificador restaura em PostgreSQL temporario para provar integridade e grava `last-verified-backup.json` sem segredo. Quando herda `BACKUP_STATUS_FILE=/app/backups/...` da API, o job no host grava o marcador equivalente em `BACKUP_DIR`; `BACKUP_HOST_STATUS_FILE` pode sobrescrever o caminho do host. A API le `BACKUP_STATUS_FILE` ou `/app/backups/last-verified-backup.json` e mostra idade do ultimo backup verificado no health privado e nos checks Staff; acima de `BACKUP_MAX_AGE_HOURS` (26h padrao) fica degradado.
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
- `docs/SAAS_GUILD_COMPOSE_GUIDE.md` tambem contem o checklist operacional de
  nova guilda: pre-flight sem segredo, database/usuario restrito,
  uploads/backups, env por guilda, DNS/proxy, Discord OAuth/webhooks,
  migrations, smoke, backup verificado e rollback.
- `npm run guild:dry-run -- --guild ... --compose ... --env-file ...` valida
  uma stack de nova guilda antes do `up -d`, sem imprimir valores de segredo, e
  falha quando detecta marcadores G3X reaproveitados em guilda externa.
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
- O rate limit atual usa provider em memoria local por tras de `RateLimitStore`. Se a API escalar para varias replicas, seguir `docs/RATE_LIMIT_PROVIDER_PLAN_2026_07.md`: implementar provider Redis ou delegar ao gateway compartilhado, mantendo `memory` como default e sem registrar segredos.

## Documentos de referencia

- `AGENTS.md`: regras obrigatorias para chats futuros.
- `docs/ICP_DOCKER_IMAGES.md`: deploy por imagens e Watchtower.
- `docs/SAAS_SINGLE_TENANT_ROADMAP.md`: plano para empacotar o Raven como SaaS por instancia Docker isolada por guilda.
- `docs/SAAS_GUILD_COMPOSE_GUIDE.md`: guia pratico para Compose por guilda e database PostgreSQL isolada.
- `docs/RATE_LIMIT_PROVIDER_PLAN_2026_07.md`: plano para provider Redis/gateway de rate limit, sem ativar por padrao.
- `docs/RAVEN2_MAINTENANCE_ROADMAP_2026_07.md`: proxima rodada curta de manutencao, validacao forte e observabilidade.
- `docs/RAVEN2_GUILD_WAR_PRODUCT_ROADMAP_2026_07.md`: roadmap de produto para War Room de Clash/GvG, roster por classe/build, simulador de DKP, transparencia pos-leilao, risco operacional, bosses/Abyss, wishlist, relatorio semanal e recrutamento pelo site.
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
| 2026-07-11 | Setima rotacao automatica renovou o humor dos webhooks, DMs, healthcheck, DKP-LOG, resumo semanal e changelog sem mudar payloads, identidade, idiomas ou regras. | webhook-joke-rotation |
| 2026-07-11 | Fatia 2.3 do roadmap War/Guild implementada: War Room passou a consumir roster real com impacto de composicao e sugestoes explicaveis de escala, sem automacao de decisao. | roster/War Room |
| 2026-07-11 | Frente 9 do roadmap War/Guild implementada: recrutamento publico pelo site, fila Staff por status e conversao auditada para player com perfil inicial e checklist de onboarding. | recrutamento |
| 2026-07-11 | Frente 8 do roadmap War/Guild implementada: relatorio Staff semanal/mensal e resumo player seguro com numeros coletivos, riscos e proximas acoes. | relatorios/Staff |
| 2026-07-11 | Frente 7 do roadmap War/Guild implementada: wishlist player/Staff com demanda por item, prioridade, sinais operacionais e fulfil auditado sem automacao de loot. | wishlist/loot |
| 2026-07-11 | Frente 6 do roadmap War/Guild implementada: eventos ganharam planejamento operacional, checklist auditado, integracao com War Room e prontidao Staff com links de acao. | eventos/War Room |
| 2026-07-11 | Fatia 5.3 do roadmap War/Guild implementada: review Staff de leilao ganhou alertas assistidos e override auditado com motivo, sem automatizar a decisao humana. | review/Staff |
| 2026-07-11 | Fatia 5.2 do roadmap War/Guild implementada: elegibilidade contextual Staff-only para leilao, request, War Room e recrutamento com motivos estruturados e sem ampliar payload player-facing. | elegibilidade/Staff |
| 2026-07-11 | Fatia 5.1 do roadmap War/Guild implementada: dossie universal de player ganhou risk flags operacionais Staff-only com severidade, explicacao e evidencia, sem acao automatica. | risco/dossie |
| 2026-07-11 | Fatia 4.3 do roadmap War/Guild implementada: contestacao pos-leilao com janela configuravel, fila Staff filtravel, status player claro, notas PT-BR/EN e auditoria sem reabrir leilao automaticamente. | leiloes/contestacao |
| 2026-07-11 | Fatia 4.2 do roadmap War/Guild implementada: timeline segura player-facing de leilao com eventos sanitizados PT-BR/EN, mantendo timeline completa apenas para Staff. | leiloes/timeline |
| 2026-07-11 | Fatia 4.1 do roadmap War/Guild implementada: recibo seguro pos-leilao para player com papéis vencedor/participante/observador, PT-BR/EN e sem vazamento de bids/ranking/locks de terceiros. | leiloes/player |
| 2026-07-11 | Fatia 3.4 do roadmap War/Guild implementada: rascunhos `BID_POLICY` podem ser promovidos para regra operacional `dkpBidPolicy` com confirmacao, motivo, status `PROMOTED` e auditoria. | DKP/politica |
| 2026-07-11 | Fatia 3.3 do roadmap War/Guild implementada: simulador Staff de politica de bids com cap/taxa/floor, comparacao historica, riscos, Markdown e rascunhos auditados. | DKP/bid-policy |
| 2026-07-11 | Fatia 3.2 do roadmap War/Guild implementada: simulador Staff de decay com preview read-only, impacto por player, Markdown e rascunhos persistidos/auditados. | DKP/simulador |
| 2026-07-11 | Fatia 3.1 do roadmap War/Guild implementada: snapshot Staff de economia DKP com distribuicao, concentracao, sinais de risco, acumuladores inativos e Markdown. | DKP/economia |
| 2026-07-11 | Fatia 1.4 do roadmap War/Guild implementada: pos-guerra com placar, melhorias, planejado vs realizado, sinais e Markdown Staff copiavel. | war-room/pos-guerra |
| 2026-07-11 | Fatia 1.3 do roadmap War/Guild implementada: painel ao vivo Staff com checklist calculado, timeline persistida, eventos taticos tipados, refresh e auditoria. | war-room/live |
| 2026-07-11 | Fatia 1.2 do roadmap War/Guild implementada: escala por operacao com slots taticos, confirmacao player, presenca real, conflitos operacionais, API/Web e auditoria. | war-room/escala |
| 2026-07-11 | Fatia 1.1 do roadmap War/Guild implementada: modulo War Room com entidade de operacao competitiva, API Staff CRUD, auditoria de ciclo de vida e tela Staff inicial. | war-room |
| 2026-07-11 | Fatia 2.2 do roadmap War/Guild implementada: matriz Staff de composicao com endpoint read-only, contadores, alertas de gargalo, filtros e Markdown copiavel. | roster/matriz de composicao |
| 2026-07-11 | Fatia 2.1 do roadmap War/Guild implementada: perfil de combate com schema, contratos compartilhados, API Staff/player validada, pedidos de atualizacao do player, roster Staff editavel e auditoria. | roster/perfil de combate |
| 2026-07-11 | Criado roadmap de produto para transformar o Raven em central tatica de guilda pelo site, cobrindo War Room, roster, DKP simulator, transparencia pos-leilao, riscos, bosses/Abyss, wishlist, relatorio semanal e recrutamento, sem comandos Discord. | docs/roadmap |
| 2026-07-10 | Criado dry-run de stack por guilda para validar Compose/env/diretorios/database sem imprimir segredos e bloquear marcadores G3X em guildas externas. | SaaS single-tenant |
| 2026-07-10 | Checklist de nova guilda single-tenant foi consolidado com pre-flight, env por guilda, Discord, smoke, backup verificado e rollback. | SaaS single-tenant |
| 2026-07-10 | Painel Staff de deploy passou a classificar smoke publico e health externo por tipo de diagnostico, separando challenge de borda/WAF de falha real de API. | deploy/smoke |
| 2026-07-10 | Tela Web de admin items foi componentizada com componentes locais da rota, mantendo UX e contratos sem alteracao. | arquitetura/Web |
| 2026-07-10 | Modulo `business-rules` ganhou DTOs e `ValidationPipe` local forte para validar chave de regra e body `{ value }` nas atualizacoes Staff. | validacao/API |
| 2026-07-10 | Modulo `audit` ganhou DTOs e `ValidationPipe` local forte para validar alvo e paginacao da timeline Staff sem mudar `/audit/health`. | validacao/API |
| 2026-07-10 | Modulo `notifications` ganhou DTO e `ValidationPipe` local forte para validar UUID antes de marcar notificacao como lida. | validacao/API |
| 2026-07-10 | Criado roadmap curto de manutencao pos-rodada 2026-07, priorizando validacao forte em `notifications`, `audit`, `business-rules`, componentizacao de admin items e observabilidade sem segredo. | docs/roadmap |
| 2026-07-10 | Provider Redis/gateway de rate limit foi planejado sem ativacao por padrao; `InMemoryRateLimitStore` continua default para instancia unica da G3X. | rate-limit/multi-guilda |
| 2026-07-10 | Painel Staff de deploy passou a mostrar sinais da fila de webhooks: pendentes, envio, retry, falhas, idade da pendencia mais antiga, ultimo retry e ultima falha. | deploy/Staff |
| 2026-07-10 | CLI de changelog Staff passou a registrar recibo interno sanitizado em `DiscordWebhookDelivery`, e o painel de deploy marca changelog como concluido quando encontra recibo do arquivo mais recente. | deploy/Staff |
| 2026-07-10 | Tela Staff de interesses foi componentizada com componentes locais da rota, mantendo UX e contratos sem alteracao. | arquitetura/Web |
| 2026-07-10 | Sorteio/transmutar de item-interests saiu do servico principal para `ItemInterestTransmuteRaffleService`, preservando bloqueio 24h e fallback ponderado 30d. | arquitetura/API |
| 2026-07-10 | Contratos de item-interests passaram para `packages/shared/src/types/interests.ts`, com aliases locais na API e Web para posts, entries, votos e comparador Staff. | contratos/shared |
| 2026-07-10 | Modulo `item-requests` ganhou DTOs com `class-validator`, pipe local forte e validacao UUID nos IDs de mutacao. | validacao/API |
| 2026-07-09 | Tela Web de item requests foi componentizada com componentes locais da rota, mantendo UX e contratos sem alteracao. | arquitetura/Web |
| 2026-07-09 | Calculo de forecast, sugestoes e prioridade de material de item-requests saiu do servico principal para `ItemRequestQueueService`, com teste direto de regressao. | arquitetura/API |
| 2026-07-09 | Contratos de item-requests passaram para `packages/shared/src/types/requests.ts`, com aliases locais na API e Web para request, forecast de fila, sugestoes de troca e prioridade de material. | contratos/shared |
| 2026-07-09 | Modulo `search` ganhou DTO com `class-validator` e pipe local forte para a query `q`, rejeitando parametros extras antes do servico de busca. | validacao/API |
| 2026-07-09 | Contratos de eventos passaram para `packages/shared/src/types/events.ts`, com aliases locais na API e Web para preservar datas de servidor/cliente. | contratos/shared |
| 2026-07-09 | Roadmap original ganhou controle anti-reexecucao e foi criado o roadmap de implantacao 2026-07 para a proxima rodada de melhorias sem iniciar programacao. | docs/roadmap |
| 2026-07-09 | Smoke publico passou a bloquear deploy somente pelo `/health` com `APP_VERSION` esperado; healths de modulos viraram diagnostico auxiliar para evitar falso negativo de borda no runner externo. | deploy/smoke |
| 2026-07-09 | Workflow passou a tolerar challenge HTML 403 da borda contra runner GitHub no smoke publico, emitindo warning explicito em vez de falhar quando a requisicao nao chega na API. | deploy/smoke |
| 2026-07-08 | Smoke publico passou a emitir annotation de falha com ultimo resultado observado para diagnostico publico do Actions. | deploy/smoke |
| 2026-07-08 | Smoke publico ganhou cache-buster `_smoke` e headers no-cache por request para evitar health antigo em edge regional. | deploy/smoke |
| 2026-07-08 | Smoke publico passou a enviar `Accept: application/json` e `SMOKE_USER_AGENT` explicito nas chamadas do runner externo. | deploy/smoke |
| 2026-07-08 | Smoke publico passou a preferir DNS IPv4-first por padrao, com override `SMOKE_DNS_ORDER`, usando cliente nativo `http/https` com familia DNS explicita para estabilizar verificacao feita por runner externo. | deploy/smoke |
| 2026-07-08 | Smoke publico ganhou logs de configuracao e timeout explicito por fetch/step para evitar job preso durante verificacao pos-Watchtower. | deploy/smoke |
| 2026-07-08 | Smoke publico pos-deploy do workflow ganhou janela estendida de tentativas mantendo validacao obrigatoria de `APP_VERSION`. | deploy/smoke |
| 2026-07-08 | Modulo `events` ganhou DTOs com `class-validator` e pipe local forte com whitelist/forbidNonWhitelisted para criacao, presenca e cancelamento. | validacao/API |
| 2026-07-08 | Sexta rotacao automatica renovou o humor dos webhooks, DMs, DKP-LOG, resumo semanal e changelog sem mudar payloads, identidade, idiomas ou regras. | webhook-joke-rotation |
| 2026-07-08 | Sorteio 100% transmutar preserva bloqueio de 24h por tipo quando ha player livre e usa fallback ponderado pelos recebimentos dos ultimos 30 dias quando todos ja receberam. | interesses/transmutar |
| 2026-07-02 | Modulo `announcements` ganhou DTO com `class-validator` e pipe local forte com whitelist/forbidNonWhitelisted para criacao de anuncios. | validacao/API |
| 2026-07-02 | `OperationsService` legado foi removido do modulo `operations`; controller e providers ficaram somente com servicos de dominio. | arquitetura/API |
| 2026-07-02 | Dossies universais Staff de player, request, interest, drop e event sairam do `OperationsService` legado para `UniversalDossierService`; auction continua no dominio de diagnostico. | arquitetura/API |
| 2026-07-02 | Audit recente Staff de `operations/staff/audit` saiu do `OperationsService` legado para `OperationsAuditService`. | arquitetura/API |
| 2026-07-02 | Resumo player, notices e action plan de `operations/me/*` sairam do `OperationsService` legado para `PlayerOperationsService`. | arquitetura/API |
| 2026-07-02 | Regras da guilda e leitura do modo manutencao sairam do `OperationsService` legado para `OperationsRulesService`. | arquitetura/API |
| 2026-07-02 | Previews de webhooks, fila sanitizada e retry manual sairam do `OperationsService` legado para `DiscordOperationsService`. | arquitetura/API |
| 2026-07-02 | Backup de producao ganhou modo `BACKUP_VERIFY_AFTER=1` e traducao do caminho `/app/backups/...` para `BACKUP_DIR` quando o verificador roda no host, mantendo fresco o marcador lido pelo health Staff. | backup/health |
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
