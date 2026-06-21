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
| 2026-06-21 | Criados `AGENTS.md` e `WIKI.md` como memoria viva obrigatoria para novos chats. | este commit |
| 2026-06-21 | Primeira rotacao automatica renovou as variacoes dos webhooks. | `a4f1c22` |
| 2026-06-20 | Anuncios em lote ganharam ordem persistente e copia de presenca boss a boss. | `695bd37` |
| 2026-06-20 | DKP-LOG ganhou backfill de tres dias e entrega persistente. | `bdae4fd` |
| 2026-06-19 | Webhooks de players voltaram a PT-BR/EN; Staff permaneceu PT-BR. | `4b851a8` |
| 2026-06-19 | Identidade Aristolfo aplicada aos webhooks. | `e316b44` |
| 2026-06-19 | Ranking e bids de leilao ficaram restritos a Staff. | `1377157` |
