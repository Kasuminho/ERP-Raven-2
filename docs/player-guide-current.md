# Guia atual do Player - Raven2 G3X

Ultima revisao: 2026-07-21

Este e o guia operacional atual dos players. Os guias datados antigos ficam como historico do produto e nao substituem este arquivo.

## PT-BR

### 1. Login e conta

- Acesse `https://app.guild-g3x.com.br`.
- Entre com Discord.
- Use a conta que esta no servidor da guild.
- A sessao fica no cookie seguro do navegador.
- Nunca envie cookie, token ou print de `.env` para ninguem.

### 2. Dashboard

Rota: `/dashboard`.

O dashboard mostra seu plano de acao:

- proximo passo;
- motivo;
- impacto;
- prioridade;
- link direto para a tela certa.

Ele pode apontar para Codex, progresso, requests, seus bids, interesses, leiloes disponiveis e eventos proximos.

O dashboard nao mostra ranking secreto, concorrentes, bids de outros players ou locks de terceiros.

### 2.1 Plano de onboarding

Em `/dashboard/onboarding`, recruits convertidos recebem um plano real com versao do template, prazo, progresso obrigatorio/total e proximo passo PT-BR/EN. Regras, perfil, timezone, build, wishlist e primeiro evento usam evidencias do ERP; as etapas de entendimento de presenca/DKP e escolha de canais sao confirmadas por voce depois de executar e ler o fluxo. Uma nova versao publicada pela Staff nao altera silenciosamente seu plano em andamento.

### 2.2 Trial transparente

Em `/dashboard/trial`, objetivo, periodo e criterios PT-BR/EN aparecem antes da avaliacao. Check-ins dos dias 7/14/30 registram fatos visiveis; notas internas continuam fora da sua resposta. Uma ausencia declarada pausa o trial e ajusta o fim exibido. Aprovar, estender ou encerrar exige decisao humana com motivo. Trial nao altera regras de loot nem gera punicao automatica.

### 2.3 Mentoria e primeiros marcos

Em `/dashboard/mentorship`, consulte mentor voluntario ou grupo de acolhimento, peca ajuda por conteudo/role sem depender de DM e acompanhe as datas do primeiro evento, boss, request, interesse e War Room. Sao marcos, nunca pontos. Voce tambem pode se voluntariar; mentor nao recebe poder disciplinar nem acesso a notas Staff.

### 2.4 Pulso voluntario e anonimo

Em `/dashboard/pulse`, voce pode responder cinco notas de 1 a 5 e um comentario opcional, ou pular sem consequencia. A resposta nao guarda sua identidade; o recibo de participacao fica separado. Staff so recebe medias/textos quando o grupo minimo e atingido, nunca scores individuais. Texto aberto passa por moderacao e expira no prazo exibido. Pulso nao afeta loot, DKP, acesso ou disciplina.

### 3. Timeline

Rota: `/dashboard/timeline`.

A timeline mostra seu historico narrado:

- drops;
- progresso;
- requests;
- Codex;
- eventos;
- leiloes relacionados a voce.

Filtros ajudam por tipo e periodo. Em leiloes, a timeline respeita sigilo: voce ve seu proprio bid/status, nao a guerra inteira no escuro.

### 4. Perfil e progresso

Rota: `/dashboard/profile`.

No perfil voce ajusta:

- nickname;
- classe;
- camada operacional;
- idioma da interface;
- timezone.

CP nao e editado diretamente como atalho. Para atualizar CP, publique progresso `STATUS` com print. A Staff aprova e o perfil e atualizado.

Categorias comuns de progresso:

- Stellas;
- equipamentos;
- reliquias;
- estigma;
- colecao;
- habilidade;
- Pedra do Paraiso;
- Status;
- Fenda Dimensional;
- runas.

Use prints claros. Print ruim vira retrabalho, e retrabalho e o boss invisivel da semana.

### 5. Leiloes

Rota: `/dashboard/auctions`.

Tipos:

- `STANDARD`: voce escolhe o valor do bid.
- `ALL_IN`: o sistema usa seu DKP disponivel inteiro.
- `Staff Review`: a Staff aprova conforme regras da guild.

Antes do bid, a pagina mostra sua elegibilidade:

- camada atual e exigida;
- DKP disponivel e exigido;
- attendance;
- modo do leilao;
- se a entrega passa por review Staff.

Sigilo:

- voce nao ve ranking;
- voce nao ve bids de outros players;
- voce nao ve locks de terceiros;
- se perder, DKP travado volta;
- se ganhar, DKP e consumido conforme regra do leilao.

### 6. Interesses de item

Rota: `/dashboard/interests`.

Quando a Staff abre um interesse, voce pode declarar:

- print solicitado;
- nota;
- pedido de transmutar quando disponivel.

A tela permite declarar interesse em lote. Cada post mantem sua nota, print ou transmutar proprio, e a confirmacao envia tudo pelo fluxo normal.

Transmutar:

- dispensa upload manual;
- usa a imagem publica padrao;
- quando todos os interessados do post pedem transmutar, o vencedor e sorteado entre elegiveis;
- um player so pode vencer um item de transmutar por dia operacional de Sao Paulo.

### 7. Requests de item

Rota: `/dashboard/item-requests`.

Use requests para entrar em fila de item requestavel.

Voce ve:

- posicao estimada;
- tamanho da fila;
- pedidos/unidades antes;
- idade do update;
- ultima entrega conhecida;
- sugestoes de alternativa com fila menor;
- aviso de prioridade de material quando existir.

Regra importante:

- materiais para craft T3 tem prioridade sobre Quintessencia do mesmo material inferido;
- pedido de Quintessencia continua valido, mas pode esperar se houver craft T3 travando progresso da guild.

Troca de item continua manual/controlada pela Staff. Sugestao nao troca nada sozinha.

### 8. Codex

Rota: `/dashboard/codex`.

Fluxo:

- envie print do Codex;
- aguarde Staff marcar como enviado;
- confirme se funcionou;
- se falhar, informe pelo fluxo;
- se der certo, o pedido sai da fila.

### 9. Drops

Rota: `/dashboard/drops`.

Voce ve entregas registradas relacionadas a voce. Drops vindos de leilao, interesse ou request entram no historico quando a Staff registra a entrega.

### 10. Presenca e eventos

Rota: `/dashboard/attendance`.

Presenca e controlada pela Staff.

- Antes do evento, responda RSVP como `vou participar`, `talvez` ou `nao vou`.
- A nota e privada para a Staff por padrao; marque-a como publica somente se quiser compartilhar com outros players.
- Voce pode mudar a resposta ate o inicio do evento.
- Se ficar indisponivel por um periodo, registre inicio, fim e motivo opcional na mesma tela. Eventos dentro da janela deixam de exigir resposta individual.
- O motivo da ausencia e privado para a Staff por padrao. Outros players veem somente o total indisponivel, salvo quando voce optar por compartilhar o motivo.
- Se a Staff colocar voce na reserva, a posicao aparece sem revelar o motivo interno. Quando uma vaga abrir, confirme ou recuse a oferta na propria tela.
- Aceitar uma promocao de reserva confirma o RSVP, mas ainda nao marca presenca nem concede DKP.
- Em Perfil, escolha se lembretes nao criticos de evento chegam pela Web, Discord, ambos ou nenhum. Nas 24h anteriores, o ERP lembra apenas quem ainda nao respondeu ou confirmou.
- Se voce confirmou e nao apareceu, a tela permite explicar depois. A justificativa fica com a Staff; uma falta isolada nao gera punicao ou risk flag automatica.
- Voce nao marca propria presenca.
- A Staff abre evento, registra presentes e finaliza.
- Cada boss de lote tem presenca e DKP independentes.
- Ao finalizar, o DKP daquele boss e distribuido.

RSVP serve para prever composicao. Ele nunca marca presenca nem concede DKP.

Em `/dashboard/playbook`, veja objetivo/brief publico PT-BR/EN e somente a instrucao do seu papel no evento ou War Room. **Li minha funcao** registra leitura separadamente de RSVP ou presenca. Notas internas e instrucoes de outros papeis nao aparecem.

### 10.1 Regras publicadas

Em `/dashboard/rules`, consulte a politica vigente, numero da versao, autoria, data de vigencia e o que mudou. O snapshot publicado nao muda quando a Staff ajusta uma regra operacional: uma nova politica exige outra versao. Proximas versoes aparecem separadas ate a data de vigencia.

Ao abrir uma versão publicada, o ERP registra a abertura. Use **Li e entendi** depois de ler; isso comprova somente ciência daquela informação, não concordância jurídica ampla. Enquanto faltar o recibo, a política aparece no seu plano de ação. Mudanças emergenciais recebem selo e mostram o motivo informado pela Staff.

### 10.2 Casos privados

Em `/dashboard/cases`, abra uma dúvida, denúncia operacional ou recurso sem expor o assunto em canal público. Somente você e a Staff autorizada veem a conversa. Escolha categoria e urgência, descreva fatos/datas e acompanhe as respostas. Se enviar novo contexto depois da resolução, o caso reabre. Contestação de resultado de leilão continua na página do próprio leilão para preservar as regras e o sigilo daquele domínio.

Em `/dashboard/communications`, escolha Web, Discord, ambos ou nenhum por categoria; configure timezone, quiet hours e digest diario/semanal. Alteracoes repetidas do mesmo objeto sao agrupadas, sempre com link direto e sem dados de terceiros. Use o teste de canal antes de confiar no silencio. Alertas criticos explicitamente classificados podem furar quiet hours.

Quando o bot estiver configurado, `/erp-rsvp`, `/erp-ausencia`, `/erp-instrucao` e `/erp-regra` salvam no mesmo estado canonico do site e devolvem a rota para revisao. O site continua funcionando sem Discord.

### 11. Notificacoes e idiomas

Webhooks para players usam PT-BR e EN em blocos separados.

A identidade oficial dos webhooks e:

`Aristolfo, 570 anos de webhook`

Staff-only fica em PT-BR. Posts normais atuais nao usam espanhol.

### 12. Central do Player no Discord

O forum `📚・central-do-player`, dentro da categoria `G3X`, reune os tutoriais oficiais do ERP em PT-BR e EN com imagens e links diretos.

- Use a tag do assunto para localizar o tutorial.
- Players podem responder nas threads para tirar duvidas.
- Inclua tela, acao tentada, horario aproximado e texto do erro.
- Casos pessoais de DKP, presenca, acesso, review ou comprovante devem ir para a Staff em canal privado.
- Nunca publique token, cookie, senha, QR de login, conteudo de `.env`, comprovante financeiro ou informacao sigilosa de leilao.

### 13. Dicas rapidas

- Confira DKP disponivel antes de bidar.
- Leia o painel de elegibilidade antes do bid.
- Mantenha STATUS recente.
- Poste prints legiveis.
- Atualize requests quando solicitado.
- Se algo parecer errado, chame a Staff com contexto e link da tela.

## EN

### 1. Login and account

- Open `https://app.guild-g3x.com.br`.
- Log in with Discord.
- Use the account that is in the guild server.
- Your session stays in the browser secure cookie.
- Never send cookies, tokens, or `.env` screenshots to anyone.

### 2. Dashboard

Route: `/dashboard`.

The dashboard shows your action plan:

- next step;
- reason;
- impact;
- priority;
- direct link to the right screen.

It can point to Codex, progress, requests, your own bids, interests, available auctions, and upcoming events.

It does not show secret ranking, competitors, other players' bids, or third-party DKP locks.

### 2.1 Onboarding plan

On `/dashboard/onboarding`, converted recruits receive a real plan with a template version, deadline, required/total progress, and a PT-BR/EN next step. Rules, profile, timezone, build, wishlist, and first-event milestones use ERP evidence; attendance/DKP understanding and channel selection are confirmed by you after completing and reading the flow. A new Staff template version never silently changes your active plan.

### 2.2 Transparent trial

On `/dashboard/trial`, the objective, period, and PT-BR/EN criteria are visible before evaluation. Day 7/14/30 check-ins record player-visible facts while internal notes stay private. A declared absence pauses the trial and adjusts the displayed end. Approval, extension, or closure requires a reasoned human decision. Trial never changes loot rules or applies automatic punishment.

### 2.3 Mentorship and first milestones

On `/dashboard/mentorship`, view a volunteer mentor or welcome group, ask for help by content/role without relying on a DM, and track the dates of your first event, boss, request, interest, and War Room. These are milestones, never points. You may also volunteer; mentors receive no disciplinary power or Staff notes.

### 2.4 Voluntary anonymous pulse

On `/dashboard/pulse`, you may answer five 1-to-5 questions plus an optional comment, or skip without consequences. The response stores no player identity; the participation receipt is separate. Staff only receives averages/text after the minimum group size, never individual scores. Open text is moderated and expires on the displayed schedule. Pulse never affects loot, DKP, access, or discipline.

### 3. Timeline

Route: `/dashboard/timeline`.

The timeline shows your narrated history:

- drops;
- progress;
- requests;
- Codex;
- events;
- auctions related to you.

Filters help by type and period. For auctions, secrecy is preserved: you see your own bid/status, not the full hidden fight.

### 4. Profile and progress

Route: `/dashboard/profile`.

In your profile you set:

- nickname;
- class;
- operational layer;
- interface language;
- timezone.

CP is not edited directly as a shortcut. To update CP, submit `STATUS` progress with a screenshot. Staff approves it and the profile is updated.

Common progress categories:

- Stellas;
- equipment;
- relics;
- stigma;
- collection;
- skill;
- Heaven Stone;
- Status;
- Dimensional Rift;
- runes.

Use clear screenshots. Bad proof creates rework, and rework is the weekly invisible boss.

### 5. Auctions

Route: `/dashboard/auctions`.

Types:

- `STANDARD`: you choose the bid value.
- `ALL_IN`: the system uses all your available DKP.
- `Staff Review`: Staff approves according to guild rules.

Before bidding, the page shows your eligibility:

- current and required layer;
- available and required DKP;
- attendance;
- auction mode;
- whether delivery requires Staff review.

Secrecy:

- you do not see ranking;
- you do not see other players' bids;
- you do not see third-party locks;
- if you lose, locked DKP is released;
- if you win, DKP is consumed according to auction rules.

### 6. Item interests

Route: `/dashboard/interests`.

When Staff opens an interest post, you can submit:

- requested screenshot;
- note;
- transmute request when available.

The page allows batch interest declaration. Each post keeps its own note, screenshot, or transmute option, and the single confirmation sends everything through the normal flow.

Transmute:

- does not require manual upload;
- uses the public default image;
- when all entries in a post are transmute requests, the winner is randomly selected among eligible players;
- one player can win only one transmute item per Sao Paulo operational day.

### 7. Item requests

Route: `/dashboard/item-requests`.

Use requests to enter a queue for requestable items.

You can see:

- estimated position;
- queue size;
- requests/units ahead;
- update age;
- last known delivery;
- alternative suggestions with shorter queues;
- material priority warning when it applies.

Important rule:

- T3 craft materials have priority over Quintessence using the same inferred material;
- a Quintessence request remains valid, but may wait if a T3 craft is blocking guild progression.

Item swapping remains manual and Staff-controlled. A suggestion does not change anything automatically.

### 8. Codex

Route: `/dashboard/codex`.

Flow:

- send a Codex screenshot;
- wait for Staff to mark it as sent;
- confirm whether it worked;
- if it failed, report it through the flow;
- if it worked, the request leaves the queue.

### 9. Drops

Route: `/dashboard/drops`.

You see registered deliveries related to you. Drops from auctions, interests, or requests enter history when Staff records the delivery.

### 10. Attendance and events

Route: `/dashboard/attendance`.

Attendance is controlled by Staff.

- Before the event, answer RSVP with `I will attend`, `maybe`, or `cannot attend`.
- Notes are private to Staff by default; make one public only when you want to share it with other players.
- You may change your answer until the event starts.
- If you will be unavailable for a period, register its start, end, and an optional reason on the same screen. Events in that window no longer require individual answers.
- Absence reasons are private to Staff by default. Other players see only the unavailable total unless you choose to share your reason.
- If Staff places you on reserve, your position is shown without exposing the internal reason. When a slot opens, accept or decline the offer on the same screen.
- Accepting a reserve promotion confirms RSVP, but still does not mark attendance or grant DKP.
- In Profile, choose whether non-critical event reminders arrive through Web, Discord, both, or neither. During the previous 24 hours, the ERP only reminds unanswered or confirmed players.
- If you confirmed and missed the event, the screen lets you explain afterward. The explanation stays with Staff; one missed event creates no automatic punishment or risk flag.
- You do not mark your own attendance.
- Staff opens the event, records present players, and finalizes it.
- Each boss in a batch has independent attendance and DKP.
- When finalized, that boss' DKP is distributed.

RSVP forecasts composition. It never marks attendance or grants DKP.

On `/dashboard/playbook`, view the public PT-BR/EN objective and brief plus only your role instruction for the event or War Room. **I read my role** records reading separately from RSVP or attendance. Internal notes and other roles never appear.

### 10.1 Published rules

On `/dashboard/rules`, review the current policy, version number, author, effective date, and the plain-language changes. A published snapshot does not change when Staff adjusts an operational rule: a new policy requires another version. Upcoming versions stay separate until their effective date.

Opening a published version records that it was opened. Use **I read and understood** after reading; this proves awareness of that information only, not broad legal agreement. Until you acknowledge it, the policy stays in your action plan. Emergency changes carry a badge and show Staff's reason.

### 10.2 Private cases

On `/dashboard/cases`, open a question, operational report, or appeal without exposing it in a public channel. Only you and authorized Staff can see the thread. Choose a category and urgency, describe facts/dates, and follow the replies. New context reopens a resolved case. Auction-result disputes remain on the auction page to preserve that domain's rules and secrecy.

On `/dashboard/communications`, choose Web, Discord, both, or none per category; configure timezone, quiet hours, and a daily/weekly digest. Repeated changes to the same object are grouped with a direct link and no third-party data. Test the channel before trusting the silence. Explicitly classified critical alerts may bypass quiet hours.

When the bot is configured, `/erp-rsvp`, `/erp-ausencia`, `/erp-instrucao`, and `/erp-regra` save to the same canonical website state and return a review route. The website remains functional without Discord.

### 11. Notifications and languages

Player-facing webhooks use PT-BR and EN in separate blocks.

Official webhook identity:

`Aristolfo, 570 anos de webhook`

Staff-only content stays PT-BR. Current normal posts do not use Spanish.

### 12. Player Hub on Discord

The `📚・central-do-player` forum inside the `G3X` category contains the official ERP tutorials in PT-BR and EN with images and direct links.

- Use topic tags to find the right tutorial.
- Players may reply in threads to ask questions.
- Include the screen, attempted action, approximate time, and error text.
- Personal DKP, attendance, access, review, or receipt cases must go to Staff privately.
- Never publish tokens, cookies, passwords, login QR codes, `.env` contents, financial receipts, or confidential auction information.

### 13. Quick tips

- Check available DKP before bidding.
- Read the eligibility panel before bidding.
- Keep STATUS recent.
- Post readable screenshots.
- Update requests when asked.
- If something looks wrong, contact Staff with context and the screen link.
