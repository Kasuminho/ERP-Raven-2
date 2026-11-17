# Inventário Completo de Rotinas e Sistemas do ERP AlcatraZ

**Data da Auditoria:** 17 de Novembro de 2026  
**Auditoria Executada:** 20 Subagentes Especialistas cobrindo Backend, Frontend, Banco de Dados, Discord e Infraestrutura.

---

## 1. Matriz Executiva: Ativo vs Desativado / Legado

| Módulo / Domínio | Status Operacional | O que está Ativo (Em Uso Real) | O que está Desativado / Subutilizado / Legado |
|---|:---:|---|---|
| **Drops & Distribuição por CP** | **CENTRAL (Ativo)** | Tela `/dashboard/drops`, ranking de CP em tempo real, badges de histórico (`Já tem`, `Categoria`, `1º Drop`), histórico de entregas com comprovante. | Endpoints legados `/drops/auction-results`, `/drops/me`, `/drops/audit/item` (substituído por `full`). |
| **Interesses de Itens (Omnichannel)** | **CENTRAL (Ativo)** | Posts de interesse no Discord (`#loot-distribution-cp`) com botão `interest:toggle` e reação `🎯`, espelhamento com a Web, decisão de 1 clique pela Staff por CP. | Quórum de 3 votos da Staff (removido da UI, mantido na API), sorteio automático de transmutar (incompatível com CP), tela `/dashboard/interests` (órfã). |
| **Leilões & DKP** | **SECUNDÁRIO / HISTÓRICO** | API `/auctions`, cálculo contábil de saldo DKP (`DKPTransaction`), 6 cron jobs de expiração/locks, testes E2E do CI. | Navegação removida do menu web (`layout.tsx`), formulários de lances e cancelamentos (`ALL_IN`), quórum de 3 votos, contestações e simuladores. |
| **Baú da Guilda (Guild Storage)** | **ATIVO** | Inventário consolidado, OCR multimodal Gemini Vision (prints do baú com `Ctrl+V`), solicitações de itens pelos membros (cota de 5 itens ativos), despacho e deduplicação. | Importação por planilha (nunca existiu nativamente, substituída por OCR), coluna `allowNegativeStock` (morta), modo `FREE_DISTRIBUTION` (travado na UI). |
| **Pedidos de Craft / Requests** | **ATIVO** | Fila de espera dinâmica com cálculo de previsão (`queueForecast`), regra de prioridade Material T3 sobre Quintessência, cron diário de avisos e queda (D-3, D-4, D-5). | Catálogo nativo com apenas 13 itens (sem materiais comuns/roxos), campo `targetItemCatalogId` desconectado da UI Web, canibalizado pelo Baú da Guilda. |
| **Jogadores, Roster & CP** | **CENTRAL (Ativo)** | Ranking no `/dashboard` com abas AlcatraZ e AlcatraZ2, desativação/reativação auditada, perfil de combate (`PlayerCombatProfile`) e matriz tática de combate. | Tela `/dashboard/members` (órfã e quebrando 403 para players), formulários legados de 10 categorias no perfil antigo. |
| **OCR de HUD & Status** | **CENTRAL (Ativo)** | Leitura de Ataque, Defesa e Precisão com Gemini Vision (`RavenStatusOcrService`), cálculo de CP, leitura de buffs, comandos Discord `/status` e `/cp`, captura global de `Ctrl+V` no dashboard. | Biblioteca `tesseract.js` (removida no commit `5749f42`), menção residual no `WIKI.md`. |
| **Eventos, Presença & Bosses** | **ATIVO** | Chamada de presença ao vivo em `/dashboard/admin/events`, encadeamento e cópia automática entre bosses de lote (`attendanceBatchId`), cálculo de assiduidade D-30. | Criação de eventos avulsos sem lote, link quebrado no menu player para `/dashboard/staff/events` (404), checklists manuais em JSON. |
| **Codex** | **PARCIALMENTE DESATIVADO** | Leitura de histórico de codex entregue, confirmação e retries de itens enviados pela Staff. | Criação direta com print (`POST /codex/me` bloqueado por 400 orientando ir para o Baú). O formulário em `/dashboard/profile` foi esquecido aberto. |
| **Vendas em Diamantes** | **ATIVO NA STAFF** | Rateio de diamantes com congelamento de snapshot, entregas individuais com upload de comprovante, postagem em lotes de até 10 embeds no canal `drops`. | Acesso em `/dashboard/loot` bloqueado por 403 para jogadores comuns, impossibilidade de estorno de cota quando jogador sai da guilda antes de receber. |
| **Daoshi & Sorteio Cash** | **ATIVO** | Envio de comprovantes pelos membros, aprovação da Staff com ajuste de valor real, geração de cupons (R$ 200 = 1 cupom) e sorteio mensal criptográfico de $50. | Tela de player órfã na navegação, bug de `playerApprovedCents` zerando para compras < R$ 200, links de print quebrados (`404` por falta de host da API). |
| **War Room & Táticas** | **SUBUTILIZADO** | Planejamento tático de slots por role, detecção de 5 conflitos de escala, dossiê pós-guerra em Markdown, tela segura do jogador `/dashboard/my-war-room`. | Sem link na navegação para a tela do jogador, preenchimento de timeline ao vivo inviável no meio do PvP de voz, escalação 1 a 1 exaustiva. |
| **Recrutamento & Onboarding** | **PARCIALMENTE DESATIVADO** | Formulário público `/apply` e triagem de candidaturas em `/dashboard/staff/recruitment`. | Conversão de candidatura em Player quebra com 409 Conflict (conflita com o Player gerado no login Discord), `CharacterSetupGate` removido da raiz. |
| **Integração Discord & Bot** | **CENTRAL (Ativo)** | Gateway conectado (`discord.js`), escuta de reações e cliques de botões em tempo real, slash commands `/status` e `/cp`, webhooks e embeds Aristolfo. | Falta filtro de emoji em reações (qualquer emoji dispara DM), slash commands registrados globalmente a cada restart (risco de teto de 200/dia). |
| **CI/CD & Docker** | **ESTÁVEL (Recém-corrigido)** | GitHub Actions com testes unitários, validação Prisma, PostgreSQL de serviço para testes E2E, build multi-stage Docker e smoke pós-deploy. | Imagens pesadas (>1.2GB) sem standalone do Next.js, limite de 12 vulnerabilidades altas (estamos em 9), memória no build (4GB) maior que no VPS (1.5GB). |
| **Banco de Dados & Prisma** | **ÍNTEGRO (100% alinhado)** | 88 tabelas, 70 enums, 166 relações estrangeiras com `onDelete` explícito, migrações rigorosamente ordenadas de 1 a 80. | Tabela `EligibilityRule` 100% morta (substituída por `BusinessRule`), 3 índices redundantes em colunas que já são `@unique`. |
| **Internacionalização (i18n)** | **PARCIALMENTE CONFORME** | Store Zustand (`guild-locale`), seletor PT/EN/ES no header, 619 chaves traduzidas, labels de classes e itens. | Uso excessivo de ternários `locale === 'en' ? ... : ...` que quebram Espanhol (ES recebe PT), ferramentas Staff traduzidas (viola regra de Staff apenas PT). |
| **Árvore de Rotas Web (Next.js)** | **SIMPLIFICADA (4 rotas no menu)** | `/dashboard`, `/dashboard/drops`, `/dashboard/admin/items`, `/dashboard/staff/progress`. | ~40 rotas órfãs ou legadas compiladas sem links, rotas duplicadas (`/dashboard/interests` e `/dashboard/loot`), link quebrado 404 em eventos. |

---

## 2. Detalhamento dos Módulos Principais

### 2.1 Drops e Distribuição por Ranking de CP
- **Fluxo Operacional Real:**
  1. A Staff abre um drop em `/dashboard/drops` (ou via catálogo em `/dashboard/admin/items`), escolhendo o item, tempo e modo (PvE/PvP).
  2. O sistema posta automaticamente no canal `#loot-distribution-cp` com botão interativo `interest:toggle` e reação `🎯`.
  3. Membros manifestam interesse tanto no Discord quanto na Web (sincronizados em tempo real).
  4. Ao encerrar o prazo, a Staff visualiza os membros ordenados estritamente pelo Combat Power verificado por OCR.
  5. A Staff escolhe o contemplado com base no CP e presença no boss, anexa o print de entrega no jogo e finaliza.
  6. Um anúncio oficial com a voz do Aristolfo é enviado para `#drops-entregues` comprovando a entrega.

### 2.2 OCR da HUD do Raven 2
- **Mecânica de Leitura:**
  - O jogador tira print da tela do jogo exibindo o nível, as barras de HP/MP e a HUD inferior.
  - O Gemini Vision extrai:
    - $\text{Ataque}$ (ícone de espada)
    - $\text{Defesa}$ (ícone de escudo)
    - $\text{Precisão}$ (ícone de estrela/mira)
    - $\text{CP Total} = \text{Ataque} + \text{Defesa} + \text{Precisão}$
    - Contagem e descrição de buffs ativos na barra inferior (para evitar buffs ilegais de outras classes ou poções de cash não homologadas).
  - O print é revisado pela Staff em `/dashboard/staff/progress` e, ao ser aprovado, atualiza o `Player.combatPower`.

### 2.3 Baú da Guilda vs Fila de Craft
- O **Baú da Guilda (`/dashboard/storage`)** atende a demanda imediata de itens estocados:
  - Cota de 5 pedidos simultâneos por jogador.
  - Custo zero DKP e entrega ágil pela Staff com baixa no estoque.
- O módulo de **Pedidos de Craft (`/dashboard/item-requests`)** atende itens de longo prazo (Receitas e Fragmentos T3):
  - Prioriza a confecção de equipamentos T3 sobre a extração de Quintessência.
  - Aplica cron de inatividade com perda de posição para jogadores inativos no topo da fila (D-3, D-4, D-5).
