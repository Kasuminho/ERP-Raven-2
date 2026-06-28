# ERP Raven 2 - Wiki operacional

**Ultima revisao:** 2026-06-28

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
- Bancos de voz dos webhooks usam selecao deterministica por contexto; quando ha par PT-BR/EN equivalente, a variante escolhida e espelhada entre os dois blocos.
- Changelog da Staff e enviado com `npm.cmd run discord:update -- ARQUIVO --staff`.
- Avisos extraordinarios para players podem ser redigidos/revisados no chat Codex e publicados com `npm.cmd run discord:update -- ARQUIVO --announcements`; fazer `--dry-run` antes, manter PT-BR/EN em blocos separados e exigir confirmacao humana antes do envio.
- Nunca documentar URLs completas de webhook.

Automacao ativa:

- ID `webhook-joke-rotation`.
- Executa a cada 72 horas em worktree.
- Renova variacoes e piadas, preserva regras de idioma e negocio, valida, publica e envia changelog apos producao.
- A rotacao atual cobre embeds, DMs, healthcheck, DKP-LOG, resumo semanal e punchlines do changelog, com bancos renovados em 2026-06-26 para evitar reciclar as frases das duas revisoes anteriores.

## Seguranca, sessao e uploads

- O navegador autentica por cookie `guild_session` HttpOnly, Secure em producao e SameSite=Lax.
- JWT nao passa em query string e nao fica em localStorage ou acessivel ao JavaScript.
- `GET /auth/me` hidrata o perfil; `POST /auth/logout` encerra a sessao. Bearer token continua aceito para automacoes e smoke autenticado.
- A API aplica headers defensivos, HSTS em producao, limite de body, rate limit para OAuth/upload, CORS com credenciais e `ValidationPipe` com transformacao.
- Nao habilitar `whitelist`/`forbidNonWhitelisted` globalmente enquanto os DTOs legados forem classes sem decorators; isso remove ou rejeita campos validos. A migracao deve ser feita por modulo, com teste do contrato antes de endurecer o pipe.
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
- A central de pendencias filtra por severidade e mostra responsavel, abertura e prazo quando aplicavel. Prazos Staff derivam dos thresholds configuraveis.
- Acoes destrutivas e financeiras usam `ConfirmationDialog` acessivel, sem `window.confirm` ou `window.prompt`.
- O shell possui skip-link, foco visivel global e respeito a `prefers-reduced-motion`.
- A politica oficial esta em `/privacy`; a rota legada redireciona para ela.
- No perfil do player, `dimensionalLayer` e a camada operacional de 1 a 10. CP nao e editado diretamente ali: o player deve postar progresso `STATUS` com print, e a Staff aprova para atualizar o CP.
- Em interesses abertos de equipamento, o player pode marcar o atalho de transmutar: a Web dispensa upload manual, usa o asset publico `/transmutar.png` como `imageUrl`, grava `ItemInterestEntry.isTransmuteRequest` e pede confirmacao do Aristolfo antes de registrar.
- Ao fechar um interesse em que todas as declaracoes sao de transmutar, o sistema pula a votacao da Staff e sorteia aleatoriamente um vencedor entre os elegiveis. Um mesmo player so pode ser selecionado para um item de transmutar por dia operacional de Sao Paulo; se todos os interessados ja foram selecionados no dia, o post fecha sem vencedor e fica auditado.
- A central Staff em `/dashboard/staff` prioriza os grupos de ferramentas no topo da pagina, com cards mais espacados; contadores, pendencias, saude e auditoria ficam abaixo.

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

## Pedidos de craft

- Materiais solicitados para concluir itens T3 possuem prioridade sobre pedidos do mesmo material destinados a Quintessencia.
- Um pedido de Quintessencia continua valido, mas so deve ser atendido quando nao houver player aguardando aquele material para fabricar um item T3.
- A regra existe para elevar primeiro quem ainda esta abaixo na progressao e melhorar o resultado coletivo da guilda.

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
- O rate limit atual e local ao processo. Se a API escalar para varias replicas, migrar o contador para Redis ou gateway compartilhado.

## Documentos de referencia

- `AGENTS.md`: regras obrigatorias para chats futuros.
- `docs/ICP_DOCKER_IMAGES.md`: deploy por imagens e Watchtower.
- `docs/SAAS_SINGLE_TENANT_ROADMAP.md`: plano para empacotar o Raven como SaaS por instancia Docker isolada por guilda.
- `docs/SAAS_GUILD_COMPOSE_GUIDE.md`: guia pratico para Compose por guilda e database PostgreSQL isolada.
- `docs/DEPLOY_ICP.md`: contexto de deploy ICP.
- `docs/DISCORD_WEBHOOK_VOICE.md`: identidade, idioma e tom.
- `docs/staff-guide-2026-06-04.md`: guia funcional da Staff.
- `docs/player-guide-2026-06-04.md`: guia funcional dos players.
- `docs/discord-*.md`: historico de comunicacoes e mudancas.

## Historico recente

| Data | Mudanca | Referencia |
| --- | --- | --- |
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
