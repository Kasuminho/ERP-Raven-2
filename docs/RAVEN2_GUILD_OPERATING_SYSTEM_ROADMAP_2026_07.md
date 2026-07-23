# Roadmap de produto Raven2 - Guild Operating System 2026-07

## Estado atual da release

O prelude e as Frentes 1/2/3/4/5/6/7/9 abaixo integram a release
2026-07-21 e estao em producao. Os blocos detalhados `Estado em 2026-07-21`
preservam o retrato historico do checkout antes da autorizacao de publicacao;
a tabela de estado vivo e a auditoria de conclusao abaixo sao as fontes atuais.
A Frente 0 continua parcial ate a Staff registrar entrevistas reais e quatro
semanas consecutivas; a Frente 8 continua futura e condicionada a um caso
coletivo real validado.

Documento vivo de descoberta, planejamento e execucao da nova rodada de produto
do ERP Raven2. Esta rodada nao reabre os roadmaps anteriores. Ela partiu do
estado real do codigo em 2026-07-20, confrontou esse estado com dores publicas de
guildas de MMORPGs e agora registra as hipoteses validadas, entregas locais e
proximas pendencias reais.

## Resumo executivo

O Raven2 ja e muito mais completo que um tracker de DKP. O produto cobre o
nucleo transacional e operacional da G3X: players, presenca por boss, eventos,
DKP, locks, leiloes sigilosos, reviews, drops, interesses, requests, progresso,
roster, War Room, wishlist, recrutamento, comunicacao, auditoria, deploy e
vendas por diamantes.

A maior lacuna agora nao e outro painel de loot. E a camada humana que existe
antes e depois das transacoes:

1. saber antecipadamente quem realmente pode participar;
2. absorver ferias, imprevistos, reservas e no-shows sem ping manual;
3. tornar regras e mudancas de politica compreensiveis e comprovaveis;
4. levar um recruta ate pertencimento e participacao real;
5. distribuir o trabalho da Staff para a guilda nao depender de duas pessoas;
6. transformar conhecimento de boss/guerra em memoria reutilizavel;
7. comunicar sem obrigar o player a vigiar site, forum, chat e voz ao mesmo tempo.

Direcao recomendada: evoluir o ERP de **sistema de registro da operacao** para
**sistema operacional da guilda**, mantendo o julgamento humano em decisoes
sociais, disciplinares e de loot.

Primeira entrega recomendada: **Central de Compromissos, RSVP e Ausencias**.

## Estado vivo de execucao

Atualizado em 2026-07-22, depois de reconciliar codigo, producao, banco e pendencias reais:

| Bloco | Estado | Evidencia/proximo passo |
| --- | --- | --- |
| Prelude solicitado - cobranca direta de pendencias | `implementado em producao` | Cron diario idempotente, notificacao Web e DM bilingue para perfil/STATUS/presenca/Codex; migration, testes e Centrais live atualizadas. |
| Frente 0 - baseline e validacao G3X | `parcial em coleta` | Duas entrevistas reais foram registradas: lideranca Staff e player de baixa atividade. RSVP ja foi validado como redutor de cobranca; faltam Staff de eventos/loot, quatro entrevistas de players com os tres perfis ainda ausentes e quatro semanas consecutivas. |
| Fatia 1.1 - RSVP generico | `implementado em producao` | Contrato, API, telas player/Staff, privacidade, auditoria, migration e testes concluidos. |
| Fatia 1.2 - periodos de ausencia | `implementado em producao` | Cadastro player, privacidade, cobertura automatica de eventos, impacto agregado Staff, migration, telas e testes concluidos. |
| Fatia 1.3 - recorrencia, reserva e composicao | `implementado em producao` | Series semanais, pausa/excecoes, cron de horizonte, alvos explicaveis, reserva confirmada e conflitos por timezone concluidos. |
| Fatia 1.4 - lembretes e no-show explicavel | `implementado em producao` | Preferencia Web/Discord/ambos/nenhum, lembrete idempotente em 24h somente para sem resposta/confirmados e justificativa de no-show sem punicao automatica concluidos. |
| Fatia 2.1 - versoes publicadas de politica | `implementado em producao` | Rascunho separado, snapshot imutavel, autoria, vigencia, versao, diff PT-BR/EN e deteccao de drift concluidos. |
| Fatia 2.2 - recibo de ciencia | `implementado em producao` | Inbox/action plan, abertura e ciencia idempotentes, cobertura Staff e selo emergencial com motivo concluidos. |
| Fatia 2.3 - casos e recursos privados | `implementado em producao` | Caixa privada, conversa separada de nota interna, dono/prazo/historico e integracao sem duplicar contestacao de leilao concluidos. |
| Fatia 3.1 - plano de onboarding | `implementado em producao` | Template Staff versionado, snapshot por player, prazo, proximo passo bilingue e instancia na conversao concluidos. |
| Fatia 3.2 - trial com criterio visivel | `implementado em producao` | Periodo/objetivo/criterios bilingues publicados, check-ins 7/14/30, pausa por ausencia e decisao manual auditada concluidos. |
| Fatia 3.3 - mentoria e primeira atividade | `implementado em producao` | Voluntariado explicito, grupo de acolhimento, pedidos de ajuda estruturados e cinco marcos factuais concluidos. |
| Fatia 4.1 - pulso voluntario | `implementado em producao` | Resposta sem identidade, recibo separado, grupo minimo, moderacao e expurgo diario documentados. |
| Fatia 4.2 - sinais explicaveis | `implementado em producao` | Cinco sinais com fatos/janelas, comparacao de presenca, historico RSVP e coorte sem score/acao automatica. |
| Fatia 4.3 - saude da lideranca | `implementado em producao` | Check-in de carga/plantao, cobertura por sete areas e concentracao auditada com recomendacao de delegar/pausar. |
| Fatia 5.1 - fila Staff atribuivel | `implementado em producao` | Tarefa persistida, sugestoes confirmaveis, dono/substituto/prazo/link e handoff auditado concluidos. |
| Fatias 5.2-5.3 | `implementado em producao` | Cobertura declarada e automacao Staff segura concluidas. |
| Frente 6 | `implementado em producao` | Playbook versionado, licoes do after-action e leitura por papel concluidos. |
| Frente 7 | `implementado em producao` | Preferencias/quiet hours, digest e acoes Discord espelhadas concluidos. |
| Frente 8 | `futuro condicionado` | Nao implementar sem caso real validado de campanha coletiva. |
| Frente 9 | `implementado em producao` | Validacao forte, telemetria agregada, smoke com artefato, runbooks, retencao e E2E HTTP/Nest sobre PostgreSQL descartavel concluidos; CI aplica todas as migrations antes dos quatro fluxos criticos. |

A Central de Compromissos foi priorizada porque era a lacuna mais frequente
nas comunidades pesquisadas, possuia encaixe direto no modelo de eventos e War
Room e reduzia trabalho manual sem tocar nas regras sensiveis de DKP/leilao.

## Auditoria de conclusao tecnica

Auditoria tecnica executada em 2026-07-21 contra `master`, producao e Discord,
com estado da coleta no banco atualizado em 2026-07-22:

- o prelude usa `PLAYER_STATUS_MAX_AGE_DAYS=21`, janela de presenca de 15 dias
  e limite estrito abaixo de 50%; perfil sem build/role/disponibilidade e Codex
  `SENT` entram no lembrete diario consolidado e idempotente por player/dia;
- o cron roda diariamente em `America/Sao_Paulo`, entrega notificacao Web e DM
  PT-BR/EN e possui testes para os cinco sinais, limite exato de 50%, ausencia
  de evento elegivel, Codex pendente e deduplicacao diaria;
- as Frentes 1/2/3/4/5/6/7/9, migrations e tutoriais chegaram a producao no
  commit de release `410c700`; o hardening posterior e o cockpit da Frente 0
  chegaram pelos commits `2bbc5eb` e `6522633`;
- o workflow `Build Docker images` da versao `6522633` concluiu quality gates,
  imagens e smoke com sucesso, e `/health` confirmou a mesma versao em producao;
- a Central do Player possui 20/20 posts canonicos PT-BR/EN; a Central Staff
  possui 30/30 posts PT-BR, 12/12 tags, indices e permissoes verificadas;
- o banco da campanha `G3X-2026-07` registra duas entrevistas reais e auditadas:
  lideranca Staff e player de baixa atividade. Ambas confirmam reducao de
  cobranca manual por RSVP; o gate esta em 1/3 perfis Staff, 1/5 entrevistas de
  players, 1/4 perfis de player e zero semanas congeladas;
- nao existe caso coletivo real documentado que autorize a Frente 8. Ela nao e
  pendencia da release: e uma opcao futura protegida por gate de descoberta.

Condicao restante para encerrar o programa: a Staff deve completar a amostra
real de entrevistas e congelar as quatro semanas consecutivas de 27/07 a 24/08.
O ERP calcula as metricas automaticas; a Staff declara somente presenca esperada
e minutos de cobranca. Nenhum dado deve ser inferido ou preenchido retroativamente.

Proxima acao operacional comprovada em 2026-07-22: entrevistar o perfil
`STAFF_EVENTS`; depois, `STAFF_LOOT` e os perfis de player veterano, novato e
ativo, completando ao menos cinco entrevistas de players. A primeira semana de
baseline inicia em 27/07 e so pode ser congelada depois de encerrada em 03/08.

## Metodo e limites da descoberta

Fontes internas verificadas:

- `AGENTS.md`, `WIKI.md` e historico recente do Git;
- schema Prisma e modulos da API;
- rotas Web e contratos compartilhados;
- roadmaps de produto, implantacao, manutencao e Guild War;
- testes de dominio e changelogs recentes.

Fontes externas usadas:

- material oficial do Raven2;
- discussoes publicas de players e lideres de guilda;
- ferramentas atuais de gestao de guilda/raid;
- estudos academicos sobre coesao, compromisso e trabalho de lideranca em MMOs.

Limitacoes:

- posts de forum e Reddit sao evidencias qualitativas, nao uma amostra
  representativa de todas as guildas;
- dores de WoW e Throne and Liberty so entram no roadmap quando existe mecanismo
  equivalente no Raven2 ou na operacao da G3X;
- funcionalidades anunciadas por ferramentas concorrentes mostram expectativas
  do mercado, nao provam por si so que uma feature gera retencao;
- nenhuma hipotese de saude social deve virar punicao, score secreto de lealdade
  ou decisao automatica sobre membresia/loot.

## Estado reconciliado dos roadmaps anteriores

### Implementado

- Programa original de produto: leiloes explicaveis, dossies, central Staff,
  action plan player, requests, interesses, eventos/lotes, Discord, auditoria,
  deploy e arquitetura foram entregues ou consolidados como historico.
- Roadmap de implantacao 2026-07: ordem 1-12 concluida em 2026-07-10.
- Roadmap Guild War 2026-07: todas as fatias estao marcadas como implementadas:
  roster, War Room, simulador de DKP, transparencia pos-leilao, contestacao,
  riscos, planejamento PvE, wishlist, relatorio e recrutamento.
- Roadmap curto de manutencao: validacao de `notifications`, `audit` e
  `business-rules`, componentizacao de items e stack dry-run por guilda.

### Parcial

- **Eventos e disponibilidade:** existe agenda Staff, presenca real e confirmacao
  em slots de War Room, mas nao ha RSVP generico, talvez, reserva, periodo de
  ausencia ou serie recorrente para toda atividade.
- **Governanca:** existem regras, auditoria, simulacoes e contestacao de leilao,
  mas nao ha versao publicada da politica, diff, data de vigencia e aceite do
  player.
- **Ciclo do membro:** recrutamento, conversao, atividade/inatividade e perfil
  existem; falta acompanhar trial/onboarding, mentor, marcos 7/14/30 dias e
  motivo estruturado de saida/retorno.
- **Saude da guilda:** relatorios mostram operacao, presenca, riscos e progresso;
  nao medem pertencimento, sobrecarga da Staff, integracao de novatos ou risco de
  ruptura de subgrupos.
- **Trabalho da Staff:** briefing, meeting, responsavel de evento e tarefas
  calculadas existem; falta uma fila de trabalho atribuivel com substituto,
  rotacao e handoff.
- **Conhecimento:** ha Central Discord, checklists e after-action de War Room;
  falta um playbook versionado por boss/conteudo que converta aprendizado em
  preparacao da proxima operacao.
- **Discord:** webhooks, previews, fila, retry e foruns oficiais existem; o fluxo
  e majoritariamente de saida. RSVP, ausencia, confirmacao e preferencias ainda
  nao sao self-service nos dois lados.
- **Observabilidade:** diagnostico de smoke/borda foi melhorado, mas a duracao e
  o ultimo resultado autenticado persistido e o runbook especifico de incidente
  de webhook continuam oportunidades tecnicas.

### Pendente

- Central de compromissos, RSVP e ausencias.
- Governanca versionada e recibos de ciencia.
- Onboarding/trial e mentoria operacionais.
- Saude social agregada e feedback seguro.
- Delegacao, rotacao e continuidade da Staff.
- Playbooks de conteudo e aprendizado fechado.
- Preferencias de notificacao, digest e quiet hours.
- Tesouraria/campanhas de recursos alem dos fluxos especificos existentes.

### Futuro

- Diplomacia e operacao multi-guilda/alianca quando houver caso real da G3X.
- Integracoes automaticas com dados do jogo se a Netmarble oferecer API segura.
- OCR de prints apenas como assistente com confirmacao humana.
- Benchmark entre guildas apenas no SaaS, com opt-in e dados agregados.
- Provider Redis/gateway somente quando houver multi-replica real.

## O que as comunidades estao dizendo

### 1. O verdadeiro boss e montar o roster

Lideres relatam recrutamento suficiente, mas presenca irregular, ferias avisadas
por conversa, sumicos e gente que aparece apenas o bastante para nao perder a
vaga. Em outra discussao recente, o termo `roster boss` resume a perda recorrente
de 3-5 jogadores e a dificuldade de repor o grupo durante progressao.

Evidencias:

- [WoW: dificuldade para incentivar presenca regular](https://www.reddit.com/r/wow/comments/ciyx6q/heroic_raid_leaders_how_do_you_encourage_raid/)
- [WoW: roster, burnout e recrutamento destroem progressao](https://www.reddit.com/r/wow/comments/1jwaqls/which_raid_did_your_guild_really_really_struggle/)
- [Skylee: ausencia que auto-recusa eventos no periodo](https://skylee.io/)
- [Warband.io: agenda recorrente, disponibilidade e signup por Discord](https://www.warband.io/)

Implicacao: presenca historica nao substitui compromisso futuro. O Raven sabe
quem foi; precisa saber quem pretende ir, quem talvez va, quem esta ausente e
qual composicao ainda falta.

### 2. Liderar guilda vira trabalho nao remunerado

Relatos descrevem gestao como segundo emprego: recrutar, cobrar, organizar,
mediar drama e manter atividade. A literatura tambem trata a lideranca de guilda
como trabalho real e aponta que lideranca continua e estruturalmente importante
para a sobrevivencia da comunidade.

Evidencias:

- [Discussao: lideranca como segundo emprego](https://www.reddit.com/r/MMORPG/comments/125tfjb/how_to_keep_people_from_leaving_your_guild/)
- [The Full-Time Guild Master](https://ojs.stanford.edu/ojs/index.php/intersect/article/view/1)
- [Death of a Guild, Birth of a Network](https://journals.sagepub.com/doi/10.1177/1555412014537401)

Implicacao: o produto deve reduzir cobranca manual e dependencia de individuos,
nao apenas dar mais dados para o mesmo lider processar.

### 3. Loot sem politica visivel vira crise de confianca

Em Throne and Liberty, a dor mais intensa nao e apenas qual formula ganhou. Sao
politicas pouco visiveis, alteraveis a qualquer momento, concentracao de poder,
suspeita de bait-and-switch e itens valiosos saindo da guilda logo apos a
distribuicao. As guildas respondem com criterios de presenca, reputacao, classe,
limites por ciclo e distribuicao compartilhada.

Evidencias:

- [Discussao sobre poder e falta de transparencia no loot](https://www.reddit.com/r/throneandliberty/comments/1fzoxtx/guilds_have_far_too_much_power_over_loot/)
- [Lideres comparando politicas de distribuicao](https://www.reddit.com/r/throneandliberty/comments/1gl23bn/guild_leader_curious_about_your_guilds_loot/)

Implicacao: o Raven ja protege leiloes e audita decisoes, mas deve tornar a
politica vigente e suas mudancas legiveis, datadas e reconhecidas sem quebrar o
sigilo de bids, locks, ranking ou participantes.

### 4. Site, Discord, voz e jogo fragmentam a comunidade

Players reclamam tanto de guildas que so existem no Discord/voz quanto de
guildas grandes que parecem ativas, mas deixam perguntas sem resposta e formam
panelas invisiveis. O problema nao se resolve obrigando voz; resolve-se mantendo
um estado canonico acessivel e caminhos assincronos para participar.

Evidencias:

- [Discussao sobre guildas ativas apenas em Discord/voz](https://www.reddit.com/r/MMORPG/comments/15t2gbd/i_am_tired_of_guilds_only_being_active_in_discord/)
- [Discussao sobre guilda numerosa, silenciosa e fragmentada](https://www.reddit.com/r/MMORPG/comments/1t0q24q/is_this_pretty_normal_for_mmo_guilds/)

Implicacao: Discord deve ser uma interface do mesmo fluxo, nao outra planilha.
O site permanece fonte de verdade; acoes rapidas podem ser espelhadas.

### 5. Novatos procuram guilda para acessar conteudo e aprender

No proprio Raven2, um player busca guilda ativa para boss hunting e recebe como
conselho entrar em uma guilda forte para aprender mais. Outro relato recente
explica que bosses relevantes sao dominados por guildas e que atividades de uma
guilda maior consomem tempo, reforcando que acesso, orientacao e expectativas
precisam estar claros antes e depois da entrada.

Evidencias:

- [Raven2: procura por guilda ativa para boss hunting](https://www.reddit.com/r/Raven2/comments/1p43mi2/guild_query/)
- [Raven2: novo player, bosses e peso da guilda](https://www.reddit.com/r/Raven2/comments/1u6b3hb/new_player/)

Implicacao: converter uma candidatura em `Player` nao conclui recrutamento. O
resultado desejado e o membro entender regras, encontrar pessoas, entrar numa
atividade e evoluir sem depender de conhecer a pessoa certa.

### 6. O jogo esta exigindo mais coordenacao tática

A Netmarble descreve Clash como GvG em torneio com 16 guildas, partidas com
tempo, objetivo por pontuacao ou Guardian Stone e enfase em coordenacao tatica.
O War Room atual cobre a operacao, mas o proximo ganho esta na preparacao
recorrente, disponibilidade, memoria de estrategias e aprendizagem entre
partidas.

Evidencia:

- [Anuncio oficial do Clash no Raven2](https://ch.netmarble.com/Eng/Newsroom/Detail?bbs_code=1020&post_seq=6670&post_tag=RAVEN2)

## Mapa de lacunas do Raven2

| Jornada | Estado atual | Lacuna real | Prioridade |
| --- | --- | --- | --- |
| Agenda e presenca | Evento, lote, checklist, presenca real | RSVP, talvez, reserva, ausencia, recorrencia e previsao | P0 |
| Regras e loot | BusinessRule, audit, simulacao, contestacao | versao, vigencia, diff, aceite e recibo publico seguro | P0 |
| Recrutamento | candidatura, review, conversao | trial, onboarding, mentor, marcos e fit de horario | P0 |
| Saude da guilda | relatorio operacional e risk flags | pertencimento, carga Staff, integracao, saida/retorno | P1 |
| Operacao Staff | briefing, meeting, tasks calculadas | dono, substituto, rotacao, SLA e handoff | P1 |
| Conhecimento | forum, checklist e after-action | playbook versionado ligado ao proximo evento | P1 |
| Comunicacao | webhooks, forum, inbox Web | preferencias, quiet hours, digest e acoes espelhadas | P1 |
| Economia coletiva | DKP, drops, requests, diamantes | campanhas, contribuicoes e tesouraria auditada | P2 |
| Aliancas | nao ha dominio dedicado | diplomacia e compromissos multi-guilda | Futuro |
| Dados do jogo | prints e dados declarados | importacao/API/OCR confirmada | Futuro |

## Criterio de priorizacao

Pontuacao de 1 a 5 para:

- frequencia da dor nas evidencias;
- valor operacional para G3X;
- reaproveitamento do dominio atual;
- reducao de trabalho manual;
- risco de privacidade/regra sensivel, invertido;
- esforco estimado, invertido.

| Frente | Frequencia | Valor | Encaixe | Menos trabalho | Seguranca | Esforco | Total / 30 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Compromissos, RSVP e ausencias | 5 | 5 | 5 | 5 | 5 | 4 | 29 |
| Governanca versionada | 5 | 5 | 5 | 4 | 4 | 4 | 27 |
| Onboarding e mentoria | 4 | 5 | 4 | 4 | 5 | 4 | 26 |
| Continuidade da Staff | 5 | 5 | 4 | 5 | 4 | 3 | 26 |
| Playbooks e aprendizagem | 4 | 4 | 5 | 4 | 5 | 4 | 26 |
| Comunicacao adaptativa | 4 | 4 | 5 | 5 | 4 | 3 | 25 |
| Saude social agregada | 4 | 5 | 3 | 3 | 2 | 3 | 20 |
| Tesouraria e campanhas | 3 | 4 | 3 | 3 | 3 | 2 | 18 |

As notas sao hipoteses de produto, nao estimativas de sprint. Devem ser
reavaliadas com a Staff e amostra de players antes de implementar.

## Frente 0 - Baseline e validacao com a G3X

Objetivo: evitar construir uma solucao correta para a guilda errada.

Estado em 2026-07-21: `parcial`; pesquisa, material e fluxo Staff de coleta
estao em producao. O plano de campo organiza roteiro, cobertura pendente e as
quatro semanas oficiais de 27/07 a 24/08. Entrevistas e baseline G3X continuam
pendentes porque exigem evidencia real, nao preenchimento ficticio.

Instrumentacao disponivel em producao:

- `/dashboard/staff/roadmap` mostra todas as frentes, estado e links de evidencia;
- `GET /product-validation` mostra o gate Staff-only da campanha `G3X-2026-07`;
- `POST /product-validation/interviews` registra perfil, canais, politica de
  visibilidade de ausencia, impacto esperado do RSVP e sintese anonimizada;
- o registro nao pede identidade do entrevistado nem conteudo privado de voz/DM;
- `POST /product-validation/weeks` congela uma semana encerrada e calcula pelo
  ERP eventos criados, presenca real, no-shows, recruits com primeira atividade
  e tarefas com dono unico; presenca esperada e minutos de cobranca sao
  declarados explicitamente pela Staff;
- semanas sao imutaveis por campanha/data e as duas escritas possuem auditoria;
- o gate so fica pronto para decisao Staff com os tres perfis Staff, ao menos
  cinco entrevistas de player cobrindo os quatro perfis, quatro semanas
  consecutivas iniciadas na segunda-feira no fuso `America/Sao_Paulo` e confirmacao
  de que RSVP reduz alguma cobranca manual real.

Entregas de descoberta:

- entrevistar pelo menos 3 perfis Staff: lideranca, operacao de evento e loot;
- entrevistar 5-8 players misturando veterano, novato, ativo e baixa atividade;
- medir manualmente quatro semanas de:
  - eventos criados;
  - presenca esperada vs real, quando conhecida;
  - no-shows;
  - tempo de Staff gasto cobrando confirmacao;
  - recruits convertidos que participaram de uma atividade;
  - tarefas que dependeram de uma unica pessoa;
- perguntar quais canais cada perfil realmente acompanha;
- validar quais motivos de ausencia podem ser visiveis, privados ou anonimos;
- registrar baseline sem coletar conteudo privado de voz/DM.

Gate:

- nenhuma automacao de risco social antes de definir politica de privacidade e
  uso com a G3X;
- se RSVP nao reduzir uma cobranca manual real, rebaixar a frente antes de
  programar.

## Frente 1 - Central de Compromissos, RSVP e Ausencias

Objetivo: responder antes do evento: quem vai, quem talvez va, quem nao pode,
quem esta de reserva e qual papel ainda falta.

Estado em 2026-07-21: `implementado` no codigo local; Fatias 1.1 a 1.4
concluidas, ainda nao publicadas em producao.

### Fatia 1.1 - RSVP generico de evento

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Player responde `CONFIRMED`, `TENTATIVE` ou `DECLINED`.
- Resposta possui nota opcional e horario da ultima mudanca.
- Motivo pode ser player-publico ou Staff-only; default privado.
- Staff ve composicao confirmada por classe/role/camada.
- RSVP nao marca presenca e nao concede DKP.
- Presenca real continua sendo confirmada por boss, de forma independente.

### Fatia 1.2 - Periodos de ausencia

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Player registra inicio/fim e motivo opcional.
- Eventos no intervalo aparecem como indisponiveis sem exigir resposta repetida.
- Player pode ocultar o motivo e expor apenas `indisponivel`.
- Staff recebe impacto agregado em eventos, sem notificacao invasiva.

### Fatia 1.3 - Recorrencia, reserva e composicao

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Serie recorrente gera instancias de evento, respeitando excecoes/pausas.
- Staff define alvos de roles/classes, nao selecao automatica de pessoas.
- Reserva possui ordem/motivo auditavel Staff-only.
- Promocao de reserva pede confirmacao e preserva historico.
- Conflitos de horario usam timezone do player.

### Fatia 1.4 - Lembretes e no-show explicavel

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Lembretes somente para quem ainda nao respondeu ou confirmou.
- Player escolhe Web, Discord quando configurado, ambos ou nenhum canal nao
  critico.
- No-show compara confirmado vs presenca real e permite justificativa posterior.
- Nenhuma ausencia isolada gera punicao ou risk flag automatica.

KPIs:

- taxa de resposta ate 24h antes;
- diferenca entre confirmados e presentes;
- tempo mediano para fechar composicao;
- numero de pings manuais por evento;
- percentual de eventos com role critica descoberta antes do inicio.

Impacto de tutorial futuro: `ambos`.

## Frente 2 - Governanca versionada e confianca

Objetivo: permitir que qualquer membro prove qual regra estava vigente, quando
mudou e que informacao recebeu, sem abrir dados sigilosos de leilao.

Estado em 2026-07-21: `implementado` no codigo local; Fatias 2.1, 2.2 e 2.3
concluidas, ainda nao publicadas em producao.

### Fatia 2.1 - Versoes publicadas de politica

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Snapshot imutavel de regras publicaveis.
- Titulo, resumo PT-BR/EN, data de vigencia e autor Staff.
- Diff entre versoes em linguagem simples.
- Rascunho Staff separado da versao vigente.
- Alterar `BusinessRule` sensivel nao altera silenciosamente a politica publicada.

### Fatia 2.2 - Recibo de ciencia

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Player ve mudancas relevantes no action plan/inbox.
- Acao `Li e entendi` grava apenas recibo, nao concordancia juridica ampla.
- Staff ve cobertura agregada e quem ainda nao abriu quando operacionalmente
  necessario.
- Mudanca emergencial exige motivo e selo de emergencia.
- A publicacao cria recibos para players ativos e notificacao bilingue
  idempotente; falha isolada de notificacao e contabilizada na auditoria sem
  desfazer a versao ja publicada.

### Fatia 2.3 - Casos e recursos privados

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Caixa privada para duvida, denuncia operacional e recurso.
- Categoria, severidade, dono Staff, prazo, historico e resolucao.
- Visibilidade minima por papel; nota interna separada da resposta ao player.
- Integrar contestacao de leilao existente sem duplicar o dominio.
- Proibir decisao disciplinar automatica baseada em volume de casos.
- Contestacoes de leilao continuam no dominio `AuctionDispute` e aparecem na
  central Staff como fluxo nativo referenciado, sem copia de status ou decisao.

KPIs:

- perguntas repetidas sobre regra;
- tempo para resolver contestacao/caso;
- cobertura de ciencia antes da vigencia;
- mudancas emergenciais por periodo;
- casos reabertos por falta de explicacao.

Impacto de tutorial futuro: `ambos`.

## Frente 3 - Onboarding, trial e mentoria

Objetivo: transformar candidato convertido em membro integrado e participante.

Estado em 2026-07-21: `implementado` no codigo local; Fatias 3.1/3.2/3.3 ainda
nao foram publicadas em producao.

### Fatia 3.1 - Plano de onboarding

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Template Staff com etapas obrigatorias e opcionais.
- Regras, perfil, timezone, build, wishlist, presenca, primeiro evento e canais.
- Prazo e proximo passo PT-BR/EN no dashboard do player.
- Conversao de recrutamento instancia o plano; nao cria apenas nota Staff.
- Templates novos nao reescrevem planos existentes: cada conversao recebe um
  snapshot das etapas, obrigatoriedade, textos, links e tipos de verificacao.

### Fatia 3.2 - Trial com criterio visivel

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Inicio/fim previstos, objetivo e criterios publicados antes da avaliacao.
- Check-ins 7/14/30 dias com registro factual.
- Pausa de trial em ausencia declarada.
- Aprovacao, extensao ou encerramento exigem motivo e auditoria.
- Loot e sigilo continuam seguindo as mesmas regras permanentes.
- A resposta player-facing omite nota interna e motivo Staff-only da ausencia;
  nao existe score, aprovacao automatica ou alteracao de elegibilidade de loot.

### Fatia 3.3 - Mentoria e primeira atividade

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Staff associa mentor voluntario ou grupo de acolhimento.
- Novato pede ajuda por conteudo/role sem expor DM.
- Primeiro boss, evento, request, interesse e War Room viram marcos, nao pontos.
- Mentor nao recebe poder disciplinar nem acesso automatico a notas Staff.
- Voluntariado exige consentimento/disponibilidade persistidos; pedidos de ajuda
  usam topico e role no ERP, e os marcos guardam data real sem pontos.

KPIs:

- tempo ate primeira atividade;
- conversao que conclui onboarding;
- retencao em 30/60 dias;
- etapas que mais travam;
- percentual de recruits com horario compativel com eventos reais.

Impacto de tutorial futuro: `ambos`.

## Frente 4 - Saude da guilda com seguranca social

Objetivo: detectar friccao cedo sem criar vigilancia, ranking de lealdade ou
algoritmo que puna quem possui vida fora do jogo.

Estado em 2026-07-21: `implementado` no codigo local; politica de dados e Fatias
4.1/4.2/4.3 ainda nao foram publicadas em producao.

### Fatia 4.1 - Pulso voluntario

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao. A politica vinculante esta em `docs/GUILD_PULSE_DATA_POLICY.md`.

- Pesquisa curta e opcional: pertencimento, clareza, carga, diversao e seguranca
  para pedir ajuda.
- Respostas individuais anonimas por padrao; Staff recebe agregado apenas com
  grupo minimo.
- Campo aberto opcional segue moderacao e retencao curta.
- Player pode pular sem qualquer consequencia.

### Fatia 4.2 - Sinais operacionais explicaveis

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Queda de participacao, onboarding parado, muitas confirmacoes canceladas,
  retorno de inativo e subgrupo isolado entram como sinais para conversa.
- Cada sinal mostra fatos e janela usada.
- Nenhum score unico de churn/lealdade.
- Nenhuma remocao, perda de loot ou bloqueio automatico.
- Queda compara duas janelas de 15 dias com amostra minima; reversao de
  confirmacao usa historico auditado; coorte isolada agrega por classe e nao
  presume desengajamento individual.

### Fatia 4.3 - Saude da lideranca

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Staff registra carga percebida por area e disponibilidade para plantao.
- Painel mostra concentracao de tarefas e dominios sem substituto.
- Alertas recomendam delegar/pausar, nao cobrar mais atividade.
- Concentracao usa a trilha auditada dos ultimos 14 dias; cobertura e carga usam
  o check-in mais recente por Staff/area, sem alterar permissoes ou escalar.

KPIs:

- participacao voluntaria no pulso;
- areas sem backup;
- onboarding parado;
- saidas com motivo conhecido por categoria ampla;
- reducao de tarefas concentradas na mesma pessoa.

Impacto de tutorial futuro: `ambos`, com explicacao explicita de privacidade.

## Frente 5 - Continuidade e delegacao da Staff

Objetivo: permitir que a guilda continue operando quando um lider estiver
ausente e reduzir trabalho invisivel.

Estado em 2026-07-21: `implementado` no codigo local; Fatias 5.1, 5.2 e 5.3
ainda nao foram publicadas em producao.

### Fatia 5.1 - Fila Staff atribuivel

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Tarefa persistida com area, prioridade, dono, substituto, prazo e estado.
- Converter sinais atuais do briefing/meeting em tarefa somente por confirmacao
  Staff, evitando duplicacao automatica.
- Links profundos para o objeto operacional.
- Handoff registra contexto final e proximo passo.
- Briefing, pauta e sinais aparecem como sugestoes sem persistencia; `StaffTask`
  so nasce pelo POST confirmado e `sourceKey` impede duplicacao.

### Fatia 5.2 - Areas, rotacoes e cobertura

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Areas como eventos, loot, recrutamento, Discord, deploy e tesouraria.
- Responsavel primario, backup e janela de plantao.
- Escalonamento por indisponibilidade declarada, nao por silencio presumido.
- Permissao continua separada de responsabilidade.
- `StaffAreaCoverage` guarda primario, backup, janela e timezone por area;
  `StaffAvailabilityPeriod` registra a declaracao do proprio membro.
- O responsavel efetivo troca para o backup somente durante uma declaracao
  vigente. A operacao nao concede role, permissao ou acesso adicional.

### Fatia 5.3 - Automacao segura

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

- Sugestao de tarefa repetitiva baseada em padrao observado.
- Dry-run e confirmacao antes de ativar.
- Limite de frequencia, idempotencia, audit log e kill switch.
- Nenhuma automacao aprova loot, expulsa player ou altera politica social.
- Apenas padroes com ao menos tres tarefas concluidas nos ultimos 90 dias
  aparecem como proposta. O dry-run persiste desligado e exige confirmacao
  separada para ativar.
- A unica acao executavel e criar tarefa Staff sem dono. Cada janela possui
  chave idempotente, limite diario, frequencia minima e kill switch auditado.

KPIs:

- tarefas sem dono;
- tarefas vencidas;
- areas sem backup;
- tempo de handoff;
- horas/pings manuais relatados pela Staff.

Impacto de tutorial futuro: `Staff`.

## Frente 6 - Playbooks de boss, Clash e aprendizagem

Objetivo: fechar o ciclo planejar, executar, aprender e reutilizar.

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

### Fatia 6.1 - Playbook versionado

Estado em 2026-07-21: `implementado` no codigo local.

- Playbook por conteudo, boss, mapa ou operacao.
- Objetivo, composicao alvo, papeis, posicionamento textual, chamadas, riscos,
  links e checklist.
- Bloco publico PT-BR/EN e notas Staff separadas.
- Versao usada fica anexada ao evento/War Room para preservar contexto.

### Fatia 6.2 - Licoes do after-action

Estado em 2026-07-21: `implementado` no codigo local.

- After-action sugere licoes candidatas; Staff decide quais viram playbook.
- Cada alteracao informa origem e operacao.
- Licao pode ser `manter`, `testar` ou `descartar`.
- Evitar campo livre infinito sem dono e data de revisao.

### Fatia 6.3 - Preparacao por papel

Estado em 2026-07-21: `implementado` no codigo local.

- Player escalado recebe somente o trecho relevante ao proprio papel.
- Confirmacao separa `vou` de `li minha funcao`.
- Staff ve lacunas de leitura sem expor notas internas.
- `GuildPlaybookVersion` e imutavel e a atribuicao guarda a versao exata usada
  pelo evento ou War Room.
- Sinais do after-action aparecem como candidatos; a decisao `KEEP`, `TEST` ou
  `DISCARD` exige dono e data de revisao. Promocao cria nova versao com origem.
- Player escalado recebe somente brief publico PT-BR/EN e instrucao do proprio
  papel. O recibo de leitura e separado de RSVP/confirmacao de presenca.

KPIs:

- operacoes com playbook vigente;
- confirmacoes de instrucao antes do inicio;
- licoes promovidas e reutilizadas;
- repeticao de falhas ja documentadas.

Impacto de tutorial futuro: `ambos`.

## Frente 7 - Comunicacao adaptativa e estado canonico

Objetivo: reduzir ruido e perda de informacao sem obrigar todos a usar o mesmo
canal da mesma forma.

Estado em 2026-07-21: `implementado` no codigo local, ainda nao publicado em
producao.

### Fatia 7.1 - Preferencias e quiet hours

Estado em 2026-07-21: `implementado` no codigo local.

- Preferencia por categoria: eventos, loot proprio, requests, progresso,
  comunicados e lembretes.
- Canal Web/Discord quando disponivel.
- Quiet hours por timezone, exceto alerta critico explicitamente classificado.
- Default conservador e pagina de teste de notificacao.

### Fatia 7.2 - Digest pessoal

Estado em 2026-07-21: `implementado` no codigo local.

- Resumo diario/semanal do que exige acao.
- Agrupar alteracoes repetidas do mesmo objeto.
- Link direto e prazo.
- Zero informacao sigilosa de terceiros.

### Fatia 7.3 - Acoes espelhadas no Discord

Estado em 2026-07-21: `implementado` no codigo local.

- RSVP, ausencia, confirmacao de instrucao e leitura de regra podem usar bot,
  quando configurado.
- O bot chama os mesmos contratos e permissoes da Web.
- Site continua funcional sem Discord e permanece fonte de verdade.
- Resposta confirma o estado salvo e oferece link de revisao.
- `/dashboard/communications` define canal por categoria, timezone, quiet hours,
  cadencia e teste. Defaults usam Web e o alerta critico precisa ser explicito.
- Digest agrupa notificacoes do proprio user/player por tipo+link canonico,
  preserva prazo quando existe e nunca consulta dados de terceiros.
- `/erp-rsvp`, `/erp-ausencia`, `/erp-instrucao` e `/erp-regra` resolvem o
  usuario pelo Discord e chamam os mesmos servicos de dominio da Web.

KPIs:

- notificacoes ignoradas;
- pings manuais;
- taxa de acao por digest;
- divergencias site/Discord;
- opt-out por categoria.

Impacto de tutorial futuro: `ambos`.

## Frente 8 - Tesouraria e campanhas de recursos

Objetivo: cobrir recursos coletivos que hoje ficam em planilha ou conversa,
sem misturar DKP, venda por diamantes e dinheiro real.

Estado em 2026-07-20: `futuro ate existir caso real documentado`.

Entregas candidatas:

- campanha com objetivo, unidade, prazo e finalidade;
- contribuicao manual com comprovante e aprovacao;
- saldo por campanha, nao carteira universal ficticia;
- distribuicao com dois revisores para ativos de alto valor;
- recibo player apenas da propria contribuicao/parte;
- trilha imutavel e exportacao Staff;
- integracao opcional com diamond-sales sem fundir os dominios.

Nao fazer:

- inventar saldo a partir de chat;
- guardar credenciais de conta ou moeda real;
- usar contribuicao como score de lealdade;
- prometer reconciliacao automatica sem API oficial.

Impacto de tutorial futuro: `ambos`.

## Frente 9 - Confiabilidade tecnica para sustentar produto

Objetivo: aumentar seguranca antes de expandir superficies sociais e financeiras.

Estado em 2026-07-21: `implementado` no codigo local; smoke autenticado persiste artefato sanitizado
com duracao por 30 dias e cobre as novas jornadas. Runbook de webhook e politica
de retencao foram documentados. Todos os controllers com mutacao por body usam
validacao local forte e testes de contrato; autoria de item/leilao/DKP e sync do
Discord agora vem exclusivamente da sessao autenticada. A telemetria Staff
agrega recrutamento, onboarding, compromissos, trabalho Staff e tempos de loot
em `GET /operations/staff/product-telemetry`, sem identidade ou texto privado,
e entrou no smoke autenticado. O workflow sobe PostgreSQL 16 descartavel,
aplica as 70 migrations e executa `npm run test:e2e` pelo contrato HTTP real do
Nest. A prova cobre evento -> presenca -> DKP; leilao -> lock -> tres votos Staff
-> entrega -> recibo privado; request e interesse -> decisao -> entrega; e
recrutamento -> conversao -> plano de onboarding. O teste recusa banco que nao
seja explicitamente isolado como `raven2_e2e`.

Entregas recomendadas:

- concluir validacao local forte, com testes de contrato, nos modulos sensiveis
  que ainda nao possuem a mesma cobertura dos mais novos;
- priorizar `auctions`, `dkp`, `drops`, `items`, `item-interests`, `eligibility`,
  `operations`, `discord`, `auth` e rotas legadas de `players` por risco;
- testes e2e dos fluxos criticos completos:
  - evento -> presenca -> DKP;
  - leilao -> lock -> review -> entrega -> resultado;
  - request/interesse -> decisao -> entrega;
  - recrutamento -> conversao -> onboarding;
- persistir resultado/duracao do smoke autenticado de forma sanitizada;
- runbook especifico de incidente de webhook;
- telemetria de produto agregada para medir funil e tempo operacional, sem
  gravar conteudo privado, tokens ou URLs de webhook;
- politica de retencao/exclusao para ausencias, feedback e casos privados antes
  de criar essas entidades.

Impacto de tutorial futuro: `sem impacto` quando puramente interno; reavaliar se
alterar fluxo visivel.

Impacto desta rodada tecnica: `sem impacto de tutorial`; contratos invalidos
passam a falhar antes do dominio, sem mudar jornadas ou telas validas.

## Ordem recomendada de entrega

1. Frente 0: baseline e entrevistas G3X.
2. Fatia 1.1: RSVP generico de evento.
3. Fatia 1.2: periodos de ausencia.
4. Fatia 1.3: recorrencia, reserva e composicao.
5. Fatia 7.1: preferencias e quiet hours.
6. Fatia 2.1: politica versionada.
7. Fatia 2.2: recibo de ciencia.
8. Fatia 3.1: plano de onboarding.
9. Fatia 3.3: mentoria e primeira atividade.
10. Fatia 5.1: fila Staff atribuivel.
11. Fatia 5.2: areas, rotacoes e cobertura.
12. Fatias 6.1-6.2: playbook e licoes do after-action.
13. Fatia 7.2-7.3: digest e acoes Discord espelhadas.
14. Frente 4: saude social, somente apos politica e baseline.
15. Frente 8: tesouraria, somente apos caso real validado.

Racional:

- compromisso futuro resolve uma dor frequente com baixo risco de regra;
- governanca entra antes de ampliar economia coletiva;
- onboarding usa compromissos, regras e comunicacao ja estruturados;
- delegacao evita que as novas features aumentem a carga da Staff;
- saude social exige maturidade de privacidade e dados antes de automatizacao.

## Primeira fatia recomendada

### RSVP generico de evento

Escopo minimo:

- `EventCommitment` separado de `EventAttendance`;
- status `CONFIRMED`, `TENTATIVE`, `DECLINED`;
- nota opcional com visibilidade controlada;
- endpoint player para consultar/responder ao proprio compromisso;
- endpoint Staff com composicao agregada e lista operacional;
- card no dashboard/action plan para evento sem resposta;
- painel no evento Staff com confirmados, talvez, recusados e sem resposta;
- lembrete Web, sem Discord na primeira fatia;
- testes de permissao, privacidade, timezone e independencia da presenca/DKP.

Fora da primeira fatia:

- recorrencia;
- ausencia por intervalo;
- reserva automatica;
- integracao Discord;
- score de confiabilidade/no-show;
- mudanca em regra de DKP ou elegibilidade.

Definicao de pronto:

- responder RSVP nunca marca presenca nem gera DKP;
- player so ve a propria resposta e agregado seguro quando aplicavel;
- Staff ve dados operacionais completos;
- motivo privado nao aparece em payload player-facing;
- cada boss continua independente, inclusive em lote;
- tutorial player PT-BR/EN e tutorial Staff PT-BR atualizados no trabalho de
  implementacao;
- Prisma validate/generate, lint, testes e builds passam.

## Hipoteses que nao devem virar feature ainda

- **Score de lealdade:** alto risco de punir ferias, trabalho, saude ou vida
  familiar; usar fatos explicaveis e conversa humana.
- **IA decidindo loot:** viola a governanca humana e pode amplificar vieses dos
  dados historicos.
- **Chat/voz monitorado:** invasivo e desnecessario para os objetivos.
- **App nativo:** nao ha evidencia de que resolva mais que PWA/Web responsiva e
  acoes Discord espelhadas.
- **Multi-tenant compartilhado:** contradiz a direcao single-tenant atual.
- **Aliancas completas:** aguardar operacao concreta e regras estaveis do jogo.
- **Gamificacao de tudo:** badges por presenca/contribuicao podem transformar
  pertencimento em cobranca e piorar burnout.

## Perguntas abertas para a G3X

1. Quais eventos precisam de RSVP e quais continuam apenas com chamada ao vivo?
2. Quantas horas antes a composicao precisa estar razoavelmente fechada?
3. Motivo de ausencia deve ser privado para qual papel da Staff?
4. Existe reserva/bench hoje? Como a escolha e explicada?
5. Qual trabalho semanal mais depende de uma unica pessoa?
6. Quais regras mudam com frequencia suficiente para exigir versionamento?
7. O que caracteriza onboarding concluido na pratica?
8. Players preferem lembrete no site, Discord, ambos ou digest?
9. Quais dados sociais a guilda considera aceitavel medir — e quais nao?
10. Existe tesouraria coletiva fora de DKP/diamantes que hoje vive em planilha?

## Validacao minima quando uma fatia for autorizada

Schema/banco:

```powershell
npx.cmd prisma validate --schema packages/database/prisma/schema.prisma
npx.cmd prisma generate --schema packages/database/prisma/schema.prisma
```

Codigo:

```powershell
npm.cmd run lint
npm.cmd run build --workspace apps/api
npm.cmd run build --workspace apps/web
```

Tutoriais conforme audiencia:

```powershell
npm.cmd run discord:player-forum:assets
npm.cmd run discord:player-forum -- --dry-run
npm.cmd run discord:staff-forum:assets
npm.cmd run discord:staff-forum -- --dry-run
```

Regras adicionais:

- player-facing sempre PT-BR/EN;
- Staff-only somente PT-BR;
- nenhum ranking, bid, lock ou identidade de participante vaza antes do momento
  permitido;
- nenhuma entidade social nova sem politica de visibilidade e retencao;
- nenhuma automacao disciplinar ou de loot;
- `git diff --check` antes da entrega.

## Controle anti-reexecucao

Antes de programar qualquer fatia deste roadmap:

1. Ler `AGENTS.md`, `WIKI.md` e este documento.
2. Comparar checkout com `origin/master`.
3. Classificar a fatia como `implementado`, `parcial`, `pendente` ou `futuro`.
4. Conferir `git log --oneline --` nos arquivos e dominios citados.
5. Validar a hipotese com dados/entrevistas G3X quando indicado.
6. Escolher uma unica fatia pequena.
7. Atualizar este documento e `WIKI.md` com o estado final.
8. Atualizar as Centrais Discord se o fluxo visivel mudar.

Planejamento documental deste arquivo: `sem impacto de tutorial`. Nenhum fluxo
do site foi alterado e nenhuma sincronizacao Discord deve ocorrer nesta etapa.
