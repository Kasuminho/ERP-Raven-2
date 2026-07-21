const APP_URL = 'https://app.guild-g3x.com.br';

function route(path) {
  return `${APP_URL}${path}`;
}

const tags = [
  { key: 'start', name: 'Comece aqui', emoji: '🧭' },
  { key: 'account', name: 'Conta', emoji: '🔐' },
  { key: 'now', name: 'Agora', emoji: '⚡' },
  { key: 'loot', name: 'Loot', emoji: '💎' },
  { key: 'progress', name: 'Progresso', emoji: '📈' },
  { key: 'events', name: 'Eventos', emoji: '⚔️' },
  { key: 'guild', name: 'Guilda', emoji: '🏰' },
  { key: 'help', name: 'Ajuda', emoji: '🛟' },
];

const posts = [
  {
    slug: 'comece-aqui',
    title: '00 · Comece aqui — mapa completo do ERP',
    tag: 'start',
    route: '/dashboard/onboarding',
    visualPt: ['Entre com Discord', 'Complete seu perfil', 'Siga o plano de ação'],
    visualEn: ['Log in with Discord', 'Complete your profile', 'Follow your action plan'],
    pt: `## 🧭 Bem-vindo à Central do Player
Aqui está o manual oficial do ERP Raven 2. Cada post explica uma jornada completa, com rota direta, cuidados e o que acontece depois de cada ação.

**Ordem recomendada**
1. Faça login e confira sua conta.
2. Complete o checklist inicial, perfil, STATUS e Fenda.
3. Entenda DKP, presença e regras antes de entrar no loot.
4. Consulte os tutoriais específicos quando surgir uma ação no dashboard.

Abra o [Checklist do jogador](${route('/dashboard/onboarding')}) para começar. Os tutoriais não substituem uma decisão da Staff nem exibem ranking, bids, locks ou dados privados de terceiros.

💬 **Pode responder neste post.** Para receber ajuda mais rápido, diga a tela, a ação tentada e o erro — sem enviar cookie, token ou conteúdo de .env. O Aristolfo é velho, não telepata.`,
    en: `## 🧭 Welcome to the Player Hub
This is the official Raven 2 ERP manual. Each post covers one complete journey with a direct route, safety notes, and what happens after each action.

**Recommended order**
1. Log in and check your account.
2. Complete onboarding, profile, STATUS, and Dimensional Rift.
3. Understand DKP, attendance, and rules before entering loot flows.
4. Open the specific tutorial whenever your dashboard shows a new action.

Start with the [Player checklist](${route('/dashboard/onboarding')}). Tutorials never replace a Staff decision and never reveal rankings, other players' bids, DKP locks, or private data.

💬 **You may reply to this post.** For faster help, include the screen, attempted action, and error — never send cookies, tokens, or .env contents. Aristolfo is old, not psychic.`,
  },
  {
    slug: 'login-conta-acesso',
    title: '01 · Login, conta e liberação de acesso',
    tag: 'account',
    route: '/',
    visualPt: ['Use sua conta da guild', 'Sessão segura no navegador', 'Retorno pode exigir revisão'],
    visualEn: ['Use your guild account', 'Secure browser session', 'Return may need review'],
    pt: `## 🔐 Login e conta
1. Acesse [app.guild-g3x.com.br](${APP_URL}).
2. Clique para entrar com Discord.
3. Autorize usando a mesma conta que está no servidor da guild.
4. Depois do login, você será levado ao ERP ou à revisão de acesso.

**Se aparecer revisão de acesso:** sua conta de player está inativa e o retorno foi colocado na fila da Staff. As demais rotas ficam bloqueadas até a liberação. Não crie outra conta para contornar o fluxo.

**Segurança:** a sessão usa cookie seguro do navegador. Nunca envie cookie, token, QR de login, senha ou print de .env. A Staff não precisa disso para ajudar.

Se o login voltar para a tela inicial, tente uma janela comum sem bloqueio de cookies, confirme que está na conta Discord correta e mande à Staff apenas o horário aproximado e o texto do erro.`,
    en: `## 🔐 Login and account
1. Open [app.guild-g3x.com.br](${APP_URL}).
2. Choose Discord login.
3. Authorize with the same account that belongs to the guild server.
4. After login, you will enter the ERP or see an access review screen.

**If access review appears:** your player account is inactive and your return request is waiting for Staff. Other authenticated routes stay blocked until approval. Do not create another account to bypass this flow.

**Security:** your session uses a secure browser cookie. Never share cookies, tokens, login QR codes, passwords, or .env screenshots. Staff does not need any of them to help.

If login returns to the home page, try a normal browser window with cookies enabled, confirm the correct Discord account, and send Staff only the approximate time and error text.`,
  },
  {
    slug: 'dashboard-avisos-onboarding',
    title: '02 · Dashboard, avisos e checklist inicial',
    tag: 'now',
    route: '/dashboard',
    visualPt: ['Veja o próximo passo', 'Abra o link direto', 'Resolva avisos pendentes'],
    visualEn: ['See the next step', 'Open the direct link', 'Resolve pending notices'],
    pt: `## ⚡ Sua central de ações
O [Dashboard](${route('/dashboard')}) mostra seu DKP total, travado e disponível, além de cards com **próximo passo, motivo, impacto, prioridade e link direto**. Ele pode apontar para leilões, interesses, requests, Codex, progresso e eventos.

Use [Avisos](${route('/dashboard/notices')}) para reunir pendências operacionais e notificações internas. Leia o aviso e abra o botão da própria ação; isso evita caçar tela no menu como se fosse drop de 0,01%.

O [Plano de onboarding](${route('/dashboard/onboarding')}) não é mais checklist decorativo. Cada recruit convertido recebe versão do template, prazo, progresso obrigatório/total e próximo passo PT-BR/EN. Ele acompanha regras, perfil, timezone, build, wishlist, presença/DKP, primeiro evento e canais. Algumas etapas usam evidência automática; outras pedem sua confirmação depois de executar o fluxo. Template novo não reescreve seu plano em andamento.

O dashboard só mostra dados seguros para você. Ranking, concorrentes, bids de terceiros e locks alheios permanecem ocultos.`,
    en: `## ⚡ Your action hub
The [Dashboard](${route('/dashboard')}) shows total, locked, and available DKP plus cards with the **next step, reason, impact, priority, and direct link**. Cards may point to auctions, interests, requests, Codex, progress, or events.

Use [Notices](${route('/dashboard/notices')}) to collect operational tasks and internal notifications. Read the notice and use its action button instead of hunting through the menu like a 0.01% drop.

The [Onboarding plan](${route('/dashboard/onboarding')}) is no longer a decorative checklist. Each converted recruit receives a template version, deadline, required/total progress, and a PT-BR/EN next step. It tracks rules, profile, timezone, build, wishlist, attendance/DKP, first event, and channels. Some steps use automatic evidence; others ask for your confirmation after completing the flow. A new template never rewrites your active plan.

The dashboard only shows data safe for you. Rankings, competitors, third-party bids, and other players' locks remain hidden.`,
  },
  {
    slug: 'perfil-progresso',
    title: '03 · Perfil, build, STATUS e progresso',
    tag: 'progress',
    route: '/dashboard/profile',
    visualPt: ['Revise nick e timezone', 'Envie prints legíveis', 'Aguarde aprovação da Staff'],
    visualEn: ['Review name and timezone', 'Upload readable proof', 'Wait for Staff approval'],
    pt: `## 📈 Perfil e progresso
No [Perfil](${route('/dashboard/profile')}) você ajusta nickname, classe, camada operacional, idioma e timezone. Preferências de combate, disponibilidade e build ajudam a Staff na escala; mudanças sensíveis podem entrar em revisão.

O ERP envia uma cobrança diária privada enquanto faltar build, função ou disponibilidade; também cobra STATUS quando não houver atualização nos últimos 21 dias e presença quando ficar abaixo de 50% nos bosses finalizados dos últimos 15 dias. As pendências do dia chegam consolidadas em uma única mensagem.

Em **Preferências**, escolha Web, Discord, ambos ou nenhum para lembretes não críticos de evento. Essa escolha não desliga cobranças obrigatórias de perfil/Codex nem alertas críticos.

**CP não é editado diretamente.** Publique progresso na categoria **STATUS** com print legível. Para validar camada, envie **Fenda Dimensional**. A Staff analisa e, quando aprovar, atualiza os dados operacionais.

Também existem categorias como Stellas, equipamentos, relíquias, estigma, coleção, habilidade, Pedra do Paraíso e runas.

**Como enviar bem:**
1. escolha a categoria correta;
2. anexe a tela inteira e legível;
3. adicione uma nota quando algo não estiver óbvio;
4. acompanhe o status e os comentários da Staff;
5. responda pelo próprio fluxo quando pedirem ajuste.

Print cortado gera pergunta, pergunta gera fila, fila alimenta o Aristolfo.`,
    en: `## 📈 Profile and progress
In [Profile](${route('/dashboard/profile')}) you can update nickname, class, operational layer, language, and timezone. Combat role, availability, and build preferences help Staff with rosters; sensitive changes may require review.

The ERP sends one private daily reminder while build, role, or availability is missing. It also reminds you when no STATUS was posted in the last 21 days or attendance is below 50% across finalized bosses in the last 15 days. Daily items are consolidated into a single message.

Under **Preferences**, choose Web, Discord, both, or neither for non-critical event reminders. This choice does not disable required profile/Codex reminders or critical alerts.

**CP is not edited directly.** Submit progress under **STATUS** with readable proof. Use **Dimensional Rift** to validate your layer. Staff reviews the submission and updates operational data after approval.

Other categories include Stellas, equipment, relics, stigma, collection, skill, Heaven Stone, and runes.

**Good submission checklist:**
1. choose the correct category;
2. attach a full readable screen;
3. add a note when context is not obvious;
4. track status and Staff comments;
5. reply through the same flow when changes are requested.

Cropped proof creates questions, questions create queues, and queues feed Aristolfo.`,
  },
  {
    slug: 'dkp-presenca-regras',
    title: '04 · DKP, presença, eventos e regras',
    tag: 'events',
    route: '/dashboard/attendance',
    visualPt: ['Responda vou, talvez ou não', 'Registre ausência e reserva', 'RSVP não concede DKP'],
    visualEn: ['Answer yes, maybe, or no', 'Track absence and reserve', 'RSVP grants no DKP'],
    pt: `## ⚔️ DKP e presença sem ritual obscuro
Em [Presença](${route('/dashboard/attendance')}) você consulta seu histórico. O player **não marca a própria presença**: a Staff abre o evento, registra os presentes e finaliza.

Antes do evento, responda o RSVP como **vou participar**, **talvez** ou **não vou**. A nota opcional fica privada para a Staff por padrão; torne-a pública somente se quiser que outros players a vejam. Você pode mudar a resposta até o evento começar. RSVP prevê composição: não marca presença e não concede DKP.

Se ficar indisponível por alguns dias, registre um **período de ausência** com início, fim e motivo opcional. Os eventos da janela ficam indisponíveis automaticamente, sem obrigar você a recusar um por um. O motivo é privado para a Staff por padrão; outros players veem apenas o total indisponível, salvo quando você decide compartilhar o motivo.

Se entrar na **reserva**, você vê a posição, mas não o motivo interno da Staff. Quando uma vaga abrir, aceite ou recuse a oferta na tela. Aceitar confirma o RSVP; não marca presença nem concede DKP.

Nas 24h antes do evento, o ERP lembra somente quem ainda não respondeu ou confirmou, usando o canal escolhido. Se você confirmou e não apareceu, pode explicar depois nesta tela. A justificativa fica com a Staff; uma falta isolada não gera punição nem risk flag automática.

Cada boss possui evento, presença e DKP independentes, mesmo quando criado em lote. Estar no primeiro boss não marca automaticamente os seguintes.

No dashboard:
- **total** é seu saldo registrado;
- **travado** está reservado por bids ativos;
- **disponível** é o que pode ser usado agora.

Leia as [Regras da guild](${route('/dashboard/rules')}) para os valores vigentes. A presença D-30 entra na elegibilidade: atualmente a regra possui cortes separados para bid e para participação em interesses/requests. A tela do leilão ou formulário informa quando você não atende ao requisito.

A mesma tela mostra a **política publicada** com número da versão, autoria, vigência, diff em linguagem simples e snapshot imutável. Ajustar uma regra operacional não reescreve a versão antiga; a Staff precisa publicar outra. Versão futura fica marcada separadamente até entrar em vigor.

Ao abrir a política, o ERP registra a abertura. Depois de ler, use **Li e entendi**: o recibo comprova somente ciência daquela informação, não concordância jurídica ampla. Até confirmar, a pendência aparece no plano de ação. Mudança emergencial recebe selo e mostra o motivo da Staff.

Se uma presença parecer errada, informe boss, data e contexto à Staff. Não use o post público para discutir saldo ou caso pessoal detalhado.`,
    en: `## ⚔️ DKP and attendance without dark rituals
Use [Attendance](${route('/dashboard/attendance')}) to review your history. Players **do not mark their own attendance**: Staff opens the event, records present members, and finalizes it.

Before the event, answer RSVP with **I will attend**, **maybe**, or **cannot attend**. The optional note is private to Staff by default; make it public only when you want other players to see it. You may change your answer until the event starts. RSVP forecasts composition: it does not mark attendance or grant DKP.

If you will be unavailable for several days, register an **absence period** with a start, end, and optional reason. Events in that window become unavailable automatically, so you do not have to decline them one by one. The reason is private to Staff by default; other players only see the unavailable total unless you choose to share the reason.

If you enter the **reserve list**, you see your position but not Staff's internal reason. When a slot opens, accept or decline the offer on screen. Accepting confirms RSVP; it does not mark attendance or grant DKP.

During the 24 hours before an event, the ERP only reminds unanswered or confirmed players through their chosen channel. If you confirmed and missed it, you can explain afterward on this screen. The explanation stays with Staff; one missed event creates no automatic punishment or risk flag.

Each boss has independent event, attendance, and DKP records, even when created as a batch. Attending the first boss does not automatically mark later bosses.

On the dashboard:
- **total** is your registered balance;
- **locked** is reserved by active bids;
- **available** is what you can use now.

Read the live [Guild rules](${route('/dashboard/rules')}). D-30 attendance affects eligibility, with separate current thresholds for bidding and for interests/requests. The auction or form explains when you do not meet the requirement.

The same screen shows the **published policy** with its version number, author, effective date, plain-language diff, and immutable snapshot. Changing an operational rule does not rewrite an older version; Staff must publish a new one. A future version remains separate until it takes effect.

Opening the policy records that it was opened. After reading, use **I read and understood**: the receipt proves awareness of that information only, not broad legal agreement. Until you acknowledge it, the item remains in your action plan. An emergency change carries a badge and shows Staff's reason.

If attendance looks wrong, send Staff the boss, date, and context. Do not discuss detailed personal balances or cases in a public reply.`,
  },
  {
    slug: 'leiloes',
    title: '05 · Leilões, bids, ALL IN e resultado',
    tag: 'loot',
    route: '/dashboard/auctions',
    visualPt: ['Leia a elegibilidade', 'Confirme o tipo de bid', 'Acompanhe seu recibo'],
    visualEn: ['Read eligibility', 'Confirm bid mode', 'Track your receipt'],
    pt: `## 🔨 Como participar de leilões
1. Abra [Leilões](${route('/dashboard/auctions')}) e filtre por tier, tipo ou status.
2. Entre no item e leia o painel de elegibilidade: camada, DKP, presença, modo e necessidade de review.
3. Em **STANDARD**, escolha o valor. Em **ALL IN**, o sistema usa todo o DKP disponível conforme a regra.
4. Revise a confirmação antes de enviar. Um bid cria lock de DKP; ele ainda não é gasto nesse momento.
5. Acompanhe apenas seu status e, no fim, o recibo seguro do resultado.

Se perder, o lock é liberado. Se ganhar, o custo é consumido conforme a regra e a entrega entra na fila da Staff. Alguns casos passam por votação/review antes da decisão final.

**Sigilo obrigatório:** você não vê ranking, bids, locks ou identidade dos concorrentes. Depois da entrega com prova, o resultado público mostra somente item, vencedor, horário e comprovante. Contestação, quando disponível, usa o fluxo controlado exibido na tela — não o tribunal freestyle do Discord.`,
    en: `## 🔨 How to join auctions
1. Open [Auctions](${route('/dashboard/auctions')}) and filter by tier, type, or status.
2. Open the item and read eligibility: layer, DKP, attendance, mode, and review requirement.
3. In **STANDARD**, choose the value. In **ALL IN**, the system uses all currently available DKP according to the rule.
4. Review confirmation before submitting. A bid creates a DKP lock; it is not spent yet.
5. Track only your status and, after closing, your safe result receipt.

If you lose, the lock is released. If you win, the cost is consumed according to the rule and delivery enters Staff's queue. Some cases require voting/review before the final decision.

**Mandatory secrecy:** you cannot see rankings, other bids, locks, or competitor identities. After delivery with proof, the public result only shows item, winner, time, and proof. When available, disputes use the controlled on-screen flow — not Discord freestyle court.`,
  },
  {
    slug: 'interesses-wishlist',
    title: '06 · Interesses, transmutar e wishlist',
    tag: 'loot',
    route: '/dashboard/interests',
    visualPt: ['Filtre posts abertos', 'Anexe print ou transmutar', 'Wishlist não cria bid'],
    visualEn: ['Filter open posts', 'Attach proof or transmute', 'Wishlist does not create bids'],
    pt: `## 💎 Interesse de item
Em [Interesses](${route('/dashboard/interests')}) filtre posts abertos, leia o critério e envie o print pedido. Você pode adicionar nota, marcar posts como vistos e declarar vários interesses em lote; cada item preserva seu próprio print, nota e escolha.

Quando **Transmutar** estiver disponível, marque a opção e confirme: o sistema usa a imagem padrão. Se todos os pedidos daquele post forem de transmutar, há sorteio entre elegíveis; um player só vence um item de transmutar por dia operacional de São Paulo.

A participação depende da presença D-30 definida nas regras vigentes.

## 💠 Wishlist
Na [Wishlist](${route('/dashboard/wishlist')}) escolha o item, prioridade, motivo e build; nota e print são opcionais. Você pode pausar, retomar ou remover um desejo.

Wishlist sinaliza demanda para a Staff. **Ela não cria bid, não declara interesse e não registra drop automaticamente.** É radar, não teletransporte de loot.`,
    en: `## 💎 Item interests
In [Interests](${route('/dashboard/interests')}) filter open posts, read the criteria, and submit the requested screenshot. You may add a note, mark posts as seen, and submit several interests in one batch; each item keeps its own proof, note, and choice.

When **Transmute** is available, select it and confirm; the system uses the standard image. If every entry in that post requests transmute, the winner is randomly selected among eligible players. A player can win only one transmute item per São Paulo operational day.

Participation depends on the current D-30 attendance rule.

## 💠 Wishlist
In [Wishlist](${route('/dashboard/wishlist')}) choose the item, priority, reason, and related build; note and proof are optional. You may pause, resume, or remove a wish.

Wishlist shows demand to Staff. **It does not create a bid, submit an interest, or register a drop automatically.** It is a radar, not loot teleportation.`,
  },
  {
    slug: 'requests-codex',
    title: '07 · Item Requests e Codex',
    tag: 'loot',
    route: '/dashboard/item-requests',
    visualPt: ['Entre na fila correta', 'Atualize o print pedido', 'Confirme o Codex recebido'],
    visualEn: ['Join the right queue', 'Update requested proof', 'Confirm received Codex'],
    pt: `## 📋 Item Requests
Use [Item Requests](${route('/dashboard/item-requests')}) para entrar na fila de itens requestáveis. Escolha o item, envie a prova exigida e acompanhe posição estimada, unidades à frente, idade do update, última entrega e alternativas com fila menor.

Quando o sistema pedir atualização, envie um print novo dentro do prazo e aguarde a análise da Staff. Sugestões não trocam seu pedido automaticamente. Materiais de craft T3 podem ter prioridade sobre Quintessência do mesmo material; o pedido continua válido, mas pode esperar. Criar request também depende da presença D-30 vigente.

## 📖 Codex
Em [Codex](${route('/dashboard/codex')}) envie o print do pedido. Depois que a Staff marcar como enviado:
1. teste no jogo;
2. confirme **Funcionou** se recebeu corretamente;
3. use **Falhou/Tentar novamente** se não funcionou;
4. acompanhe o comprovante e o status.

Ao marcar o envio, o ERP chama você diretamente; enquanto o Codex continuar aguardando resposta, ele também aparece na cobrança diária. A cobrança termina quando você confirma ou pede retry.

Não confirme sucesso antes de verificar. Botão verde por impulso é uma build estranha.`,
    en: `## 📋 Item Requests
Use [Item Requests](${route('/dashboard/item-requests')}) to join a queue for requestable items. Choose the item, provide required proof, and track estimated position, units ahead, update age, last delivery, and shorter-queue alternatives.

When an update is requested, upload fresh proof within the deadline and wait for Staff review. Suggestions never swap your request automatically. T3 craft materials may have priority over Quintessence using the same material; your request remains valid but may wait. Creating a request also depends on the current D-30 attendance rule.

## 📖 Codex
In [Codex](${route('/dashboard/codex')}) upload the request screenshot. After Staff marks it as sent:
1. test it in game;
2. choose **Worked** if received correctly;
3. choose **Failed/Retry** if it did not work;
4. track proof and status.

When Staff marks it as sent, the ERP messages you directly. While the Codex is still waiting for your response, it also appears in the daily reminder. Reminders stop when you confirm or request a retry.

Do not confirm success before checking. Clicking green by instinct is a strange build.`,
  },
  {
    slug: 'drops-resultados',
    title: '08 · Drops, entregas e resultados públicos',
    tag: 'loot',
    route: '/dashboard/drops',
    visualPt: ['Staff entrega com prova', 'Resultado aparece no mural', 'Dados secretos continuam ocultos'],
    visualEn: ['Staff delivers with proof', 'Result appears on board', 'Secret data stays hidden'],
    pt: `## 🎁 Entregas e comprovantes
Abra [Drops](${route('/dashboard/drops')}) para consultar entregas relacionadas a você e o mural de resultados publicados.

O fluxo normal é:
1. leilão, interesse ou request define uma entrega pendente;
2. a Staff entrega o item no jogo;
3. a Staff anexa o comprovante;
4. o drop entra no histórico;
5. se veio de leilão, o resultado seguro aparece no site e no Discord.

O resultado público só existe **depois da entrega com prova** e mostra item, vencedor, horário e comprovante. Ranking, bids, locks e concorrentes continuam ocultos.

Se você ganhou e a entrega não apareceu, confira o recibo do leilão e fale com a Staff informando item e link. Não publique detalhes de bids em respostas abertas.`,
    en: `## 🎁 Deliveries and proof
Open [Drops](${route('/dashboard/drops')}) to review deliveries related to you and the published results board.

The normal flow is:
1. an auction, interest, or request creates a pending delivery;
2. Staff delivers the item in game;
3. Staff attaches proof;
4. the drop enters history;
5. for auctions, the safe result appears on the site and Discord.

A public result exists **only after delivery with proof** and shows item, winner, time, and proof. Rankings, bids, locks, and competitors remain hidden.

If you won and delivery is missing, check the auction receipt and contact Staff with the item and link. Do not publish bid details in open replies.`,
  },
  {
    slug: 'war-room',
    title: '09 · Minha War Room — escala e confirmação',
    tag: 'events',
    route: '/dashboard/my-war-room',
    visualPt: ['Leia sua função', 'Confirme ou recuse', 'Deixe uma nota útil'],
    visualEn: ['Read your role', 'Confirm or decline', 'Leave a useful note'],
    pt: `## 🛡️ Sua chamada para operações
Em [Minha War Room](${route('/dashboard/my-war-room')}) você vê somente suas próprias escalas para Clash, Ancient Fortress, Abyss, Guild Raid ou operações personalizadas.

Cada chamada pode mostrar janela, objetivo, mapa/região, função tática, classe/camada esperada e instruções públicas em PT-BR/EN.

**Quando for escalado:**
1. leia horário e instruções completas;
2. confirme presença se puder participar;
3. se não puder, recuse e deixe uma nota curta e útil;
4. volte à tela se sua disponibilidade mudar;
5. acompanhe o status final de presença.

Você não vê notas privadas da Staff nem a escala completa de terceiros. Confirmar e sumir dá dano verdadeiro na composição — sem crítico, só tristeza.`,
    en: `## 🛡️ Your operation assignment
In [My War Room](${route('/dashboard/my-war-room')}) you only see your own assignments for Clash, Ancient Fortress, Abyss, Guild Raid, or custom operations.

Each assignment may show its time window, objective, map/region, tactical role, expected class/layer, and public instructions in PT-BR/EN.

**When assigned:**
1. read the full schedule and instructions;
2. confirm if you can attend;
3. if unavailable, decline and leave a short useful note;
4. return to the page if availability changes;
5. track the final attendance status.

You cannot see private Staff notes or complete third-party rosters. Confirming and disappearing deals real damage to the composition — no crit, only sadness.`,
  },
  {
    slug: 'daoshi',
    title: '10 · Daoshi — comprovante, meta e cupons',
    tag: 'guild',
    route: '/dashboard/daoshi',
    visualPt: ['Use o cupom AACD', 'Envie valor, data e prova', 'Acompanhe aprovação e cupons'],
    visualEn: ['Use coupon AACD', 'Submit value, date and proof', 'Track approval and tickets'],
    pt: `## 🪙 Cash com a Daoshi
Na [área Daoshi](${route('/dashboard/daoshi')}) você acompanha a meta mensal da guild, seu total aprovado, seus cupons e o histórico de comprovantes.

**Fluxo:**
1. faça a compra pelo canal oficial da Daoshi usando o cupom **AACD**;
2. no ERP, informe valor e data da compra;
3. anexe um comprovante legível e, se necessário, uma observação;
4. envie e aguarde a revisão da Staff;
5. acompanhe o status Pendente, Aprovado ou Rejeitado.

Somente valores aprovados contam. A soma mensal gera 1 cupom a cada R$200 aprovados. O sorteio de saldo é habilitado quando a meta coletiva exibida na tela é atingida.

Não publique comprovantes financeiros neste fórum. Dúvida específica deve ir para a Staff em canal privado.`,
    en: `## 🪙 Cash through Daoshi
In the [Daoshi area](${route('/dashboard/daoshi')}) you can track the guild monthly goal, your approved total, raffle tickets, and receipt history.

**Flow:**
1. purchase through the official Daoshi channel using coupon **AACD**;
2. enter purchase value and date in the ERP;
3. attach readable proof and an optional note;
4. submit and wait for Staff review;
5. track Pending, Approved, or Rejected status.

Only approved values count. Your monthly approved sum grants 1 ticket per R$200. The balance raffle becomes available when the collective goal shown on screen is reached.

Never publish financial receipts in this forum. Send case-specific questions to Staff privately.`,
  },
  {
    slug: 'timeline-resumo',
    title: '11 · Timeline e resumo semanal seguro',
    tag: 'guild',
    route: '/dashboard/timeline',
    visualPt: ['Filtre seu histórico', 'Abra ações relacionadas', 'Veja números coletivos seguros'],
    visualEn: ['Filter your history', 'Open related actions', 'See safe collective numbers'],
    pt: `## 🕒 Seu histórico e o pulso da guild
A [Timeline](${route('/dashboard/timeline')}) narra atividades relacionadas a você: drops, progresso, requests, Codex, eventos e leilões. Use filtros por tipo e período e abra o link da entrada quando houver uma ação relacionada.

Nos leilões, a timeline preserva sigilo: mostra seu papel e seu recibo, não a disputa completa.

O [Resumo semanal](${route('/dashboard/weekly-summary')}) alterna entre semana e mês e apresenta números coletivos seguros, resumo PT-BR/EN e links de ação. Ele ajuda a entender o ritmo da guild sem expor ranking individual ou dados privados.

Para investigar algo pessoal, comece pela timeline, depois confira a tela de origem. Se ainda houver divergência, mande à Staff o link e a data aproximada. Contexto bom reduz o tempo de respawn da resposta.`,
    en: `## 🕒 Your history and the guild pulse
The [Timeline](${route('/dashboard/timeline')}) narrates activity related to you: drops, progress, requests, Codex, events, and auctions. Filter by type or period and open the entry link when an action is available.

For auctions, secrecy is preserved: the timeline shows your role and receipt, not the complete hidden competition.

The [Weekly summary](${route('/dashboard/weekly-summary')}) switches between week and month and shows safe collective numbers, PT-BR/EN summaries, and action links. It explains guild momentum without exposing individual rankings or private information.

To investigate a personal issue, start with the timeline and then check the source screen. If it still differs, send Staff the link and approximate date. Good context reduces the answer respawn timer.`,
  },
  {
    slug: 'casos-privados-recursos',
    title: '12 · Casos privados, denúncias e recursos',
    tag: 'help',
    route: '/dashboard/cases',
    visualPt: ['Escolha categoria e urgência', 'Converse somente com a Staff', 'Acompanhe prazo e resposta'],
    visualEn: ['Choose category and urgency', 'Talk only with Staff', 'Track deadline and response'],
    pt: `## 🛡️ Fale com a Staff sem abrir praça pública
Use [Casos privados](${route('/dashboard/cases')}) para dúvida, denúncia operacional ou recurso. Escolha categoria e urgência, descreva fatos, datas e o resultado que precisa. Somente você e a Staff autorizada veem a conversa.

As respostas ficam no histórico. Se o caso já foi resolvido e você enviar contexto novo, ele reabre. Notas internas da Staff nunca aparecem para você; decisões disciplinares não são automáticas por volume ou severidade.

Contestação de resultado de leilão continua dentro da página do próprio leilão. Assim o ERP preserva participantes, bids, locks e regras específicas sem criar duas verdades para o mesmo problema.

Caso privado é para contexto sensível. Token, cookie, senha e conteúdo de .env continuam sendo oferenda proibida ao Aristolfo.`,
    en: `## 🛡️ Talk to Staff without creating a public square
Use [Private cases](${route('/dashboard/cases')}) for a question, operational report, or appeal. Choose a category and urgency, then describe facts, dates, and the outcome you need. Only you and authorized Staff can see the thread.

Replies remain in the history. If a case was resolved and you send new context, it reopens. Staff internal notes are never shown to you; disciplinary decisions are never automated from case volume or severity.

Auction-result disputes stay inside the auction page. This preserves participant, bid, lock, and domain-specific secrecy without creating two sources of truth.

A private case is for sensitive context. Tokens, cookies, passwords, and .env contents are still forbidden offerings to Aristolfo.`,
  },
  {
    slug: 'ajuda-seguranca',
    title: '13 · Ajuda, privacidade e solução de problemas',
    tag: 'help',
    route: '/dashboard/rules',
    visualPt: ['Copie o texto do erro', 'Inclua tela e horário', 'Nunca envie segredos'],
    visualEn: ['Copy the error text', 'Include screen and time', 'Never share secrets'],
    pt: `## 🛟 Antes de pedir ajuda
1. atualize a página uma vez;
2. confirme se está na conta Discord correta;
3. leia o aviso e as [regras vigentes](${route('/dashboard/rules')});
4. tente novamente sem múltiplos cliques;
5. copie o texto exato do erro.

Ao responder em um tutorial, informe **rota/tela, ação tentada, horário aproximado e resultado esperado**. Um print pode ajudar, desde que não exponha dados privados.

**Nunca publique:** token, cookie, senha, QR de login, conteúdo de .env, comprovante financeiro, dados pessoais ou informações sigilosas de leilão. Ranking, bids, locks e identidade de participantes ficam privados até o resultado/entrega permitidos pelo sistema.

Para casos pessoais de DKP, presença, punição, review, comprovante ou acesso, chame a Staff em canal privado. Este fórum pode receber dúvidas e respostas, mas não precisa virar praça pública de prontuário gamer.`,
    en: `## 🛟 Before asking for help
1. refresh the page once;
2. confirm the correct Discord account;
3. read the notice and [current rules](${route('/dashboard/rules')});
4. retry without repeated clicks;
5. copy the exact error text.

When replying to a tutorial, include the **route/screen, attempted action, approximate time, and expected result**. A screenshot may help as long as it contains no private data.

**Never publish:** tokens, cookies, passwords, login QR codes, .env contents, financial receipts, personal data, or confidential auction information. Rankings, bids, locks, and participant identities stay private until a result/delivery is safely published by the system.

For personal DKP, attendance, discipline, review, receipt, or access cases, contact Staff privately. This forum welcomes questions and answers, but it does not need to become a public gamer medical chart.`,
  },
  {
    slug: 'trial-transparente',
    title: '14 · Trial transparente e check-ins',
    tag: 'now',
    route: '/dashboard/trial',
    visualPt: ['Leia objetivo e criterios', 'Acompanhe D7, D14 e D30', 'Declare ausencia quando precisar'],
    visualEn: ['Read objective and criteria', 'Follow days 7, 14, and 30', 'Declare an absence when needed'],
    pt: `## Trial visivel antes da decisao
Se a Staff iniciar uma avaliacao, abra [Meu trial](${route('/dashboard/trial')}). O objetivo, o periodo e todos os criterios PT-BR/EN aparecem antes de qualquer decisao.

Os check-ins D7, D14 e D30 registram fatos visiveis para voce. Notas internas da Staff continuam privadas. Uma ausencia declarada pausa o periodo e ajusta o fim exibido.

Aprovar, estender ou encerrar exige decisao humana com motivo. Trial nao cria ranking de lealdade, nao pune automaticamente e nao altera as regras ou o sigilo de loot.`,
    en: `## A visible trial before any decision
If Staff starts an evaluation, open [My trial](${route('/dashboard/trial')}). Its objective, period, and every PT-BR/EN criterion are published before any decision.

Day 7, 14, and 30 check-ins record facts visible to you. Internal Staff notes remain private. A declared absence pauses the period and adjusts the displayed end.

Approval, extension, or closure requires a reasoned human decision. Trial creates no loyalty ranking, applies no automatic punishment, and never changes loot rules or secrecy.`,
  },
  {
    slug: 'mentoria-primeiros-marcos', title: '15 · Mentoria e primeiros marcos', tag: 'guild', route: '/dashboard/mentorship',
    visualPt: ['Peca ajuda por tema/role', 'Veja seu acolhimento', 'Marcos sao datas, nao pontos'],
    visualEn: ['Ask by topic/role', 'View your welcome contact', 'Milestones are dates, not points'],
    pt: `## Ajuda sem cacar DM
Em [Mentoria](${route('/dashboard/mentorship')}) veja seu mentor voluntario ou grupo de acolhimento e peca ajuda por boss, build, role, evento, request, interesse ou War Room. O pedido fica no ERP e nao depende de conversa privada perdida.

Primeiro evento, boss, request, interesse e War Room aparecem como datas reais. Sao marcos de integracao, nunca score ou ranking. Voce pode se voluntariar como mentor e retirar a disponibilidade; mentor nao ganha poder disciplinar nem acesso a notas Staff.`,
    en: `## Help without hunting for a DM
On [Mentorship](${route('/dashboard/mentorship')}), view your volunteer mentor or welcome group and ask for help with bosses, builds, roles, events, requests, interests, or War Room. The request stays in the ERP instead of a lost private conversation.

Your first event, boss, request, interest, and War Room appear as real dates. They are integration milestones, never a score or ranking. You may volunteer and withdraw availability; mentors receive no disciplinary power or Staff notes.`,
  },
  {
    slug: 'pulso-anonimo-voluntario', title: '16 · Pulso anonimo e voluntario', tag: 'guild', route: '/dashboard/pulse',
    visualPt: ['Responda ou pule', 'Identidade fica separada', 'Sem efeito em loot ou disciplina'],
    visualEn: ['Answer or skip', 'Identity stays separate', 'No loot or discipline effect'],
    pt: `## Sua voz sem score escondido
Em [Pulso da guilda](${route('/dashboard/pulse')}) responda pertencimento, clareza, carga, diversao e seguranca para pedir ajuda, de 1 a 5. Comentario e opcional. Voce tambem pode pular sem consequencia.

A resposta nao guarda player, nick ou Discord. O recibo de participacao fica em tabela separada. A Staff so ve medias e textos depois do grupo minimo; nunca recebe notas individuais. Texto aberto e moderado e apagado no prazo mostrado.

Pulso nao cria score de lealdade e nao afeta loot, DKP, trial, acesso ou disciplina.`,
    en: `## Your voice without a hidden score
On [Guild pulse](${route('/dashboard/pulse')}), rate belonging, clarity, workload, fun, and safety asking for help from 1 to 5. The comment is optional. You may also skip without consequences.

The response stores no player, nickname, or Discord identity. The participation receipt lives separately. Staff only sees averages and text after the minimum group size and never receives individual scores. Open text is moderated and deleted on the displayed schedule.

Pulse creates no loyalty score and never affects loot, DKP, trial, access, or discipline.`,
  },
  {
    slug: 'sinais-explicaveis-sem-score', title: '17 · Sinais explicaveis, sem score', tag: 'guild', route: '/dashboard/pulse',
    visualPt: ['Fatos usam janelas claras', 'Servem para conversa', 'Nunca bloqueiam ou punem'],
    visualEn: ['Facts use clear windows', 'They start conversations', 'They never block or punish'],
    pt: `## Contexto para conversar, nao vigiar
O ERP pode apontar para a Staff mudanca de participacao, onboarding parado, confirmacoes revertidas, retorno de inativo ou uma classe pouco presente. Cada sinal mostra fatos e a janela usada.

Nao existe score de lealdade/churn. Um sinal nao remove player, bloqueia acesso, reduz loot ou aplica punicao. Ele so recomenda uma conversa para entender contexto, horario, carga ou ajuda necessaria.`,
    en: `## Context for a conversation, not surveillance
The ERP may show Staff a participation change, stalled onboarding, reverted confirmations, an inactive-member return, or a class cohort with low recent attendance. Every signal includes its facts and time window.

There is no loyalty/churn score. A signal never removes a player, blocks access, reduces loot, or applies punishment. It only recommends a conversation to understand context, schedule, workload, or needed help.`,
  },
  {
    slug: 'playbook-minha-funcao', title: '18 · Playbook e minha funcao', tag: 'war', route: '/dashboard/playbook',
    visualPt: ['Leia o brief publico', 'Veja somente seu papel', 'Confirme leitura separada do RSVP'],
    visualEn: ['Read the public brief', 'See only your role', 'Confirm reading separately from RSVP'],
    pt: `## Preparacao sem vazar call interna
Em [Playbook](${route('/dashboard/playbook')}) veja o objetivo e o brief publico PT-BR/EN da versao anexada ao seu evento ou War Room. O sistema mostra apenas a instrucao do seu papel; notas Staff e funcoes dos outros ficam privadas.

Clique em **Li minha funcao** depois de ler. Esse recibo nao confirma RSVP, nao marca presenca e nao gera DKP. Se a estrategia ganhar nova versao, a operacao continua ligada exatamente a versao escolhida pela Staff.`,
    en: `## Preparation without leaking internal calls
On [Playbook](${route('/dashboard/playbook')}), read the PT-BR/EN objective and public brief from the version attached to your event or War Room. The system shows only your role instruction; Staff notes and other roles remain private.

Click **I read my role** after reading. This receipt does not confirm RSVP, mark attendance, or grant DKP. If the strategy gets a new version, the operation remains linked to the exact version selected by Staff.`,
  },
  {
    slug: 'comunicacao-digest-discord', title: '19 · Canais, digest e acoes Discord', tag: 'guild', route: '/dashboard/communications',
    visualPt: ['Escolha canal por categoria', 'Configure quiet hours', 'Revise no site apos usar o bot'],
    visualEn: ['Choose a channel per category', 'Configure quiet hours', 'Review on the site after using the bot'],
    pt: `## Menos ruido, mesmo estado
Em [Comunicacao](${route('/dashboard/communications')}) escolha Web, Discord, ambos ou nenhum para eventos, seu loot, requests, progresso, comunicados e lembretes. Configure timezone, quiet hours, digest diario/semanal e envie um teste.

O digest agrupa mudancas repetidas do mesmo objeto, mostra link/prazo e nunca inclui informacao de terceiros. Alerta critico precisa estar explicitamente classificado para furar o silencio.

Com o bot configurado, use /erp-rsvp, /erp-ausencia, /erp-instrucao e /erp-regra. A resposta confirma o estado salvo e oferece a rota de revisao. O site continua funcional sem Discord e permanece a fonte de verdade.`,
    en: `## Less noise, same state
On [Communication](${route('/dashboard/communications')}), choose Web, Discord, both, or none for events, your loot, requests, progress, announcements, and reminders. Configure timezone, quiet hours, a daily/weekly digest, and send a test.

The digest groups repeated changes to the same object, shows its link/deadline, and never includes third-party information. A critical alert must be explicitly classified to bypass quiet hours.

With the bot configured, use /erp-rsvp, /erp-ausencia, /erp-instrucao, and /erp-regra. The reply confirms the saved state and provides a review route. The website remains functional without Discord and stays the source of truth.`,
  },
];

module.exports = { APP_URL, tags, posts };
