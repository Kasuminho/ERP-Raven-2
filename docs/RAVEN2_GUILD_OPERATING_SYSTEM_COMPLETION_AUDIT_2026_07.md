# Audit de conclusao - Guild Operating System 2026-07

Revisao: 2026-07-22.

Este documento verifica o objetivo original contra a release 2026-07-21.
Entrevistas e metricas reais nao podem ser substituidas por fixtures ou
inferencia de codigo.

## Resultado executivo

| Bloco | Estado comprovado | Evidencia principal | Pendencia real |
| --- | --- | --- | --- |
| Cobrancas diretas | Incluido na release | `PlayerReminderService`, politica compartilhada de sinais, cron, migration e testes | Acompanhamento operacional |
| Codex enviado | Incluido na release | cobranca imediata Web/DM, recorrencia diaria em `SENT`, confirmacao/retry e bloqueio de reenvio duplicado | Acompanhamento operacional |
| Frente 0 | Parcial em coleta | coleta persistente Staff-only, duas entrevistas reais auditadas, gate e baseline semanal | completar amostra e quatro semanas consecutivas G3X |
| Frentes 1-7 | Incluido na release | dominios, migrations, telas, testes e tutoriais canonicos listados no roadmap | Coleta e validacao real pela Staff |
| Frente 8 | Futuro condicionado | estado documental explicito | campanha coletiva real e politica aprovada |
| Frente 9 | Incluido na release | validacao forte, sessao como autoria, telemetria agregada, runbooks, CI PostgreSQL e E2E HTTP | Acompanhamento operacional |

## Prelude - cobrancas diretas

Requisitos e provas:

- `SEM_BUILD`: `buildRosterSignals` exige build declarada; cron avalia diariamente.
- `SEM_ROLE`: `buildRosterSignals` exige papel preferido; cron avalia diariamente.
- `SEM_DISPONIBILIDADE`: disponibilidade ausente/`UNSET`; cron avalia diariamente.
- `SEM_STATUS_RECENTE`: corte exato de 21 dias sobre o ultimo `STATUS`.
- `PRESENCA_BAIXA`: menos de 50% nos eventos finalizados dos ultimos 15 dias,
  posteriores a entrada do player; exatamente 50% passa e janela sem evento nao
  pune.
- Entrega direta: notificacao Web e DM Discord bilingue por player, consolidada
  e idempotente por dia operacional de Sao Paulo.
- Codex: estado `SENT` gera cobranca imediata e entra na cobranca diaria ate
  `CONFIRMED` ou `NEEDS_RETRY`; um `SENT` nao pode ser marcado como enviado de
  novo.

Evidencia automatizada:

- `apps/api/test/player-reminder-policy.test.ts`;
- `apps/api/test/player-reminder.service.test.ts`;
- `apps/api/test/codex.service.test.ts`.

## Frente 0 - criterio de evidencia real

O coletor esta implementado em `/dashboard/staff/roadmap` e
`/product-validation`. O gate permanece fechado ate existir:

1. uma entrevista de lideranca Staff;
2. uma entrevista de operacao de eventos;
3. uma entrevista de loot;
4. pelo menos cinco entrevistas de players;
5. cobertura dos perfis veterano, novato, ativo e baixa atividade;
6. quatro semanas consecutivas encerradas, de segunda a segunda no fuso
   `America/Sao_Paulo`;
7. evidencia de que RSVP reduz ao menos uma cobranca manual real.

Entrevistas nao pedem identidade. Sinteses orientam nao armazenar conteudo
privado de voz/DM. Snapshot calcula pelo ERP eventos criados, presenca real,
no-shows, recruits convertidos/com atividade e tarefas com dono sem substituto;
presenca esperada e minutos de cobranca ficam marcados como declaracao Staff.

Evidencia automatizada: `apps/api/test/product-validation.service.test.ts`.

Estado operacional verificado em producao em 2026-07-22:

- 1/3 perfis Staff cobertos: lideranca; eventos e loot continuam pendentes;
- 1/5 entrevistas de players registrada, cobrindo baixa atividade; veterano,
  novato e ativo continuam pendentes;
- ambas as entrevistas registradas confirmam que RSVP reduz cobranca manual;
- 0/4 semanas congeladas, porque a janela oficial comeca em 27/07;
- proxima entrevista sugerida pelo proprio cockpit: Staff de eventos.

As contagens foram conferidas no banco da campanha `G3X-2026-07`; os dois
registros possuem trilha de auditoria e nenhuma identidade de participante foi
armazenada.

## Frentes implementadas

| Fatia | Dominio/tela de evidencia | Teste de dominio/contrato |
| --- | --- | --- |
| 1.1 RSVP | `events`, `/dashboard/attendance`, `/dashboard/admin/events` | `event-rsvp.service.test.ts`, `events-dto-validation.test.ts` |
| 1.2 Ausencias | `events`, perfil/compromissos | `event-absence.service.test.ts` |
| 1.3 Series/reserva/composicao | `events`, painel Staff | `event-series.service.test.ts`, `event-reserve.service.test.ts` |
| 1.4 Lembrete/no-show | `automation`, compromissos | `event-reminder.service.test.ts`, `event-rsvp.service.test.ts` |
| 2.1-2.2 Politicas/recibos | `business-rules`, `/dashboard/rules`, `/dashboard/staff/rules` | `guild-policy.service.test.ts` |
| 2.3 Casos privados | `guild-cases`, `/dashboard/cases`, `/dashboard/staff/cases` | `guild-cases.service.test.ts`, DTO test |
| 3.1 Onboarding | `onboarding`, telas player/Staff | `onboarding.service.test.ts`, DTO test |
| 3.2 Trial | `player-trials`, telas player/Staff | `player-trials.service.test.ts`, DTO test |
| 3.3 Mentoria | `mentorship`, telas player/Staff | `mentorship.service.test.ts` |
| 4.1 Pulso | `guild-pulse`, telas player/Staff | `guild-pulse.service.test.ts` |
| 4.2 Saude explicavel | `guild-health`, painel Staff | `guild-health.service.test.ts` |
| 4.3 Saude da lideranca | `leadership-health`, painel Staff | `leadership-health.service.test.ts` |
| 5.1 Fila/handoff | `staff-tasks`, painel Staff | `staff-tasks.service.test.ts` |
| 5.2 Cobertura | `staff-coverage`, painel Staff | `staff-coverage.service.test.ts` |
| 5.3 Automacao segura | `staff-automation`, painel Staff | `staff-automation.service.test.ts` |
| 6.1-6.3 Playbooks | `playbooks`, telas player/Staff | `playbooks.service.test.ts` |
| 7.1-7.3 Comunicacao | `communications`, Web e comandos Discord | `communications.service.test.ts` |
| 9 Confiabilidade | CI, smoke, telemetria, runbooks | suite de contrato, `product-telemetry.service.test.ts` e E2E |

## Invariantes auditados

- conteudo Staff novo permanece PT-BR;
- conteudo player novo permanece PT-BR/EN em blocos separados;
- RSVP nao marca presenca nem distribui DKP;
- cada boss continua com evento, presenca e DKP independentes;
- notas privadas, bids, locks, ranking e participantes nao entram em payload
  player-facing indevido;
- saude, trial, mentoria e automacao Staff nao decidem disciplina ou loot;
- autoria de mutacoes sensiveis vem da sessao autenticada;
- entidades persistentes novas possuem migration versionada;
- tutoriais canonicos player/Staff foram atualizados e validados por dry-run.

## Validacoes executadas neste checkout

- Prisma validate/generate: aprovado;
- 70 migrations do zero em PostgreSQL 16 descartavel: aprovado;
- testes unitarios/contrato: 194 aprovados apos o hardening de Codex;
- E2E HTTP/Nest com PostgreSQL: aprovado nos quatro fluxos criticos;
- lint: zero erros, apenas warning legado documentado em `eligibility.service.ts`;
- build API e Web: aprovado; Web gera 81 rotas;
- `git diff --check`: aprovado;
- Central Player: 20 posts PT-BR/EN em dry-run;
- Central Staff: 30 posts PT-BR Staff-only em dry-run.

## Condicoes para conclusao da validacao operacional

O ciclo de validacao de produto continua aberto enquanto faltarem:

1. entrevistas e quatro semanas consecutivas registradas pela G3X;
2. decisao humana da Staff sobre as hipoteses apos o gate da Frente 0.
