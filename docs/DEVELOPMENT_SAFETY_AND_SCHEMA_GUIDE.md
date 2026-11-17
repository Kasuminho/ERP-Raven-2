# Guia de Segurança de Desenvolvimento e Integridade de Schema (Anti-Regressão)

Este documento define as regras inegociáveis de engenharia de software para o repositório do ERP AlcatraZ, prevenindo quebras em build, regressões em produção, gargalos de memória e falhas em queries Prisma.

---

## 1. Regras Fundamentais de Schema (Banco de Dados x DTOs)

### 🚨 Regra de Ouro do Combat Power e Atributos:
- **Tabela `Player` possui APENAS a coluna `combatPower: Int`**.
- **NÃO EXISTEM colunas `attackPower`, `defensePower` ou `accuracy` na tabela `Player`**.
- Qualquer query do Prisma com `select` ou `include` que inclua `attackPower: true`, `defensePower: true` ou `accuracy: true` sob `player` **resultará em erro 500 fatal imediato em runtime**.
- **Onde esses atributos residem?**
  - Residem estritamente no campo JSON `PlayerProgress.metadata`:
    `{ "attack": 1234, "defense": 2345, "accuracy": 3456, "calculatedCp": 7035, "buffCount": 4 }`
- **Tipagem no Frontend:**
  - O tipo `ItemInterestEntry` e os tipos de jogador devem refletir fielmente o retorno do Prisma:
    `id`, `nickname`, `class`, `guildName`, `combatPower`, `dimensionalLayer`, `attendancePercentage`.

### 🛡️ Regra de Migrações do Prisma:
- **Toda alteração de schema exige migração versionada**:
  `npx prisma migrate dev --name nome_da_migracao` (em desenvolvimento) ou arquivo SQL em `packages/database/prisma/migrations`.
- **Nunca use `prisma db push`** em ambientes compartilhados ou de produção.
- Sempre valide o schema antes do commit:
  `npx.cmd prisma validate --schema packages/database/prisma/schema.prisma`
  `npx.cmd prisma generate --schema packages/database/prisma/schema.prisma`

---

## 2. Diretrizes de Memória e Compilação (Node.js & Docker)

### ⚠️ Limite de Heap do Node.js (Exit Code 134 / OOM Killer):
- O compilador do TypeScript (`tsc`), o Webpack do NestJS, o `next build` e o `@typescript-eslint` com `projectService: true` exigem **mais de 2 GB de RAM** durante o build.
- **Configuração Obrigatória de Build:**
  - No `.github/workflows/docker-images.yml`: manter `NODE_OPTIONS: --max-old-space-size=4096`.
  - No `Dockerfile`: manter `ENV NODE_OPTIONS="--max-old-space-size=4096"` nas etapas `api-build` e `web-build`.
- **Cuidado em Runtime (Produção):**
  - O container da API em produção está limitado a 1.5GB (`API_MEMORY_LIMIT: 1536m`).
  - Nunca execute processos de OCR massivo em paralelo ou carregue arquivos inteiros em memória (`memoryStorage`) sem controle de concorrência.

---

## 3. Regras de Negócio e Lógica Operacional

### ⚔️ Distribuição de Drops e Declaração de Interesse:
1. **Manifestação sem print**:
   - Nunca envie strings mágicas como `imageUrl: '/transmutar.png'` em declarações normais da Web. Isso marca `isTransmuteRequest: true` no banco e faz o cron disparar sorteios aleatórios de transmutar, atropelando o ranking de CP.
   - Declarações sem print devem ter `imageUrl` nulo ou campo explícito `isTransmuteRequest: false`.
2. **Ciclo de Entrega de Drop**:
   - Um drop com status `OPEN` **não pode ser entregue diretamente**.
   - O fluxo correto é:
     1. Staff seleciona o vencedor no ranking de CP &rarr; `POST /item-interests/:id/decide` (muda para `READY_FOR_DELIVERY` e define `selectedEntryId`).
     2. Staff anexa o print de entrega &rarr; `POST /item-interests/:id/deliver` (baixa no catálogo, gera `DropHistory` e notifica o Discord).
3. **Cancelamento de Interesse (Undeclare)**:
   - Clicar em "Cancelar Interesse" na Web deve invocar a remoção da entrada existente, nunca submeter um segundo POST para o mesmo jogador (o que estoura a constraint única `@@unique([postId, playerId])`).

### 🤖 Integração com o Bot do Discord:
1. **Filtro Estrito de Emoji nas Reações:**
   - Todo listener de `messageReactionAdd` ou `messageReactionRemove` deve checar expressamente se `reaction.emoji.name === '🎯'` antes de disparar qualquer alteração no banco ou envio de DM.
2. **Respostas Efêmeras:**
   - Sempre prefira interações com botão interativo (`ButtonInteraction` com `deferReply({ ephemeral: true })`) em vez de DMs diretas, evitando rate limits de DM do Discord e bloqueios de usuários.

---

## 4. Diretrizes de Interface Web e Autorização

1. **Separação de Privilégios (403 Forbidden):**
   - Nunca chame endpoints restritos à Staff (`@Roles('STAFF', 'ADMIN')`) a partir do nível raiz de componentes consumidos por jogadores comuns.
   - Utilize `{ enabled: isStaff }` nas queries do React Query para endpoints como `GET /drops` ou `GET /item-interests/staff/list`.
2. **Internacionalização (i18n):**
   - **Telas e ferramentas exclusivas da Staff:** 100% em **Português (PT-BR)**. Nunca adicione chaves de tradução desnecessárias para menus internos da Staff.
   - **Telas de Jogadores:** Suporte obrigatório a **PT-BR, EN e ES**.
   - **Proibido usar ternários binários** `locale === 'en' ? enText : ptText`. Quando o jogador seleciona Espanhol (`es`), a condição falha e entrega Português. Use o dicionário `t(locale, 'chave')`.
