# Roadmap de manutencao Raven2 - pos-rodada 2026-07

Documento de planejamento para a proxima rodada curta de manutencao. Ele nasce
depois do fechamento completo de `docs/RAVEN2_IMPLEMENTATION_ROADMAP_2026_07.md`
e nao reabre itens ja concluidos.

## Estado de partida

- A rodada de implantacao 2026-07 foi concluida em 2026-07-10, com os itens
  1-12 marcados como finalizados.
- O checkout analisado em 2026-07-10 estava limpo e alinhado a `origin/master`.
- `search`, `events` e `item-requests` ja usam `ValidationPipe` local forte.
- `notifications`, `audit`, `health` e `business-rules` continuam candidatos
  bons para a proxima etapa de validacao localizada.
- A tela `/dashboard/admin/items` segue como a pagina Web mais densa observada
  entre os candidatos de manutencao.

## Regra de entrada para qualquer fatia

Antes de programar uma fatia deste roadmap:

1. Ler `AGENTS.md`, `WIKI.md` e este arquivo.
2. Rodar `git status --short`, `git log -3 --oneline` e comparar com
   `origin/master`.
3. Confirmar se a fatia ja foi implementada procurando no codigo, na wiki e em
   `git log --oneline -- ARQUIVO`.
4. Escrever uma nota curta com arquivos provaveis e validacao planejada.
5. Implementar somente a fatia escolhida.

## Objetivo da rodada

Reduzir risco operacional sem abrir epico grande: endurecer validacoes locais,
melhorar pontos de manutencao Web e transformar sinais ja existentes em checks
mais claros para Staff.

## Frente 1 - Validacao forte de baixo risco

Objetivo: continuar a migracao para `ValidationPipe` local forte, modulo por
modulo, sem ativar whitelist global.

Fatia 1 recomendada: `notifications`.

- `POST /notifications/:id/read` deve validar `id` como UUID.
- `POST /notifications/read-all`, `GET /notifications/me` e
  `GET /notifications/me/unread-count` devem preservar contrato.
- Adicionar teste de rejeicao para ID invalido e campo extra quando houver body.
- Atualizar `WIKI.md` se a validacao entrar.

Estado em 2026-07-10: implementado. `notifications` ganhou DTO de parametro,
`ValidationPipe` local forte e teste de rejeicao para UUID invalido/campo extra,
preservando as rotas existentes.

Fatia 2 recomendada: `audit`.

- Validar `targetType`, `targetId`, `page` e `limit`.
- Manter `GET /audit/health` publico e sem autenticacao.
- Evitar expor audit logs a players; timeline continua Staff/Admin.

Estado em 2026-07-10: implementado. `audit` ganhou DTOs de params/query,
`ValidationPipe` local forte e testes de rejeicao para alvo/paginacao invalidos,
mantendo `/audit/health` publico e timeline Staff/Admin.

Fatia 3 recomendada: `business-rules`.

- Validar `key` e body `{ value }` com cuidado, porque `value` aceita tipos
  diferentes por regra.
- Manter `maintenanceMode` compativel com o guard global.
- Testar rejeicao de body sem `value` e parametro extra indevido.

Estado em 2026-07-10: implementado. `business-rules` ganhou DTOs para chave de
regra e body `{ value }`, `ValidationPipe` local forte e testes de rejeicao para
chave desconhecida, body sem `value` e campo extra.

Definicao de pronto:

- DTOs com decorators para parametros, queries e bodies relevantes.
- `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })`
  aplicado localmente.
- Testes focados no contrato alterado.
- Build API passa.

## Frente 2 - Componentizacao Web de tela densa

Objetivo: reduzir tamanho e risco das paginas operacionais sem redesenhar UX.

Fatia recomendada: `/dashboard/admin/items`.

- Separar filtros, formulario de item, edicao inline e acoes em lote em
  componentes locais da rota.
- Manter estado e mutacoes no nivel da pagina enquanto isso evitar prop drilling
  excessivo.
- Nao alterar textos, contratos da API ou comportamento de leilao/interesse.

Estado em 2026-07-10: implementado. `/dashboard/admin/items` foi separado em
componentes locais da rota para formulario de criacao, controles/filtros/acoes
em massa e card de catalogo, mantendo estado/mutacoes na pagina e contratos
sem alteracao.

Definicao de pronto:

- Mesma UX observavel.
- `npm.cmd run build --workspace apps/web` passa.
- Nenhum componente reutilizavel global novo sem segundo uso real.

## Frente 3 - Observabilidade sem segredo

Objetivo: melhorar diagnostico Staff usando sinais ja existentes.

Entregas candidatas:

- Expor duracao do ultimo smoke autenticado quando houver fonte persistida.
- Melhorar mensagens do painel de deploy quando a borda/WAF desafiar o runner
  externo mas a verificacao direta da API estiver saudavel.
- Criar checklist documental de incidente de webhook com fila, retry e recibo
  de changelog.

Definicao de pronto:

- Nenhum token, webhook URL ou valor de `.env` em logs/documentos.
- Staff consegue diferenciar falha real de API, desafio de borda e smoke pulado.

## Frente 4 - Preparacao single-tenant por guilda

Objetivo: avancar SaaS single-tenant sem transformar o schema em multi-tenant.

Entregas candidatas:

- Criar checklist de nova guilda com banco isolado, uploads, envs por nome,
  Discord e smoke.
- Criar script dry-run de verificacao de stack por guilda.
- Usar `docs/RATE_LIMIT_PROVIDER_PLAN_2026_07.md` somente como guia futuro;
  Redis/gateway continuam fora do default.

Definicao de pronto:

- Nada quebra a stack G3X.
- Segredos continuam fora de docs, wiki, changelog e logs.
- O caminho documentado usa Compose/database isolados por guilda.

## Ordem recomendada

1. DTO/ValidationPipe forte em `notifications`.
2. DTO/ValidationPipe forte em `audit`.
3. DTO/ValidationPipe forte em `business-rules`.
4. Componentizar `/dashboard/admin/items`.
5. Melhorar diagnostico de smoke/borda no painel de deploy.
6. Criar checklist de nova guilda single-tenant.
7. Criar dry-run de verificacao de stack por guilda.

## Fora de escopo

- Reabrir o roadmap 2026-07 concluido.
- Ativar whitelist global.
- Ativar Redis/gateway de rate limit.
- Mudar regras de sigilo de leilao, bids, locks ou ranking para players.
- Iniciar multi-tenant compartilhado.
- Enviar changelog Staff para planejamento interno sem mudanca operacional.

## Validacao minima por tipo

- Docs/processo: `git diff --check`.
- DTO/API: teste focado do modulo, `npm.cmd run lint` e
  `npm.cmd run build --workspace apps/api`.
- Web: `npm.cmd run build --workspace apps/web`.
- Infra/script: dry-run local, lint/build quando aplicavel e documentacao de
  rollback.
