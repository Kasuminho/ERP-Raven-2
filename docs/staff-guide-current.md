# Guia atual da Staff - Raven2 G3X

Ultima revisao: 2026-07-02

Este e o guia operacional atual da Staff. Os guias datados antigos ficam como historico do produto e nao substituem este arquivo.

Conteudo Staff e sempre PT-BR. Nao publique segredos, tokens, cookies, URLs completas de webhook ou conteudo de `.env`.

## 1. Acesso e papeis

- Login acontece pelo Discord.
- Ferramentas internas exigem role `STAFF` ou `ADMIN`.
- Players comuns nao veem central Staff, diagnosticos, ranking sensivel, bids, locks, participantes de leilao ou dados internos.
- Use a conta Discord correta; a sessao do navegador usa cookie `guild_session` HttpOnly.

## 2. Central Staff

Rota: `/dashboard/staff`.

A central abre com o resumo matinal de `GET /operations/staff/morning-briefing`.

Use a central para:

- ver urgencias, leiloes vencidos/proximos, reviews, entregas, integridade e saude;
- copiar a pauta em Markdown para reuniao;
- navegar por grupos: operacao de hoje, loot/economia, players/temporada, governanca/diagnostico;
- acompanhar pendencias e auditoria recente.

## 3. Dia, reuniao e temporada

- `/dashboard/staff/day`: visao operacional do dia.
- `/dashboard/staff/meeting`: pauta para call da Staff.
- `/dashboard/staff/season`: fechamento mensal com DKP, presenca, drops, requests e Daoshi.

Use essas telas para preparar decisao, nao para esconder decisao. Quando a Staff decidir algo sensivel, registre pelo fluxo correto para gerar auditoria.

## 4. Players, comparacao e fairness

- `/dashboard/staff/players`: lista e perfil Staff de players.
- `/dashboard/staff/players/:id`: perfil individual com dados operacionais.
- `/dashboard/staff/compare`: compara camada, classe, presenca, DKP, drops e requests.
- `/dashboard/staff/fairness`: mostra concentracao de loot por periodo.

Regras:

- camada operacional vai de 1 a 10;
- CP nao deve ser editado manualmente no perfil como atalho normal;
- CP muda por progresso `STATUS` aprovado pela Staff;
- use comparacao/fairness como apoio, nao como decisao automatica.

## 5. DKP e economia

- `/dashboard/staff/dkp`: ajuste manual de DKP.
- `/dashboard/staff/economy`: ledger/economia.

Ao ajustar DKP:

- informe motivo claro;
- use valor positivo no campo e escolha adicionar/remover conforme UI;
- confira DKP total, locked e available antes de confirmar;
- lembre que cada ajuste gera transacao e auditoria.

DKP travado em leilao nao deve ser mexido por fora do fluxo salvo em excecao operacional bem documentada.

## 6. Eventos, presenca e bosses em lote

- `/dashboard/admin/events`: cria eventos, registra presenca e finaliza.

Regras atuais:

- cada boss possui evento, presenca e DKP independentes, mesmo quando criado em lote;
- `attendanceBatchId` liga os bosses de um lote;
- `batchOrder` define a ordem;
- finalizar um boss pode copiar presenca para o proximo evento ativo do lote;
- eventos cancelados sao pulados;
- presenca ja existente no proximo evento nunca e sobrescrita.

Antes de finalizar:

- confira o checklist em `GET /events/:id/finalization-checklist`;
- revise presentes, ausentes ativos, DKP por pessoa, total distribuido e proximo boss;
- use a prontidao do boss em `GET /events/:id/readiness` para ver camadas, classes, CP aprovado e STATUS recente.

STATUS ausente ou com mais de 14 dias entra como desatualizado. Roles operacionais: `VANGUARD` tank, `DIVINE_CASTER` healer, `DEATHBRINGER` suporte/off-heal, demais classes DPS.

## 7. Anuncios

- `/dashboard/admin/announcements`: cria avisos operacionais.

Anuncio nao e presenca. Presenca e DKP ficam no fluxo de eventos.

Ao criar anuncio:

- defina tipo, titulo, descricao e horario;
- use mencao de cargo apenas quando necessario;
- lembretes Discord seguem identidade do Aristolfo e regras de idioma.

## 8. Leiloes

Rotas principais:

- `/dashboard/staff/auction-simulator`: simula ranking/score antes de abrir ou avaliar.
- `/dashboard/staff/auction-diagnostics`: raio-x Staff de qualquer leilao.
- `/dashboard/staff/reviews`: aprovacoes/rejeicoes de Staff review.
- `/dashboard/staff/bid-cancellations`: cancelamentos de bid.
- `/dashboard/staff/deliveries`: entregas de leilao.

Sigilo:

- players nao veem ranking, bids, locks nem participantes ate resultado/entrega;
- Staff autorizada pode consultar;
- nunca copie dados sensiveis de diagnostico para canal publico.

Diagnostico de leilao:

- selecione por item, vencedor registrado e data de encerramento;
- veja motivo visual do estado atual;
- use timeline operacional para bids, locks, cancelamentos, votos, transacoes, entrega e audit logs;
- use previa de finalizacao read-only antes de agir;
- copie o dossie Markdown quando precisar discutir na Staff.

Entregas de leilao:

- `/dashboard/staff/deliveries` mostra pendencias geradas por `AUCTION_WIN` ainda sem `DropHistory`;
- cada pendencia mostra urgencia, idade, prazo e motivo operacional;
- use os filtros `Todos`, `Atrasados`, `Hoje`, `Sem prova`, busca por player/item e filtro por tier para priorizar a fila;
- anexe a prova antes de registrar a entrega;
- pendencias de entrega tambem aparecem como tarefas `DROP_DELIVERY` no dashboard Staff e na pauta de reuniao.

Regra T4:

- rejeicao/invalidacao sem bids antes da camada 1 desce camada e mantem ciclo aberto;
- somente apos falhar na camada 1 o item vira `RELISTED`;
- relist volta para camada 4 com `reopensAt` em 7 dias desde a primeira abertura do ciclo.

## 9. Interesses

- `/dashboard/staff/interests`: lista posts de interesse e comparador Staff.

O endpoint Staff adiciona `staffComparison` por interessado:

- classe;
- camada;
- presenca;
- DKP total/travado/disponivel;
- requests ativos;
- ultima nota Staff;
- historico de loot;
- sinais operacionais.

Players nao recebem esse comparador.

Transmutar:

- player pode declarar interesse usando atalho de transmutar sem upload manual;
- o sistema usa `/transmutar.png`;
- se todas as declaracoes do post forem de transmutar, a votacao Staff e pulada;
- o vencedor e sorteado entre elegiveis;
- um player so pode vencer um item de transmutar por dia operacional de Sao Paulo.

## 10. Requests de item

- `/dashboard/item-requests`: experiencia player.
- Fluxos Staff aparecem nas ferramentas de loot/economia e entregas relacionadas.

Regras importantes:

- cada categoria comum permite um pedido ativo;
- bosses especiais podem aparecer em multiplas filas;
- entrega parcial reduz quantidade restante;
- entrega completa registra DropHistory;
- requests T3 de craft possuem prioridade sobre Quintessencia do mesmo material inferido;
- entrega de Quintessencia bloqueada por prioridade T3 e impedida e auditada como `ITEM_REQUEST_T3_PRIORITY_DELIVERY_BLOCKED`.

Transparencia atual:

- `queueForecast` mostra posicao/tamanho da fila, unidades antes, idade do update e ultima entrega conhecida;
- `swapSuggestions` sugere ate tres alternativas comparaveis com fila menor;
- `materialPriority` mostra prioridade operacional e aviso simplificado.

## 11. Drops, itens e auditoria de item

- `/dashboard/staff/drops`: historico Staff de drops.
- `/dashboard/staff/item-audit`: auditoria de entregas/relacionamentos.
- `/dashboard/staff/item-audit/items`: auditoria de catalogo.
- `/dashboard/admin/items`: catalogo e operacoes de itens.

Use drops para auditar entrega, nao para inventar historico sem origem. Quando houver correcao manual, registre motivo claro.

## 12. Codex, Daoshi e progresso

- `/dashboard/staff/codex`: fila de ajuda Codex.
- `/dashboard/staff/daoshi`: recibos, cash e sorteio Daoshi.
- `/dashboard/staff/progress`: review de progresso.

Progress:

- `STATUS` aprovado atualiza CP/level operacional;
- Fenda Dimensional aprovada atualiza andar;
- categorias sem review ficam como historico visual;
- rejeite com nota objetiva quando o print nao prova o progresso.

## 13. Discord e webhooks

Identidade oficial: `Aristolfo, 570 anos de webhook`.

Regras:

- Staff-only: PT-BR;
- players: PT-BR e EN em blocos separados;
- nao usar espanhol nos posts normais atuais;
- humor curto, sarcastico, gamer e saudavel;
- clareza operacional vem antes da piada;
- nunca expor URL completa de webhook.

Ferramentas:

- `/dashboard/staff/discord-templates`: preview real sanitizado de payloads/embeds.
- `/dashboard/staff/discord-webhooks`: fila persistente com status, alvo logico, tentativas, erro resumido e payload seguro.

Retry de webhook:

- so aparece para entrega `FAILED` e `retryable`;
- busca URL pelo `webhookKey` no servidor;
- nao mostra segredo na API ou na Web.

Changelog Staff:

```powershell
npm.cmd run discord:update -- docs/ARQUIVO.md --staff
```

Envie changelog apenas depois de validar producao.

## 14. Saude, integridade e regras

- `/dashboard/staff/health`: saude operacional.
- `/dashboard/staff/integrity`: pendencias de integridade.
- `/dashboard/staff/rules`: regras de negocio configuraveis.
- `/dashboard/staff/legacy-audit`: dados importados ainda sem vinculo.

Regras de negocio mudam comportamento real. Edite JSON com calma, valide efeito e registre contexto.

## 15. Boas praticas

- Nao aprove winner inelegivel so porque "parece justo".
- Nao marque presenca sem validacao.
- Nao publique ranking/bids/locks em canal de player.
- Nao use print ruim para aprovar progresso.
- Nao use ajuste manual de DKP para corrigir fluxo que tem botao proprio.
- Consulte dossie, timeline, fairness e comparador antes de decisoes sensiveis.
- Depois de publicar mudanca em producao, valide comportamento real antes de avisar a Staff.

Aristolfo pode ser sarcastico. A Staff precisa ser precisa. Os dois juntos dao menos chamado.
