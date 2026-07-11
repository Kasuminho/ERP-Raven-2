# Roadmap de produto Raven2 - War Room, roster e inteligencia de guilda

Documento de planejamento para a proxima rodada grande de produto. Ele nasce a
partir das ideias levantadas em 2026-07-11 para aproximar o Raven da operacao
real de guilda competitiva em Raven2: Clash/GvG, Abyss, bosses, roster,
meta de classes, loot, DKP e recrutamento.

Este roadmap ainda nao deve ser implementado sem pedido explicito. Ao iniciar
qualquer fatia, confirme primeiro o estado atual no codigo, na wiki e no Git.

## Estado de partida

- O Raven ja cobre DKP, presencas, eventos, bosses, leiloes, drops,
  interesses, pedidos de item, progresso, auditoria, notificacoes, Staff
  operations, Daoshi, Codex e integracao operacional com Discord.
- Ranking, bids, locks e identidade de participantes de leilao continuam
  sigilosos para players ate o resultado/entrega.
- Conteudo Staff-only continua PT-BR.
- Conteudo destinado aos players continua PT-BR e EN em blocos separados.
- A navegacao principal ja agrupa a experiencia por Agora, Loot, Progresso e
  Conta, com central Staff orientada por jornadas.
- A direcao deste roadmap e transformar o Raven em uma central tatica de guilda,
  nao apenas um ERP de loot.

## Estado em 2026-07-11

- Frente 1 - War Room de Clash/GvG: `implementado`.
  - Fatia 1.1 - Modelo de operacao GvG: `implementado`.
  - Fatia 1.2 - Escalacao e confirmacao de presenca: `implementado`.
  - Fatia 1.3 - Painel ao vivo de guerra: `implementado`.
  - Fatia 1.4 - Pos-guerra e aprendizado: `implementado`.
- Frente 2 - Roster por classe, build e funcao: `implementado`.
  - Fatia 2.1 - Perfil de combate: `implementado`.
  - Fatia 2.2 - Matriz de composicao: `implementado`.
  - Fatia 2.3 - Roster aplicado ao War Room: `implementado`.
- Frente 3 - Simulador de DKP e politicas de loot: `implementado`.
  - Fatia 3.1 - Snapshot economico de DKP: `implementado`.
  - Fatia 3.2 - Simulador de decay: `implementado`.
  - Fatia 3.3 - Simulador de bid cap, taxa e floor: `implementado`.
  - Fatia 3.4 - Promocao de politica: `implementado`.
- Frente 4 - Transparencia pos-leilao para players: `implementado`.
  - Fatia 4.1 - Recibo player do resultado: `implementado`.
  - Fatia 4.2 - Linha do tempo publica segura: `implementado`.
  - Fatia 4.3 - Contestacao controlada: `implementado`.
- Frente 5 - Painel de elegibilidade e risco: `implementado`.
  - Fatia 5.1 - Risk flags operacionais: `implementado`.
  - Fatia 5.2 - Elegibilidade contextual: `implementado`.
  - Fatia 5.3 - Review Staff assistida: `implementado`.
- Frente 6 - Planejador de bosses, Abyss e rotina PvE: `implementado`.
- Frente 7 - Wishlist inteligente de itens: `implementado`.
- Frente 8 - Relatorio semanal de progresso da guilda: `implementado`.
- Frente 9 - Modulo de recrutamento: `implementado`.

Entrega concluida nesta revisao: perfil de combate versionado no banco,
contratos compartilhados de roster, API Staff/player com DTOs fortes, pedidos
de atualizacao enviados pelo player e revisados pela Staff, tela Staff inicial
de roster e bloco player-facing no perfil. A matriz de composicao Staff tambem
foi entregue com endpoint read-only, contadores, alertas, filtros e Markdown
copiavel.
O modelo minimo de War Room tambem foi entregue com entidade de operacao
competitiva, API Staff CRUD, auditoria de ciclo de vida e tela Staff inicial.
A escala por operacao tambem foi entregue com slots taticos, confirmacao
player, presenca real, conflitos operacionais e visao player restrita.
O painel ao vivo Staff tambem foi entregue com checklist calculado, timeline
persistida, eventos taticos tipados, autoria Staff e refresh periodico.
O pos-guerra tambem foi entregue com placar livre, pontos de melhoria,
relatorio Staff Markdown, planejado vs realizado e sinais para resumo semanal.
O snapshot economico de DKP tambem foi entregue com distribuicao, media,
mediana, concentracao, atividade recente, acumuladores inativos, sinais e
Markdown Staff.
O simulador de decay tambem foi entregue com preview read-only, impacto por
player, distribuicao antes/depois, Markdown e rascunhos persistidos.

## Sinais de produto usados

- Raven2 vem puxando conteudo de guilda competitivo, como Clash/GvG, Abyss,
  Ancient Fortress, expansoes de regiao e classe Warlord.
- MMORPGs com loot de guilda sofrem com os mesmos problemas recorrentes:
  inflacao de DKP, player guardando ponto, discussao de prioridade, falta de
  transparencia pos-resultado e dificuldade de medir contribuicao real.
- Para a G3X, a oportunidade mais forte e dar contexto decisorio para Staff e
  clareza pos-fato para players, sem revelar informacao sensivel antes da hora.

## Fora de escopo explicito

- Comandos Discord para players ou Staff.
- Transformar Discord em interface principal de produto.
- Expor ranking, bids, locks ou concorrentes para players antes do resultado.
- Criar multi-tenant compartilhado ou mudar o modelo SaaS single-tenant.
- Reescrever regras de DKP/leilao sem simulacao e aprovacao Staff.
- Automatizar punicao, corte de roster ou decisao de loot sem confirmacao Staff.

## Principios da rodada

1. Site como fonte unica de operacao.
2. Staff decide com contexto; o sistema recomenda, nao governa sozinho.
3. Player entende o resultado depois, sem ganhar visao indevida antes.
4. Cada entrega deve nascer com auditoria, historico e rollback operacional.
5. Interfaces de guerra precisam ser densas, rapidas e sem cara de landing page.
6. Contratos novos devem ir para `packages/shared` quando atravessarem API/Web.
7. Mudancas de schema Prisma exigem migration versionada.
8. Roadmap deve ser executado em fatias pequenas, publicaveis e verificaveis.

## Frente 1 - War Room de Clash/GvG

Objetivo: criar uma central tatica Staff para preparar, operar e revisar
conteudo competitivo de guilda.

### Fatia 1.1 - Modelo de operacao GvG

Estado em 2026-07-11: `implementado`.

Entregue:

- `WarRoomOperation` representa operacoes competitivas com tipos `CLASH`,
  `ANCIENT_FORTRESS`, `ABYSS`, `GUILD_RAID` e `CUSTOM`.
- Campos de janela, status, mapa/regiao, objetivo, prioridade, notas Staff,
  resultado, links internos e evento vinculado opcional foram persistidos.
- API Staff-only `/war-room/operations` oferece listagem, detalhe, criacao,
  edicao, abertura, encerramento e cancelamento com DTOs fortes.
- Criacao, edicao, abertura, encerramento, cancelamento e mudanca de resultado
  geram auditoria.
- Tela Staff `/dashboard/staff/war-room` lista operacoes ao vivo, proximas e
  encerradas, permite criar janela e executar acoes basicas do ciclo.

Entregas:

- Criar entidade de operacao competitiva, por exemplo `WarRoomOperation`.
- Suportar tipos iniciais: `CLASH`, `ANCIENT_FORTRESS`, `ABYSS`, `GUILD_RAID`
  e `CUSTOM`.
- Campos minimos: nome, tipo, janela de inicio/fim, status, mapa/regiao,
  objetivo, prioridade, notas Staff, resultado e links internos.
- Relacionar operacao a eventos/presencas existentes quando aplicavel, sem
  duplicar a regra de evento/boss.
- Auditar criacao, edicao, abertura, encerramento e mudanca de resultado.

Definicao de pronto:

- API Staff CRUD minima com DTOs fortes.
- Tela Staff lista operacoes proximas, em andamento e encerradas.
- Nenhum dado sensivel aparece para players.
- Testes de permissao e validacao.

### Fatia 1.2 - Escalacao e confirmacao de presenca

Estado em 2026-07-11: `implementado`.

Entregue:

- `WarRoomRosterSlot` persiste escala por operacao/player com role tatica,
  status, classe/camada esperadas, instrucoes publicas PT-BR/EN, nota Staff,
  nota do player e marcacao de presenca.
- API Staff-only permite listar a escala, adicionar slot, editar slot e marcar
  presenca real (`PRESENT`, `ABSENT`, `JUSTIFIED_ABSENCE`) com auditoria.
- API player `/war-room/me` mostra apenas as proprias atribuicoes em operacoes
  abertas/agendadas e permite confirmar ou recusar pelo site com nota opcional.
- O dossie Staff de escala calcula conflitos de operacao sobreposta, STATUS
  antigo, camada abaixo do esperado, classe ausente e baixa presenca.
- `/dashboard/staff/war-room` ganhou painel de escala por operacao com
  contadores, formulario de slot, status e alertas; `/dashboard/my-war-room`
  mostra a propria chamada com blocos PT-BR e EN.

Entregas:

- Permitir que Staff monte uma escalacao por operacao.
- Cada escalado deve ter funcao tatica: frontline, backline, suporte, caller,
  scout, flex ou reserva.
- Player pode confirmar disponibilidade pelo site quando a operacao for
  player-facing.
- Staff pode marcar presenca real e ausencia justificada.
- Exibir conflitos: player escalado em duas operacoes sobrepostas, sem status
  recente, camada abaixo do esperado, classe ausente ou baixa presenca.

Definicao de pronto:

- Staff ve confirmados, pendentes, recusados, reservas e ausentes.
- Player ve apenas a propria escala e instrucoes publicas.
- Confirmacao player tem PT-BR/EN.
- Mudancas relevantes geram audit log.

### Fatia 1.3 - Painel ao vivo de guerra

Estado em 2026-07-11: `implementado`.

Entregue:

- `WarRoomTimelineEvent` persiste notas e eventos taticos ao vivo por operacao,
  com tipos `NOTE`, `CALL`, `ENGAGE`, `WIPE`, `OBJECTIVE_CAPTURED`, `BOSS`,
  `TARGET_SWAP`, `SUBSTITUTION`, `RISK` e `CLOSED`.
- API Staff-only `GET /war-room/operations/:operationId/live` retorna operacao,
  escala com conflitos, checklist calculado, timeline e timestamp de geracao.
- API Staff-only `POST /war-room/operations/:operationId/timeline` registra
  evento ao vivo com DTO forte, autoria Staff e audit log.
- `/dashboard/staff/war-room` ganhou painel ao vivo na operacao selecionada,
  com checklist, formulario rapido de registro, timeline em ordem recente e
  refresh periodico.

Entregas:

- Criar modo "ao vivo" para Staff durante a janela da operacao.
- Mostrar timers, checklist, composicao, calls anotadas, objetivos, riscos e
  links de acao.
- Permitir notas rapidas por horario, com autoria Staff.
- Permitir marcar eventos de combate: engage, wipe, objetivo capturado, boss,
  troca de alvo, substituicao e encerramento.
- Preparar base para relatorio pos-guerra.

Definicao de pronto:

- Tela densa e responsiva, sem recarregar a cada anotacao.
- Historico ordenado por tempo.
- Sem dependencias de Discord.
- Build Web/API passa.

### Fatia 1.4 - Pos-guerra e aprendizado

Estado em 2026-07-11: `implementado`.

Entregue:

- `WarRoomOperation` ganhou placar livre (`score`) e pontos de melhoria
  (`improvementNotes`) no encerramento.
- Timeline ao vivo ganhou tipo `CONTRIBUTION`, alem do evento `CLOSED`
  automatico ao encerrar a operacao.
- API Staff-only `GET /war-room/operations/:operationId/after-action` gera
  relatorio pos-guerra com planejado vs realizado, presencas finais,
  substituicoes, contribuicoes, riscos, wipes, objetivos, sinais e Markdown.
- `/dashboard/staff/war-room` ganhou campos de encerramento para resultado,
  placar e melhorias, alem de bloco pos-guerra com sinais e copia de Markdown.

Entregas:

- Encerrar operacao com resultado, placar livre, observacoes e pontos de
  melhoria.
- Gerar resumo Staff copiavel em Markdown.
- Registrar presenca final, substituicoes e contribuicoes observadas.
- Gerar sinais para o relatorio semanal da guilda.

Definicao de pronto:

- Staff consegue comparar planejado vs. realizado.
- Resumo nao expoe informacao indevida a players.
- Historico fica consultavel no dossie universal.

## Frente 2 - Roster por classe, build e funcao

Objetivo: dar visao real da composicao da guilda para conteudo competitivo e
PvE, especialmente com mudancas de meta e novas classes.

### Fatia 2.1 - Perfil de combate

Estado em 2026-07-11: `implementado`.

Entregue:

- `PlayerCombatProfile` guarda classe primaria/secundaria, build declarada,
  papel preferido, papeis aceitos, disponibilidade e notas Staff/publicas.
- `PlayerCombatProfileChangeRequest` permite o player solicitar atualizacao com
  nota e print opcional; Staff aprova/rejeita com auditoria.
- API `players` ganhou endpoints Staff/player com DTOs fortes para perfil de
  combate e pedidos pendentes.
- Tela Staff `/dashboard/staff/players` virou roster inicial editavel, com
  resumo de composicao e fila de pedidos.
- Tela player `/dashboard/profile` mostra o proprio perfil de combate e permite
  pedir atualizacao sem expor dados de terceiros.

Entregas:

- Expandir perfil operacional do player com classe atual, classe secundaria,
  build declarada, papel preferido, papel aceito e disponibilidade.
- Incluir classes atuais de Raven2, mantendo lista configuravel para futuras
  classes.
- Tratar Warlord como classe suportada desde o inicio.
- Permitir historico de troca de classe/build aprovado pela Staff.

Definicao de pronto:

- Staff pode editar perfil de combate.
- Player pode sugerir atualizacao com print/nota quando fizer sentido.
- Alteracoes relevantes entram na auditoria.

### Fatia 2.2 - Matriz de composicao

Estado em 2026-07-11: `implementado`.

Entregue:

- `GET /players/combat-roster` retorna matriz Staff-only com contagens por
  classe, role, camada e disponibilidade, alem de linhas por player.
- O calculo sinaliza falta de frontline/suporte, excesso de reservas, build nao
  mapeada, STATUS antigo, baixa presenca e disponibilidade incompleta.
- A tela Staff `/dashboard/staff/players` mostra contadores, alertas, filtros
  por disponibilidade/camada/classe/role/presenca/STATUS e tabela densa.
- Export/Markdown copiavel foi adicionado para pauta de reuniao Staff.
- Teste direto cobre gargalos de composicao e STATUS antigo.

Entregas:

- Tela Staff de roster com contagem por classe, papel, camada, presenca e
  atividade recente.
- Alertas de composicao: falta frontline, falta suporte, excesso de reserva,
  baixa cobertura de horario, players sem status recente.
- Filtros por disponibilidade, camada, classe, role, presenca e situacao.

Definicao de pronto:

- Staff identifica gargalos de composicao em menos de uma tela.
- Export/Markdown copiavel para reuniao Staff.
- Sem exposicao para players alem do proprio perfil.

### Fatia 2.3 - Roster aplicado ao War Room

Estado em 2026-07-11: `implementado`.

Entregue:

- `GET /war-room/operations/:operationId/roster` agora retorna
  `compositionImpact`, com cobertura atual por papel, contagem por classe e
  lacunas explicitas da composicao.
- O mesmo dossie retorna `suggestions`: candidatos ativos ainda nao escalados,
  papel sugerido, score operacional, motivos e alertas como presenca baixa,
  build ausente ou disponibilidade incompleta.
- `/dashboard/staff/war-room` mostra impacto de composicao e sugestoes
  explicaveis; a Staff pode aplicar uma sugestao ao formulario, mas a escala so
  e criada quando confirma manualmente.
- Sugestoes usam dados reais do roster/combat profile, sem automatizar decisao
  nem expor esse contexto para players.

Entregas:

- Ao montar escalacao, sugerir players por papel necessario.
- Mostrar impacto da escalacao na composicao: faltando/sobrando por role.
- Mostrar alternativas de reserva com base em disponibilidade e presenca.

Definicao de pronto:

- War Room consome dados reais do roster.
- Sugestoes sao explicaveis e nao automticas.

## Frente 3 - Simulador de DKP e politicas de loot

Objetivo: permitir que Staff teste mudancas de regra antes de mexer na economia
da guilda.

### Fatia 3.1 - Snapshot economico de DKP

Estado em 2026-07-11: `implementado`.

Entregue:

- `GET /dkp/staff/economy` continua Staff-only e agora retorna snapshot
  expandido da economia DKP com distribuicao por faixas, media, mediana,
  concentracao dos top 10, atividade recente, DKP travado, top acumuladores,
  ganhos/gastos e acumuladores inativos.
- O calculo identifica sinais de concentracao, pressao inflacionaria, saldo
  alto com baixa atividade, baixa rotatividade de vencedores e atividade
  recente reduzida.
- `/dashboard/staff/economy` mostra resumo, barras de distribuicao, sinais
  economicos, ranking Staff e Markdown copiavel.
- Teste direto em `dkp.service.test.ts` cobre distribuicao, concentracao,
  acumulador inativo e Markdown do snapshot.

Entregas:

- Criar endpoint Staff read-only com distribuicao de DKP atual.
- Calcular concentracao, mediana, media, top acumuladores, DKP travado e
  atividade recente.
- Identificar sinais: inflacao, acumulacao extrema, baixa rotatividade de
  vencedores e players com DKP alto/inatividade.

Definicao de pronto:

- Nenhum player ve ranking ou distribuicao global.
- Staff tem resumo e graficos simples.
- Testes garantem sigilo.

### Fatia 3.2 - Simulador de decay

Estado em 2026-07-11: `implementado`.

Entregue:

- `DkpPolicySimulation` persiste rascunhos Staff de simulacao com tipo `DECAY`,
  status, nome, config JSON, resultado JSON e autoria.
- `POST /dkp/staff/simulations/decay/preview` calcula decay hipotetico sem
  persistir nem alterar transacoes/locks.
- `POST /dkp/staff/simulations/decay` salva cenario como rascunho auditado;
  `GET /dkp/staff/simulations` lista rascunhos recentes.
- O calculo suporta percentual e piso protegido, mostra total antes/depois,
  DKP removido, players afetados, distribuicao antes/depois e top impactados.
- `/dashboard/staff/economy` ganhou formulario de decay, preview, salvar
  rascunho, dossie Markdown copiavel e lista de rascunhos.
- Teste direto cobre preview e salvamento sem mutar transacoes.

Entregas:

- Staff escolhe percentual, periodicidade e regra de minimo.
- Sistema calcula resultado hipotetico sem persistir.
- Mostrar players mais impactados e efeito na distribuicao.
- Permitir salvar cenario como rascunho Staff.

Definicao de pronto:

- Simulacao e explicitamente read-only.
- Dossie de simulacao tem Markdown copiavel.
- Nao altera DKP real.

### Fatia 3.3 - Simulador de bid cap, taxa e floor

Estado em 2026-07-11: `implementado`.

Entregue:

- `DkpPolicySimulationType` ganhou `BID_POLICY` para rascunhos de politica de
  leilao sem alterar regras reais.
- `POST /dkp/staff/simulations/bid-policy/preview` calcula hipotese
  read-only sobre leiloes finalizados recentes com transacao `AUCTION_WIN`.
- `POST /dkp/staff/simulations/bid-policy` salva rascunho auditado com
  configuracao e resultado JSON; `GET /dkp/staff/simulations` lista rascunhos
  de decay e politica de bid juntos.
- A simulacao suporta custo minimo, taxa do vencedor, teto por tier, teto por
  tipo de item, teto por camada do vencedor, custo fixo por tier e multiplicador
  por modo de leilao.
- O resultado compara gasto historico atual vs proposto, leiloes alterados,
  leiloes capados, floors aplicados, riscos/trade-offs e maiores impactos em
  Markdown copiavel.
- `/dashboard/staff/economy` ganhou formulario Staff para preview/salvamento da
  politica de bids ao lado do simulador de decay.
- Teste direto em `dkp.service.test.ts` cobre preview e salvamento sem criar,
  alterar ou remover transacoes DKP reais.

Entregas:

- Simular teto de bid por item/tier/camada.
- Simular taxa de vitoria, custo minimo, custo fixo por tier e custo por modo.
- Mostrar impacto historico se a regra tivesse existido nos leiloes recentes.

Definicao de pronto:

- Staff compara cenario atual vs. proposto.
- Resultado mostra riscos e trade-offs, nao recomenda cegamente.

### Fatia 3.4 - Promocao de politica

Estado em 2026-07-11: `implementado`.

Entregue:

- `DkpPolicySimulationStatus` ganhou `PROMOTED`; `DkpPolicySimulation` registra
  `promotedById`, `promotedAt` e `promotionReason`.
- `BusinessRule` ganhou a regra `dkpBidPolicy`, normalizada pelo dominio de
  business rules, para documentar a politica operacional aprovada sem confundir
  com o fluxo atual de criacao/finalizacao de leiloes.
- `POST /dkp/staff/simulations/:simulationId/promote` promove apenas rascunhos
  `BID_POLICY` em `DRAFT`, exige `confirm: true` e motivo Staff, publica a regra
  `dkpBidPolicy`, marca o rascunho como `PROMOTED` e audita a acao.
- `/dashboard/staff/economy` permite promover rascunhos `BID_POLICY` recentes
  com motivo operacional e atualiza a lista de simulacoes/regras.
- Teste direto cobre promocao de rascunho para regra operacional sem criar ou
  alterar transacoes DKP.

Entregas:

- Staff pode transformar cenario aprovado em regra operacional documentada.
- Exigir confirmacao e motivo.
- Registrar auditoria e changelog Staff quando publicado.
- Player-facing exige PT-BR/EN se a regra afetar players.

Definicao de pronto:

- Politica publicada tem historico, autor, data e rollback documental.
- Nenhuma regra entra sem confirmacao Staff.

## Frente 4 - Transparencia pos-leilao para players

Objetivo: reduzir fofoca e ticket depois do resultado, preservando sigilo antes
e durante o leilao.

### Fatia 4.1 - Recibo player do resultado

Estado em 2026-07-11: `implementado`.

Entregue:

- `GET /auctions/:id/result/me` retorna recibo autenticado apenas apos
  `FINISHED`.
- O contrato diferencia `WINNER`, `PARTICIPANT` e `OBSERVER`, com status final,
  bid proprio quando existir, regra aplicada, status de entrega, motivo seguro e
  proximos passos em PT-BR/EN.
- Vencedor ve o proprio custo e entrega; participante ve apenas propria
  participacao e motivo seguro; observador recebe resumo sem participacao.
- O endpoint nao retorna ranking, bids de terceiros, locks de terceiros,
  identidade de concorrentes nem custo do vencedor para nao vencedores.
- `/dashboard/auctions/[id]` mostra o card "Recibo do resultado" quando o
  leilao esta finalizado.
- Testes de `auctions.service.test.ts` cobrem recibo do vencedor e garantem que
  recibo de participante nao vaza dados do vencedor.

Entregas:

- Depois de finalizado, player pode ver um resumo seguro do leilao.
- Para vencedor: item, custo, regra aplicada, status da entrega, proximos passos
  e justificativa operacional.
- Para participantes: propria participacao, status final, motivo seguro de nao
  vencer e link para regras.
- Nao exibir ranking completo, bids de terceiros ou locks de terceiros.

Definicao de pronto:

- Contrato diferencia vencedor, participante e observador.
- Testes garantem que dados de terceiros nao vazam.

### Fatia 4.2 - Linha do tempo publica segura

Estado em 2026-07-11: `implementado`.

Entregue:

- `GET /auctions/:id/timeline/me` retorna timeline player-facing sanitizada em
  PT-BR/EN.
- A timeline cobre abertura, encerramento da janela, review Staff quando
  aplicavel, resultado publicado, entrega pendente/concluida, relist ou
  cancelamento.
- O payload nao inclui ranking, bids, locks, playerId de vencedor, custo do
  vencedor ou identidade de concorrentes.
- `/dashboard/auctions/[id]` mostra a timeline segura no detalhe do leilao,
  enquanto Staff continua tendo a timeline completa no diagnostico operacional.
- Teste direto garante que a timeline player nao vaza vencedor, valor de
  transacao, bid ou lock.

Entregas:

- Mostrar timeline sanitizada: leilao abriu, encerrou, resultado calculado,
  review Staff quando houver, entrega pendente/concluida.
- Staff ve timeline completa; player ve apenas versao segura.

Definicao de pronto:

- Mesmo leilao gera duas visoes: Staff completa e player segura.
- Player-facing PT-BR/EN.

### Fatia 4.3 - Contestacao controlada

Estado em 2026-07-11: `implementado`.

Entregue:

- `AuctionDispute` registra contestacao por leilao/player com motivo, print
  opcional, status `PENDING`/`ACCEPTED`/`REJECTED`, notas Staff internas e notas
  externas PT-BR/EN.
- `BusinessRule` ganhou `auctionDisputeRules` com `enabled` e `windowHours`
  para controlar a janela de contestacao pos-resultado.
- Player usa `GET /auctions/:id/dispute/me` e `POST /auctions/:id/disputes`;
  somente participante de leilao `FINISHED`, dentro da janela configurada, pode
  abrir contestacao.
- Staff usa `GET /auctions/staff/disputes?status=...` para fila filtravel e
  `POST /auctions/staff/disputes/:disputeId/review` para aceitar/rejeitar com
  auditoria.
- A revisao de contestacao nao reabre leilao automaticamente.
- `/dashboard/auctions/[id]` mostra status/envio da contestacao do player; 
  `/dashboard/staff/reviews` mostra fila Staff filtravel e acoes de decisao.
- Testes cobrem criacao dentro da janela e revisao sem alterar o leilao.

Entregas:

- Player pode abrir contestacao dentro de janela configuravel.
- Contestacao exige motivo e, quando aplicavel, print.
- Staff responde com decisao e nota interna/opcional externa.
- Auditoria completa do fluxo.

Definicao de pronto:

- Contestacao nao reabre automaticamente leilao.
- Staff tem fila filtravel.
- Player recebe status claro.

## Frente 5 - Painel de elegibilidade e risco

Objetivo: reunir sinais que a Staff ja considera mentalmente antes de loot,
escala, prioridade e revisao.

### Fatia 5.1 - Risk flags operacionais

Estado em 2026-07-11: `implementado`.

Entregue:

- `UniversalDossier` ganhou `riskFlags` opcionais com chave, label,
  severidade, explicacao e link de evidencia.
- O dossie universal Staff de player calcula flags de trial/recente, baixa
  presenca, ausencia recente, loot caro recente, ausencia de progresso aprovado
  recente, build incompleta, classe critica, muitas contestacoes, muitas trocas
  de classe/build e DKP travado alto.
- `/dashboard/staff/dossier` exibe as flags com severidade e link para
  evidencia Staff.
- As flags sao apenas sinais Staff-only: nao bloqueiam leilao, request, escala,
  entrega, DKP nem qualquer decisao automaticamente.
- Teste direto em `operations-domain-services.test.ts` cobre calculo das flags e
  links de evidencia Staff.

Entregas:

- Definir flags calculadas: trial, baixa presenca, ausencia recente, ganhou item
  caro recentemente, sem progresso aprovado recente, build incompleta, classe
  critica, muita contestacao, muita troca de classe, DKP travado alto.
- Cada flag deve ter severidade, explicacao e link para evidencia.
- Flags sao Staff-only.

Definicao de pronto:

- Flags aparecem no dossie universal do player.
- Nenhuma flag gera punicao automatica.
- Testes cobrem sigilo e calculo.

### Fatia 5.2 - Elegibilidade contextual

Estado em 2026-07-11: `implementado`.

Implementado:

- `ContextualEligibilityService` calcula elegibilidade contextual Staff-only
  para leilao, request, War Room e recrutamento.
- `GET /operations/staff/player-eligibility/:playerId/context` retorna decisao
  `eligible`, `review` ou `blocked`, contexto, player, motivos estruturados,
  regras aplicadas e links de evidencia.
- Leilao reutiliza a elegibilidade transacional existente sem auditar tentativa
  de bid; request, War Room e recrutamento explicam camada, presenca, DKP,
  classe/build, historico recente e regra operacional aplicada.
- `/dashboard/staff/dossier` ganhou bloco de elegibilidade contextual no dossie
  de player, sem expor ranking, bids, locks ou informacao de terceiros para
  players.
- Teste de dominio cobre request contextual Staff-only; builds API/Web passam.

Entregas:

- Para leilao, request, War Room e recrutamento, calcular elegibilidade
  contextual.
- Exibir motivo: camada, presenca, DKP, classe/build, historico recente e regra
  de negocio aplicada.

Definicao de pronto:

- Staff entende "por que este player apareceu aqui".
- Player continua vendo apenas elegibilidade propria onde ja for permitido.

### Fatia 5.3 - Review Staff assistida

Estado em 2026-07-11: `implementado`.

Implementado:

- `StaffReviewDetails` ganhou `assistedReview` com alertas compactos para
  candidato inelegivel, review Staff exigida, divergencia bid/lock, presenca
  baixa, score baixo e votos divididos.
- `/dashboard/staff/reviews` mostra o bloco "Review assistida" nos cards de
  decisao, com severidade, explicacao e link de evidencia.
- `POST /staff/reviews/:auctionId/alerts/override` permite ignorar alerta com
  motivo obrigatorio e registra `AUCTION_REVIEW_ALERT_OVERRIDDEN` no audit log.
- Override de alerta nao aprova vencedor, nao rejeita resultado e nao invalida
  bid; a decisao humana continua pelas acoes existentes e quorum configurado.
- Teste cobre geracao de alertas e auditoria de override.

Entregas:

- Em telas de decisao, mostrar um bloco compacto de riscos e evidencias.
- Permitir Staff ignorar alerta com motivo.
- Auditar override.

Definicao de pronto:

- Decisao humana permanece soberana.
- Override aparece em auditoria e dossie.

## Frente 6 - Planejador de bosses, Abyss e rotina PvE

Objetivo: organizar preparacao, execucao e revisao de conteudos PvE/world/guild.

### Fatia 6.1 - Calendario operacional expandido

Estado em 2026-07-11: `implementado`.

Implementado:

- `Event` ganhou `operationalCategory`, `priority`, `endsAt`,
  `responsibleUserId`, `checklist` e `operationalNotes`, todos opcionais ou com
  default para manter eventos antigos compativeis.
- Migration `20260711170000_add_event_operational_planning` versiona os novos
  campos e indices.
- Criacao Staff de eventos aceita categoria boss/Abyss/guild raid/farm/treino/
  Clash/custom, prioridade, janela e notas operacionais.
- A tela `/dashboard/admin/events` exibe categoria, prioridade, janela,
  responsavel e mantem a independencia de cada evento de boss/lote.

Entregas:

- Evoluir eventos para suportar categorias: boss, Abyss, guild raid, farm,
  treino, Clash e custom.
- Manter regra existente: cada boss possui evento, presenca e DKP
  independentes, mesmo quando criado em lote.
- Permitir prioridade, janela, responsavel e checklist.

Definicao de pronto:

- Eventos antigos continuam compativeis.
- Boss batch nao perde independencias atuais.

### Fatia 6.2 - Checklist por conteudo

Estado em 2026-07-11: `implementado`.

Implementado:

- Eventos recebem checklist reutilizavel por categoria/tipo quando a Staff nao
  envia um checklist manual.
- `POST /events/:id/checklist/:key` marca/desmarca item com nota opcional e
  audita `EVENT_CHECKLIST_ITEM_UPDATED`.
- `/dashboard/admin/events` mostra checklist marcavel durante execucao.
- War Room vinculada a evento inclui os itens do checklist do evento no live
  dossier, junto do checklist tatico ja existente.
- Teste cobre mutacao auditada de checklist.

Entregas:

- Checklist reutilizavel por tipo de conteudo.
- Exemplos: rota, caller, grupo minimo, classes chave, consumiveis, prints,
  loot esperado, backup de presenca.
- Staff pode marcar itens durante a execucao.

Definicao de pronto:

- Checklist aparece no evento e no War Room quando ligado.
- Mudancas geram audit log quando relevantes.

### Fatia 6.3 - Preparacao automatica por boss/Abyss

Estado em 2026-07-11: `implementado`.

Implementado:

- `GET /events/:id/readiness` ja entrega players provaveis via presenca,
  ausencia relativa aos ativos, gaps por classe/papel, camadas, CP aprovado e
  STATUS desatualizado.
- O payload ganhou `actionLinks` para presenca, requests, interesses, roster,
  War Room e progresso conforme os gargalos detectados.
- A tela Staff exibe prontidao antes da finalizacao/inicio sem expor dados
  sensiveis aos players.

Entregas:

- Mostrar players provaveis, ausencias, gargalos de classe e pendencias de
  progresso antes do evento.
- Sugerir links para requests, interesses, roster e presenca.

Definicao de pronto:

- Staff recebe uma visao de prontidao antes de iniciar.
- Nenhum dado sensivel e exposto a players.

## Frente 7 - Wishlist inteligente de itens

Objetivo: captar demanda real antes do drop para melhorar leilao, craft,
requests e planejamento de loot.

### Fatia 7.1 - Wishlist do player

Estado em 2026-07-11: `implementado`.

Implementado:

- Modelo `PlayerWishlistItem` com prioridade, status, motivo, build, nota,
  print opcional, timestamps e vinculacao ao item catalog.
- `GET/POST /wishlist/me` e `PATCH /wishlist/me/:wishlistItemId/(pause|resume|remove)`
  permitem ao player criar, pausar, retomar e remover apenas a propria wishlist.
- `/dashboard/wishlist` permite criar e gerenciar desejos player-facing.
- DTOs usam validacao forte para item, prioridade e textos.

Entregas:

- Player marca itens desejados, prioridade, motivo, build relacionada e nota.
- Suportar vinculo com print quando necessario.
- Player pode pausar/remover desejo.
- Player ve apenas a propria wishlist.

Definicao de pronto:

- Player-facing PT-BR/EN.
- Validacao forte de item, prioridade e texto.

### Fatia 7.2 - Demanda Staff por item

Estado em 2026-07-11: `implementado`.

Implementado:

- `GET /wishlist/staff/items` agrega demanda por item, prioridade, classe,
  camada, atividade e sinais operacionais Staff-only.
- `/dashboard/staff/wishlist` mostra demanda por item e interessados com
  camada, classe, presenca, build e sinais.
- A demanda integra `ItemCatalog` e fica separada dos endpoints player-facing.

Entregas:

- Staff ve demanda agregada por item, classe, camada, prioridade e atividade.
- Mostrar players interessados com sinais operacionais Staff-only.
- Integrar com item catalog e interesses existentes.

Definicao de pronto:

- Staff consegue abrir item e entender demanda real.
- Dados sensiveis seguem Staff-only.

### Fatia 7.3 - Wishlist ligada a drops/leiloes

Estado em 2026-07-11: `implementado`.

Implementado:

- Staff consegue abrir demanda por item antes de drop/leilao/interesse pela tela
  `/dashboard/staff/wishlist`.
- `POST /wishlist/staff/:wishlistItemId/fulfill` marca wishlist como atendida
  com confirmacao Staff, nota opcional e audit log
  `WISHLIST_ITEM_FULFILLED_BY_STAFF`.
- O fluxo nao cria bid, nao inscreve player em interesse e nao registra entrega
  automaticamente.
- Teste cobre criacao player e fulfil Staff auditado.

Entregas:

- Ao registrar drop, mostrar demanda da wishlist para aquele item.
- Ao criar leilao/interesse, sugerir publico elegivel.
- Depois do resultado, atualizar status da wishlist do vencedor quando fizer
  sentido, com confirmacao Staff.

Definicao de pronto:

- Nao cria bid automatico.
- Nao inscreve player automaticamente em interesse.
- Staff confirma qualquer acao que afete loot.

## Frente 8 - Relatorio semanal de progresso da guilda

Objetivo: transformar dados operacionais em leitura executiva para Staff.

### Fatia 8.1 - Dataset semanal

Estado em 2026-07-11: `implementado`.

Implementado:

- `GuildProgressReportService` agrega periodo semanal/mensal com presenca,
  bosses/eventos, drops, leiloes, requests, progresso, War Room, wishlist e
  riscos.
- `GET /operations/staff/guild-progress?period=week|month` e Staff-only,
  read-only, com Markdown copiavel.
- Teste cobre dataset Staff e resumo seguro sem dados sensiveis.

Entregas:

- Agregar presenca, bosses, drops, leiloes, requests, progresso, War Room,
  wishlist, recrutamento e riscos.
- Separar periodo semanal e mensal.
- Reaproveitar `WeeklySummaryService` onde fizer sentido.

Definicao de pronto:

- Endpoint Staff read-only.
- Testes para periodo e sigilo.

### Fatia 8.2 - Tela Staff de progresso da guilda

Estado em 2026-07-11: `implementado`.

Implementado:

- `/dashboard/staff/guild-progress` mostra cards compactos, distribuicao por
  classe, riscos, proximas acoes e Markdown copiavel.
- A tela fica na Central Staff como ferramenta de auditoria/decisao.

Entregas:

- Mostrar cards compactos: atividade, bosses, loot entregue, gargalos, players
  em evolucao, classes criticas, riscos, proximas acoes.
- Graficos simples e tabelas densas.
- Markdown copiavel para reuniao Staff.

Definicao de pronto:

- Nao vira dashboard decorativo.
- Staff consegue decidir proximas acoes a partir da tela.

### Fatia 8.3 - Resumo player seguro

Estado em 2026-07-11: `implementado`.

Implementado:

- `GET /operations/me/weekly-summary?period=week|month` retorna resumo coletivo
  PT-BR/EN sem ranking individual nem dados de terceiros sensiveis.
- `/dashboard/weekly-summary` exibe conquistas coletivas e links de acao para
  eventos, progresso e wishlist.

Entregas:

- Criar opcionalmente resumo player-facing da semana, sem ranking nem dados de
  terceiros sensiveis.
- Exibir conquistas coletivas, proximos eventos e chamadas de acao.

Definicao de pronto:

- Conteudo PT-BR/EN.
- Sem ranking individual publico.

## Frente 9 - Modulo de recrutamento

Objetivo: organizar entrada de novos players pelo site, sem depender de comando
Discord ou planilha externa.

### Fatia 9.1 - Formulario publico de candidatura

Estado em 2026-07-11: `implementado`.

Implementado:

- Rota publica `/apply` em PT-BR/EN e endpoint `POST /recruitment/applications`.
- Cadastro externo com nick, Discord, classe, poder, camada dimensional,
  disponibilidade, foco, experiencia, print/prova opcional, observacoes e
  aceite obrigatorio de regras.
- Rate limit local por origem para reduzir spam publico, sem expor dados
  sensiveis.

Entregas:

- Criar rota publica de candidatura.
- Campos: nick, Discord tag/ID quando aplicavel, classe, poder/camada,
  disponibilidade, foco PvP/PvE, experiencia, prints, observacoes e aceite de
  regras.
- Rate limit e upload seguro.
- Conteudo publico PT-BR/EN.

Definicao de pronto:

- Candidato externo consegue enviar pelo site.
- Dados sensiveis nao aparecem publicamente.
- Staff recebe fila interna.

### Fatia 9.2 - Fila Staff de recrutamento

Estado em 2026-07-11: `implementado`.

Implementado:

- Tela Staff `/dashboard/staff/recruitment` com fila por status e resumo de
  candidatos.
- Endpoints Staff `GET /recruitment/staff/applications` e
  `POST /recruitment/staff/applications/:applicationId/review`.
- Aprovacao, recusa, triagem, conversao e arquivamento exigem motivo e geram
  auditoria.

Entregas:

- Staff ve candidatos por status: novo, em triagem, aprovado, recusado,
  convertido, arquivado.
- Filtros por classe, horario, foco, camada e risco.
- Notas internas e historico de decisao.

Definicao de pronto:

- Aprovacao/recusa exige motivo.
- Auditoria completa.

### Fatia 9.3 - Conversao para player

Estado em 2026-07-11: `implementado`.

Implementado:

- Status `CONVERTED` auditado preserva a origem da candidatura e o motivo da
  decisao Staff.
- `POST /recruitment/staff/applications/:applicationId/convert` converte
  candidatura aceita em `Player`, cria `PlayerCombatProfile`, grava nota Staff
  com checklist de onboarding e bloqueia duplicidade por nick/usuario.
- A conversao exige `userId` existente e nao automatiza Discord, roles ou
  permissoes externas.

Entregas:

- Converter candidato aprovado em player interno.
- Preencher perfil de combate inicial.
- Criar checklist de onboarding: regras, presenca, wishlist, progresso,
  privacidade e proximos eventos.

Definicao de pronto:

- Conversao evita duplicidade de player.
- Staff consegue rastrear origem do cadastro.

## Dependencias entre frentes

Ordem tecnica recomendada:

1. Roster por classe/build basico.
2. War Room modelo + escalacao.
3. Planejador de bosses/Abyss integrado ao War Room.
4. Painel de elegibilidade/risco.
5. Wishlist inteligente.
6. Transparencia pos-leilao.
7. Simulador de DKP.
8. Relatorio semanal de progresso.
9. Recrutamento.

Justificativa:

- Roster alimenta War Room, elegibilidade, recrutamento e relatorios.
- War Room cria a espinha dorsal para Clash/GvG/Abyss.
- Elegibilidade/risco reutiliza dados de roster, presenca, loot e progresso.
- Wishlist melhora loot antes de mexer em regra economica.
- Simulador de DKP deve vir depois de boa visao de dados, para nao virar botao
  perigoso em cima de contexto incompleto.

## Contratos e entidades provaveis

Entidades candidatas:

- `PlayerCombatProfile`
- `PlayerClassHistory`
- `WarRoomOperation`
- `WarRoomRosterSlot`
- `WarRoomTimelineEvent`
- `WarRoomChecklistItem`
- `DkpPolicySimulation`
- `AuctionPlayerReceipt`
- `AuctionAppeal`
- `OperationalRiskFlag`
- `PlayerWishlistItem`
- `RecruitmentApplication`
- `RecruitmentReview`

Contratos compartilhados provaveis:

- `packages/shared/src/types/war-room.ts`
- `packages/shared/src/types/roster.ts`
- `packages/shared/src/types/wishlist.ts`
- `packages/shared/src/types/recruitment.ts`
- `packages/shared/src/types/guild-progress.ts`

## Navegacao sugerida

Staff:

- `/dashboard/staff/war-room`
- `/dashboard/staff/roster`
- `/dashboard/staff/dkp-simulator`
- `/dashboard/staff/guild-progress`
- `/dashboard/staff/recruitment`

Player:

- `/dashboard/wishlist`
- `/dashboard/my-war-room`
- `/dashboard/auction-results`
- `/apply`

Integracoes em telas existentes:

- Dossie universal de player.
- Diagnostico de leilao.
- Eventos Staff.
- Admin items.
- Requests/interesses.
- Dashboard player/action plan.

## Validacao minima por tipo

Schema/banco:

```powershell
npx.cmd prisma validate --schema packages/database/prisma/schema.prisma
npx.cmd prisma generate --schema packages/database/prisma/schema.prisma
```

API:

```powershell
npm.cmd run lint
npm.cmd run build --workspace apps/api
```

Web:

```powershell
npm.cmd run build --workspace apps/web
```

Roadmap/docs:

```powershell
git diff --check
```

Fatia com player-facing:

- Verificar PT-BR e EN.
- Verificar que sigilo de leilao, ranking, bids, locks e identidade de
  participantes continua preservado.

Fatia Staff-only:

- Conteudo somente PT-BR.
- Sem expor segredo, webhook URL, token, cookie ou `.env`.

## Criterios de aceite da rodada completa

- Staff consegue planejar e operar uma janela de Clash/GvG pelo site.
- Staff conhece composicao real da guilda por classe/build/funcao.
- Staff consegue simular mudanca de DKP antes de aplicar.
- Player entende o proprio resultado de leilao depois do encerramento.
- Staff ve riscos operacionais sem automatizar punicao.
- Bosses/Abyss possuem checklist e prontidao antes da execucao.
- Wishlist mostra demanda real antes do drop.
- Relatorio semanal resume saude e progresso da guilda.
- Recrutamento entra pelo site e vira player interno com onboarding.
- Nenhuma entrega depende de comando Discord.

## Controle anti-reexecucao

Antes de executar qualquer fatia deste roadmap:

1. Classificar cada fatia como `implementado`, `parcial`, `pendente` ou
   `futuro`.
2. Conferir `git log --oneline -- docs/RAVEN2_GUILD_WAR_PRODUCT_ROADMAP_2026_07.md`.
3. Conferir codigo, `WIKI.md` e changelogs para evitar reimplementar algo ja
   entregue.
4. Escolher uma unica fatia pequena.
5. Atualizar este documento com `Estado em YYYY-MM-DD` ao finalizar a fatia.
6. Atualizar `WIKI.md` quando houver mudanca de arquitetura, contrato, fluxo,
   regra de negocio ou experiencia Staff/player.

## Primeira fatia recomendada

Comecar por `Fatia 2.1 - Perfil de combate`.

Motivo:

- E a base mais reutilizavel.
- Tem valor imediato para Staff.
- Alimenta War Room, recrutamento, wishlist, relatorios e elegibilidade.
- Pode ser entregue sem mexer ainda nas regras sensiveis de DKP/leilao.

Definicao da primeira entrega:

- Schema de perfil de combate.
- API Staff para editar.
- Player pode visualizar o proprio perfil.
- Tela Staff simples de roster inicial.
- WIKI atualizada.
- Testes de validacao/permissao.
- Build API/Web.
