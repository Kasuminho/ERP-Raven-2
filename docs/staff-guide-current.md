# Guia atual da Staff - Raven2 G3X

Ultima revisao: 2026-07-21

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
- navegar por jornadas: `Resolver agora`, `Auditar`, `Configurar`, `Comunicar` e `Operar deploy`;
- usar contadores e proximas acoes de cada jornada para decidir onde clicar primeiro;
- acompanhar pendencias e auditoria recente.

## 3. Dia, reuniao e temporada

- `/dashboard/staff/day`: visao operacional do dia.
- `/dashboard/staff/meeting`: pauta decisoria com loot, travas, DKP, players sensiveis, bosses, comunicados, acoes ate a proxima call, copia Markdown e marcacao auditavel de resolvido.
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
- No evento selecionado, o painel RSVP mostra confirmados, talvez, recusas, sem resposta e composicao confirmada por classe, role e camada.
- Periodos de ausencia cobrem automaticamente os eventos do intervalo. O painel mostra o impacto agregado e os detalhes para a Staff, sem disparar cobranca invasiva.
- Series recorrentes materializam instancias semanais em horizonte configurado; pausa cancela instancias futuras da serie e retomada restaura apenas as que nao forem excecao. O cron diario amplia o horizonte.
- Cada evento pode ter alvos minimos por role/classe. O painel calcula cobertura e gap, mas nunca escolhe pessoas automaticamente.
- Reserva exige ordem e motivo Staff-only. Oferecer vaga muda para `PROMOTION_PENDING`; somente a resposta do player promove e confirma RSVP, preservando o registro e auditoria.
- Conflitos entre RSVPs confirmados aparecem no timezone cadastrado pelo player.
- Lembretes pre-evento rodam nas 24h anteriores e alcancam apenas sem resposta ou confirmados, respeitando o canal nao critico escolhido pelo player. Talvez, recusas, ausencias e reservas ainda nao promovidas ficam fora.
- Na finalizacao, confirmado sem presenca e sem ausencia registrada vira no-show explicavel. A Staff ve a justificativa no resumo; uma ocorrencia isolada nao pune, nao altera DKP/elegibilidade e nao cria risk flag automatica.

Regras atuais:

- cada boss possui evento, presenca e DKP independentes, mesmo quando criado em lote;
- `attendanceBatchId` liga os bosses de um lote;
- `batchOrder` define a ordem;
- finalizar um boss pode copiar presenca para o proximo evento ativo do lote;
- eventos cancelados sao pulados;
- presenca ja existente no proximo evento nunca e sobrescrita.
- RSVP e previsao: nao cria `EventAttendance`, nao concede DKP e continua independente por boss.
- Notas RSVP sao Staff-only por padrao; somente `PLAYER_PUBLIC` aparece para outros players.
- Motivos de ausencia sao Staff-only por padrao. Players veem apenas a contagem indisponivel; nome/motivo so aparecem quando o autor escolhe `PLAYER_PUBLIC`.

Antes de finalizar:

- confira o checklist em `GET /events/:id/finalization-checklist`;
- revise presentes, ausentes ativos, DKP por pessoa, total distribuido e proximo boss;
- use a prontidao do boss em `GET /events/:id/readiness` para ver camadas, classes, CP aprovado e STATUS recente.

STATUS ausente ou com mais de 21 dias entra como desatualizado. Roles operacionais: `VANGUARD` tank, `DIVINE_CASTER` healer, `DEATHBRINGER` suporte/off-heal, demais classes DPS.

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

Vendas por diamantes:

- em `/dashboard/admin/items`, habilite apenas os itens autorizados pela flag de venda por diamantes;
- `/dashboard/staff/diamond-sales` e Staff-only e abre a venda com comprador da guilda ou externo, custodiante, total inteiro, print do item e prova da venda;
- comprador da guilda precisa ser vinculado ao player e fica automaticamente fora da partilha;
- a abertura grava um snapshot dos players ativos naquele instante; alteracoes posteriores de membresia nao mudam os destinatarios;
- a Staff pode usar todos os ativos ou excluir players selecionados;
- o valor individual usa divisao inteira arredondada para baixo e a sobra fica registrada;
- cada destinatario exige prova individual de envio; o ultimo envio conclui a partilha e publica nomes e provas no canal de entregas em PT-BR/EN;
- se a publicacao falhar, a venda concluida exibe acao de republicacao.

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

- `/dashboard/staff/codex`: fila de ajuda Codex. Marcar envio dispara a cobrança direta e só é permitido para pedido pendente ou com retry solicitado; um Codex já enviado aguarda confirmação/quebra do player e não pode ser reenviado por duplo clique.
- `/dashboard/staff/daoshi`: recibos, cash e sorteio Daoshi.
- `/dashboard/staff/progress`: review de progresso.

Progress:

- `STATUS` aprovado atualiza CP/level operacional;
- Fenda Dimensional aprovada atualiza andar;
- categorias sem review ficam como historico visual;
- rejeite com nota objetiva quando o print nao prova o progresso.

## 12.1 Recrutamento e onboarding

Ao converter uma candidatura aceita em `/dashboard/staff/recruitment`, o ERP cria player, perfil inicial, nota Staff e um plano de onboarding na mesma transacao. O plano usa o template ativo e preserva um snapshot de textos, links, obrigatoriedade e tipo de verificacao.

Em `/dashboard/staff/onboarding`, revise prazo, planos em andamento/atrasados e publique novas versoes do template. Configure etapas obrigatorias ou opcionais em PT-BR/EN. A nova versao vale para conversoes futuras e nunca reescreve silenciosamente planos existentes. Prazo vencido organiza acompanhamento; nao gera punicao automatica.

Em `/dashboard/staff/trials`, publique periodo, objetivo e criterios PT-BR/EN antes de avaliar. Registre check-ins factuais D7/D14/D30 com resposta visivel bilingue e nota interna separada. Ausencias declaradas pausam o periodo e ajustam o fim. Aprovacao, extensao ou encerramento exigem motivo bilingue e geram auditoria; o fluxo nao cria score, pune automaticamente ou altera loot/sigilo.

Em `/dashboard/staff/mentorship`, associe apenas voluntarios disponiveis ou um grupo de acolhimento. Pedidos de ajuda entram por conteudo/role no ERP e podem ser encaminhados sem conversa perdida em DM. Primeiro evento, boss, request, interesse e War Room aparecem como datas, nao pontos. Mentor nao recebe poder disciplinar nem qualquer nota Staff.

Em `/dashboard/staff/pulse`, crie o ciclo em rascunho, configure grupo minimo e retencao, revise e publique. Abaixo do minimo, medias e textos ficam bloqueados. Acima dele, veja apenas medias e modere comentarios sem identidade. Scores individuais nao existem na API Staff. Skip e opcional e nunca entra como risco; cron diario apaga texto vencido. Consulte `docs/GUILD_PULSE_DATA_POLICY.md`.

Em `/dashboard/staff/guild-health`, sinais de queda de participacao, onboarding parado, confirmacoes revertidas, retorno de inativo e coorte de classe isolada mostram fatos, amostra e janela. Sao convites para conversa. Nao existe score unico, remocao, bloqueio, perda de loot ou outra acao automatica.

Em `/dashboard/staff/leadership-health`, cada Staff registra carga de 1 a 5 e disponibilidade de plantao por area. O painel usa o ultimo check-in em 14 dias, mostra areas com zero/um substituto e concentracao de acoes auditadas. Alertas recomendam delegar, reduzir escopo ou pausar; nunca mudam permissao, escalam sozinhos ou cobram mais atividade.

Em `/dashboard/staff/tasks`, tarefas persistem com area, prioridade, dono, substituto, prazo, status e link profundo. Briefing, pauta e sinais aparecem somente como sugestoes; clique em converter para confirmar e evitar tarefa automatica/duplicada. Handoff exige contexto final e proximo passo e pode transferir o dono com auditoria.

Em `/dashboard/staff/coverage`, configure responsavel primario, backup, janela de plantao e timezone por area. Cada membro declara e remove a propria indisponibilidade; somente uma declaracao vigente aciona o backup. Silencio nunca gera escalonamento. Responsabilidade operacional nao concede role, permissao nem acesso adicional.

Em `/dashboard/staff/automations`, somente padroes com tres tarefas concluidas em 90 dias aparecem como candidatos. Criar dry-run salva uma regra desligada; ativar exige confirmacao separada. A unica acao permitida e criar tarefa Staff sem dono, com frequencia, limite diario, idempotencia, auditoria e kill switch. A automacao nunca aprova loot, remove player ou altera politica social.

Em `/dashboard/staff/playbooks`, publique objetivo/brief PT-BR e EN, notas internas, checklist e instrucoes por papel. Cada versao e imutavel e a atribuicao ao evento ou War Room preserva o contexto usado. Sinais do after-action viram apenas candidatos; registrar uma licao exige `manter`, `testar` ou `descartar`, dono e data de revisao. Promover `manter/testar` cria nova versao com origem. A Staff acompanha recibos sem expor notas internas.

Em `/dashboard/communications`, cada membro controla canais por categoria, quiet hours/timezone, digest e teste. O cron entrega resumo diario/semanal fora do silencio, agrupado pelo objeto canonico. Os comandos Discord `/erp-rsvp`, `/erp-ausencia`, `/erp-instrucao` e `/erp-regra` resolvem a conta vinculada e chamam os mesmos servicos/permissoes da Web; a resposta confirma o estado e indica a rota de revisao. O site continua sendo a fonte de verdade.

Em `/dashboard/staff/roadmap`, a Staff ve todas as frentes do Guild Operating System, estado e links de evidencia de forma organizada. Na Frente 0, o gate mostra cobertura dos tres perfis Staff, minimo de cinco entrevistas cobrindo veterano/novato/ativo/baixa atividade, quatro semanas consecutivas e confirmacao de que RSVP reduz cobranca manual real. Registre entrevistas sem nome ou conteudo privado de voz/DM; informe perfil, canais acompanhados, visibilidade aceitavel para ausencia e uma sintese operacional. Ao congelar uma semana ja encerrada iniciada na segunda-feira, o ERP calcula eventos criados, presenca real, no-shows, recruits com atividade e tarefas sem substituto; a Staff declara apenas presenca esperada, quando conhecida, e minutos gastos cobrando confirmacao. Uma semana congelada nao pode ser regravada. O selo implementado descreve codigo local validado; producao e tutoriais live so mudam depois do protocolo completo.

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

`BusinessRule` e politica publicada nao sao a mesma coisa. Depois de ajustar e validar a operacao, crie um rascunho bilingue, confira titulo, resumo e vigencia, atualize o snapshot e publique somente apos revisao. A versao publicada fica imutavel, com autoria e diff; novos ajustes aparecem como drift e exigem outra versao para atualizar a referencia dos players.

Se a mudança for emergencial, marque o selo e registre um motivo objetivo antes de publicar. A publicação cria recibos e aviso bilíngue para os players ativos. A cobertura mostra quantos abriram, quantos marcaram **Li e entendi** e, quando necessário, quem ainda não abriu. O recibo é ciência operacional, não aceite jurídico amplo; use a lista para comunicação, nunca como punição automática.

Em `/dashboard/staff/cases`, trate dúvidas, denúncias operacionais e recursos privados. Defina severidade, responsável, prazo e status; escreva notas internas somente no campo Staff e respostas ao player em blocos PT-BR/EN. A central referencia contestações de leilão existentes, mas a revisão continua no fluxo do leilão. Nenhuma quantidade de casos, severidade ou atraso autoriza punição automática: decisão disciplinar continua humana e auditada.

## 15. Central da Staff no Discord

O forum `🛡️・central-da-staff`, dentro da categoria Discord `staff`, reune os tutoriais internos do ERP com imagens, tags e links diretos.

- Conteudo exclusivamente em PT-BR.
- `@everyone` fica explicitamente sem acesso.
- O cargo definido por `DISCORD_STAFF_ROLE_ID` pode visualizar, criar e responder.
- Dúvidas operacionais podem ser discutidas nas threads.
- Tokens, cookies, URLs completas de webhook, conteudo de `.env`, comprovantes financeiros e dados pessoais desnecessarios continuam proibidos.

## 16. Boas praticas

- Nao aprove winner inelegivel so porque "parece justo".
- Nao marque presenca sem validacao.
- Nao publique ranking/bids/locks em canal de player.
- Nao use print ruim para aprovar progresso.
- Nao use ajuste manual de DKP para corrigir fluxo que tem botao proprio.
- Consulte dossie, timeline, fairness e comparador antes de decisoes sensiveis.
- Depois de publicar mudanca em producao, valide comportamento real antes de avisar a Staff.

Aristolfo pode ser sarcastico. A Staff precisa ser precisa. Os dois juntos dao menos chamado.
