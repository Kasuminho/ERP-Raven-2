# Guia atual do Player - Raven2 G3X

Ultima revisao: 2026-07-20

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

- Voce nao marca propria presenca.
- A Staff abre evento, registra presentes e finaliza.
- Cada boss de lote tem presenca e DKP independentes.
- Ao finalizar, o DKP daquele boss e distribuido.

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

- You do not mark your own attendance.
- Staff opens the event, records present players, and finalizes it.
- Each boss in a batch has independent attendance and DKP.
- When finalized, that boss' DKP is distributed.

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
