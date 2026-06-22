# ERP Raven 2 - Wiki operacional

**Ultima revisao:** 2026-06-21

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
- Tipos compartilhados: `packages/shared`.
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

## Regras de comunicacao

Fonte detalhada: `docs/DISCORD_WEBHOOK_VOICE.md`.

- Identidade: **Aristolfo, 570 anos de webhook**.
- Avatar publico: `/aristolfo-webhooks.png`.
- Staff-only: somente PT-BR.
- Players: PT-BR e EN no mesmo post, em blocos separados.
- Nao usar espanhol nos posts normais atuais.
- Estilo curto, sarcastico, gamer e de internet, sem preconceito ou ataque pessoal.
- Alertas criticos explicam o problema antes da punchline.
- Changelog da Staff e enviado com `npm.cmd run discord:update -- ARQUIVO --staff`.
- Nunca documentar URLs completas de webhook.

Automacao ativa:

- ID `webhook-joke-rotation`.
- Executa a cada 72 horas em worktree.
- Renova variacoes e piadas, preserva regras de idioma e negocio, valida, publica e envia changelog apos producao.

## Seguranca, sessao e uploads

- O navegador autentica por cookie `guild_session` HttpOnly, Secure em producao e SameSite=Lax.
- JWT nao passa em query string e nao fica em localStorage ou acessivel ao JavaScript.
- `GET /auth/me` hidrata o perfil; `POST /auth/logout` encerra a sessao. Bearer token continua aceito para automacoes e smoke autenticado.
- A API aplica headers defensivos, HSTS em producao, limite de body, rate limit para OAuth/upload, CORS com credenciais e `ValidationPipe` estrito.
- Upload aceita somente PNG, JPEG e WebP confirmados por magic bytes, usa UUID/extensao controlada e remove temporarios. SVG e conteudo disfarçado sao rejeitados.
- `GET /health` e publico e minimo: status, horario e `APP_VERSION`. Detalhes exigem Staff/Admin em `GET /health/details`.
- A Web aplica CSP, protecao contra framing, politica de referrer e permissoes restritas.

## UX e navegacao

- A navegacao principal e agrupada em Agora, Loot, Progresso e Conta.
- No mobile ficam quatro destinos principais e o menu `Mais`; a central Staff agrupa ferramentas por contexto operacional.
- A busca global `Ctrl+K` consulta itens, leiloes e eventos; resultados de players existem apenas no endpoint Staff.
- Busca possui modulo e hook proprios; novos dominios nao devem ser adicionados ao `operations.service.ts` ou `use-guild-api.ts` quando puderem ter ownership independente.
- A central de pendencias filtra por severidade e mostra responsavel, abertura e prazo quando aplicavel. Prazos Staff derivam dos thresholds configuraveis.
- Acoes destrutivas e financeiras usam `ConfirmationDialog` acessivel, sem `window.confirm` ou `window.prompt`.
- O shell possui skip-link, foco visivel global e respeito a `prefers-reduced-motion`.
- A politica oficial esta em `/privacy`; a rota legada redireciona para ela.

## Leiloes e sigilo

- Players nao veem ranking, bids, locks nem participantes durante o leilao.
- Endpoints sensiveis exigem papel Staff/Admin.
- O player pode consultar apenas o proprio bid pelo contrato especifico.
- Resultado e entrega liberam apenas as informacoes apropriadas ao fluxo publico.
- Nunca reintroduzir listas de participantes em payload publico, pagina publica ou webhook de players.

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

Encadeamento de presenca:

- Ao finalizar um boss, o DKP dele e distribuido normalmente.
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
- `scripts/prod/deploy-images.sh` e `rollback-images.sh` controlam promocao e retorno de versao.
- Containers possuem healthcheck e limites configuraveis de CPU/memoria.
- `docker-compose.monitoring.yml` oferece Uptime Kuma independente da API; fonte operacional em `docs/MONITORING.md`.
- Backup gera SHA-256, aplica retencao, aceita criptografia GPG e hook off-site. `verify-backup.sh` restaura em PostgreSQL temporario para provar integridade.
- Runbooks de banco, Discord, deploy, leilao e DKP ficam em `docs/OPERATIONS_RUNBOOKS.md`.

Imagens:

- `ghcr.io/kasuminho/erp-raven-2-api:latest`
- `ghcr.io/kasuminho/erp-raven-2-web:latest`

Nao considere apenas o Actions verde como deploy concluido. Verifique um campo, endpoint, asset ou comportamento especifico em producao antes do changelog.

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
- O rate limit atual e local ao processo. Se a API escalar para varias replicas, migrar o contador para Redis ou gateway compartilhado.

## Documentos de referencia

- `AGENTS.md`: regras obrigatorias para chats futuros.
- `docs/ICP_DOCKER_IMAGES.md`: deploy por imagens e Watchtower.
- `docs/DEPLOY_ICP.md`: contexto de deploy ICP.
- `docs/DISCORD_WEBHOOK_VOICE.md`: identidade, idioma e tom.
- `docs/staff-guide-2026-06-04.md`: guia funcional da Staff.
- `docs/player-guide-2026-06-04.md`: guia funcional dos players.
- `docs/discord-*.md`: historico de comunicacoes e mudancas.

## Historico recente

| Data | Mudanca | Referencia |
| --- | --- | --- |
| 2026-06-21 | Endurecimento completo: sessao HttpOnly, upload seguro, CI/testes, busca e navegacao, confirmacoes, monitoramento, backups verificados e rollback. | trabalho atual |
| 2026-06-21 | Criados `AGENTS.md` e `WIKI.md` como memoria viva obrigatoria para novos chats. | este commit |
| 2026-06-21 | Primeira rotacao automatica renovou as variacoes dos webhooks. | `a4f1c22` |
| 2026-06-20 | Anuncios em lote ganharam ordem persistente e copia de presenca boss a boss. | `695bd37` |
| 2026-06-20 | DKP-LOG ganhou backfill de tres dias e entrega persistente. | `bdae4fd` |
| 2026-06-19 | Webhooks de players voltaram a PT-BR/EN; Staff permaneceu PT-BR. | `4b851a8` |
| 2026-06-19 | Identidade Aristolfo aplicada aos webhooks. | `e316b44` |
| 2026-06-19 | Ranking e bids de leilao ficaram restritos a Staff. | `1377157` |
