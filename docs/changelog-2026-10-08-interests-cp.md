# Interesses Omnichannel por CP, Presença no Boss e i18n Global

**Data:** 08/10/2026  
**Público:** Staff AlcatraZ  
**Origem:** Atualização Operacional ERP Raven 2 (`f008398`)

---

### 1. Interesses Omnichannel (Discord + Web)
- Quando um novo drop for aberto para manifestação de interesse, o Aristolfo posta a notificação no canal de drops com botões interativos:
  - `[🎯 Manifestar Interesse]`: O jogador clica direto pelo Discord. O bot identifica a conta vinculada, valida prazo e responde de forma efêmera confirmando nickname, classe e o Combat Power (CP) registrado no sistema.
  - `[🌐 Abrir no Site]`: Atalho direto para quem preferir abrir a central de interesses na Web.

---

### 2. Decisão Ágil da Liderança (Adeus Quorum de 3 Votos)
- **Decisão em 1 clique:** O fluxo foi desburocratizado. O líder que estiver distribuindo os drops na rotina pode decidir diretamente sem exigir 3 votos da Staff.
- **Ordenação por CP:** A lista de interessados em `/dashboard/staff/interests` passa a ser ordenada primariamente por **Combat Power decrescente (`combatPower DESC`)**, com coroa e destaque dourado no `#1 Top CP`.
- **Alerta de Item Superior no Slot:** O sistema cruza os drops anteriores do jogador (`DropHistory`) e exibe uma badge âmbar caso ele já tenha recebido uma peça do mesmo slot com tier igual ou superior (evitando que quem já tem T4 dispute T3).
- **Presença no Boss:** Switch manual ao lado de cada interessado para marcar `Presente` ou `Ausente` no momento da distribuição.

---

### 3. Transparência Anti-Panelinha e Print Aberto no Discord
- **Justificativa Obrigatória:** Se o líder escolher um jogador que não seja o topo de CP (por exemplo, porque o Top 1 não estava no boss ou já tem item superior), um modal rápido registra o motivo da decisão.
- **Comprovante com Imagem Aberta:** Na entrega do drop, o líder anexa o print do jogo. O Aristolfo posta no canal `#drops` do Discord o comprovante como imagem aberta (`embed.setImage`) acompanhado do critério da liderança e dados do recebedor.

---

### 4. Correção Global de Idiomas (i18n)
- **Seletor de Idiomas:** Adicionado componente de troca rápida `[ PT ] [ EN ] [ ES ]` na barra lateral e menu mobile.
- **Sincronização Imediata:** A preferência de idioma cadastrada no perfil passa a ser carregada instantaneamente no login via `/auth/me`.
- **Dashboard Dinâmico:** Todas as seções e cartões do dashboard foram migrados para o dicionário multilíngue, resolvendo o problema de jogadores estrangeiros visualizarem termos em português.
