# Roadmap de implantacao Raven2 - rodada 2026-07

Documento de planejamento para a proxima rodada de melhorias. Este arquivo nao
implementa mudancas; ele define frentes, criterios de pronto e uma ordem segura
para novos trabalhos.

## Estado de partida

- O programa base de melhorias em `docs/RAVEN2_PRODUCT_IMPROVEMENT_PROGRAM.md`
  esta majoritariamente implementado e documentado como historico.
- O checkout analisado em 2026-07-09 esta limpo e alinhado a `origin/master`.
- Nao ha pendencia detectada de commit local para a feature "Selecionar leilao na
  consulta"; ela existe no historico em `9aa56c7` e foi migrada para
  `AuctionDiagnosticsService` em `f6b11cf`.
- Esta rodada deve comecar por melhorias de manutencao, contratos e UX
  operacional, nao por refazer epicos ja concluidos.

## Regra de entrada para qualquer fatia

Antes de programar uma fatia deste roadmap:

1. Ler `AGENTS.md`, `WIKI.md` e este arquivo.
2. Rodar `git status --short`, `git log -3 --oneline` e comparar com
   `origin/master`.
3. Confirmar se a fatia ja foi implementada procurando no codigo, na wiki e em
   `git log --oneline -- ARQUIVO`.
4. Escrever em uma nota curta quais arquivos devem mudar e qual validacao sera
   rodada.
5. Implementar somente a fatia escolhida.

## Frente 1 - Contratos compartilhados por dominio

Objetivo: reduzir divergencia entre API e Web sem criar outro arquivo central
gigante.

Sinais atuais:

- `apps/web/src/types/api.ts` ainda concentra muitos contratos.
- `apps/api/src/modules/operations/operations.types.ts` ainda concentra varios
  tipos operacionais.
- Apenas operations/player tasks e diagnostico de leilao ja foram movidos para
  `packages/shared`.

Entregas sugeridas:

- Migrar contratos de `events` para `packages/shared/src/types/events.ts`.
- Migrar contratos de `item-requests` para `packages/shared/src/types/requests.ts`.
- Migrar contratos de `item-interests` para `packages/shared/src/types/interests.ts`.
- Migrar contratos de `discord/webhooks` para `packages/shared/src/types/discord.ts`.
- Manter aliases locais para data `Date|string` no servidor e `string` na Web.

Definicao de pronto:

- API e Web importam os contratos compartilhados da fatia.
- Nenhum payload sensivel novo entra em rota player.
- Builds de API/Web passam.

## Frente 2 - Validacao forte nos controllers restantes

Objetivo: migrar modulos com DTOs legados para `ValidationPipe` local forte, sem
ativar whitelist global antes da hora.

Sinais atuais:

- Ja migrados: `staff-review`, `codex`, `daoshi`, `announcements`, `events`.
- Ainda sem pipe local forte detectado: `auth`, `business-rules`, `drops`,
  `automation`, `dkp`, `items`, `audit`, `discord`, `auctions`,
  `item-requests`, `search`, `item-interests`, `notifications`, `eligibility`,
  `operations`, `health`, `players`.

Ordem sugerida:

1. Baixo risco/menor superficie: `notifications`, `search`, `audit`, `health`.
2. Contratos Staff internos: `business-rules`, `operations`, `automation`.
3. Fluxos financeiros/sensiveis: `dkp`, `auctions`, `drops`, `item-requests`,
   `item-interests`, `players`.
4. Auth/Discord por ultimo, com testes dedicados de compatibilidade.

Definicao de pronto:

- DTOs com decorators para todos os bodies/queries/params mutaveis do modulo.
- Teste de rejeicao de campo extra e formato invalido.
- `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })`
  aplicado localmente.

## Frente 3 - Quebrar servicos grandes por responsabilidade

Objetivo: reduzir risco de regressao e facilitar testes direcionados.

Sinais atuais por tamanho:

- `item-interests.service.ts`: decisoes, sorteio, transmutar, comparador e Staff.
- `item-requests.service.ts`: fila, forecast, sugestoes, prioridade T3 e entrega.
- `attendance.service.ts`: presenca, finalizacao, lote e prontidao.
- `players.service.ts`: perfil, historico, timeline e Staff notes.
- `auction-diagnostics.service.ts`: diagnostico, timeline, preview e dossie.

Entregas sugeridas:

- Extrair calculo puro de forecast/prioridade de requests para servicos auxiliares.
- Extrair regras de sorteio/transmutar de interesses para modulo de dominio.
- Extrair readiness/checklist/lote de eventos para servicos menores.
- Manter controllers e contratos HTTP estaveis.

Definicao de pronto:

- Cada extracao tem testes de regressao antes/depois.
- Nenhum arquivo concentrador novo substitui o concentrador antigo.
- `WIKI.md` documenta a nova ownership.

## Frente 4 - Componentizar telas Web densas

Objetivo: melhorar manutencao sem redesenhar fluxos que ja funcionam.

Sinais atuais:

- Telas com alta densidade: item requests, admin events, admin items, profile,
  auction diagnostics e Staff interests.
- A separacao de hooks por dominio ja existe; o proximo gargalo esta nas paginas.

Entregas sugeridas:

- Criar componentes locais por secao em cada rota antes de mexer em visual.
- Manter estado e mutacoes no nivel da pagina quando isso evitar prop drilling
  excessivo.
- Separar componentes reutilizaveis somente quando houver segundo uso real.

Definicao de pronto:

- Mesma UX e mesmos textos, salvo ajuste pequeno necessario.
- Sem mudanca de contrato API.
- Build Web passa.

## Frente 5 - Observabilidade operacional interna

Objetivo: transformar checks existentes em sinais acionaveis para Staff e deploy.

Sinais atuais:

- Smoke publico e autenticado ja existem.
- Health privado ja mostra backup e checks operacionais.
- Painel Staff de deploy existe, mas ainda pode ganhar sinais de fila e recibos.

Entregas sugeridas:

- Registrar recibo interno de changelog Staff enviado, sem URL de webhook.
- Exibir idade da fila de webhooks e ultimo retry no painel de deploy/health.
- Medir tempo dos smokes e registrar ultimo status autenticado em formato
  consumivel pela API.
- Documentar fallback manual quando borda/WAF desafiar runner externo.

Definicao de pronto:

- Nenhum token, webhook URL ou segredo em banco de logs/documentos.
- Staff consegue diferenciar falha de API, falha de borda e smoke pulado.

## Frente 6 - Preparacao multi-guilda sem generalizar cedo demais

Objetivo: reduzir custo do futuro SaaS single-tenant mantendo a instalacao G3X
como fonte de verdade atual.

Sinais atuais:

- Wiki e docs ja registram Compose por guilda e database isolada.
- Web resolve API por hostname em runtime.
- Rate limit em memoria ainda e adequado para instancia unica, mas precisa
  provider externo para multi-replica.

Entregas sugeridas:

- Criar checklist de nova guilda com banco, uploads, envs, Discord e smoke.
- Adicionar provider Redis/gateway para rate limit atras da interface existente.
- Criar script dry-run de verificacao de stack por guilda.

Definicao de pronto:

- Nenhuma mudanca quebra a stack G3X.
- Segredos continuam fora de docs e logs.

## Ordem recomendada para a rodada

1. Contratos compartilhados de `events`.
2. DTO/ValidationPipe forte em modulo pequeno (`notifications` ou `search`).
3. Contratos compartilhados de `item-requests`.
4. Extrair forecast/prioridade de `item-requests`.
5. Componentizar `/dashboard/item-requests`.
6. DTO/ValidationPipe forte em `item-requests`.
7. Contratos compartilhados de `item-interests`.
8. Extrair sorteio/transmutar de `item-interests`.
9. Componentizar `/dashboard/staff/interests`.
10. Registrar recibo interno de changelog Staff.
11. Melhorar painel de deploy/health com sinais de fila.
12. Planejar provider Redis/gateway para rate limit, sem ativar por padrao.

Estado final em 2026-07-10: a ordem 1-12 foi concluida. A ultima fatia gerou o
plano `docs/RATE_LIMIT_PROVIDER_PLAN_2026_07.md`; Redis/gateway continuam
desativados por padrao e `InMemoryRateLimitStore` segue como provider atual da
G3X.

## Fora de escopo desta rodada

- Refazer epicos A-I do programa antigo.
- Alterar regras de sigilo de leilao para players.
- Ativar whitelist global.
- Publicar changelog Staff sem verificacao de producao.
- Comecar implementacao sem escolher uma fatia.

## Validacao minima por tipo de fatia

- Docs/processo: `git diff --check`.
- Contratos/API/Web: Prisma validate/generate se tocar schema, lint e builds de
  API/Web.
- DTOs: testes de DTO, lint e build API.
- Refactor de servico: testes unitarios do dominio e build API.
- Tela Web: build Web e, quando houver dev server disponivel, smoke manual da rota.
