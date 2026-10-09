# Comandos Slash /status e /cp no Discord, OCR Raven 2 e Inspeção Staff de Buffs

**Data:** 09/10/2026  
**Público:** Staff AlcatraZ  
**Origem:** Atualização Operacional ERP Raven 2 (`87469b9`)

---

### 1. Envio de Prints Omnichannel no Discord (`/status` e `/cp`)
- **Comandos Slash Nativos:** O jogador não precisa mais abrir o navegador para atualizar seu CP. Basta digitar `/status` ou `/cp` no Discord e anexar a imagem do jogo.
- **Processamento Imediato:** O bot salva a imagem no armazenamento do ERP, identifica o vínculo com a conta do jogador e responde de forma **privada/efêmera** detalhando os atributos lidos:
  - ⚔️ Ataque, 🛡️ Defesa e 🎯 Precisão
  - ➔ CP Calculado e contagem de buffs ativos na barra inferior
  - Confirmação de que o print entrou na fila de análise da Staff.

---

### 2. Motor de OCR Especializado na HUD do Raven 2
- O sistema analisa a interface superior do Raven 2:
  - Localiza as barras de vida (HP) e mana (MP);
  - Extrai os 3 números logo abaixo do MP: **Ataque**, **Defesa** e **Precisão**;
  - Calcula automaticamente a soma oficial da guilda: `CP = Ataque + Defesa + Precisão`;
  - Pré-digita esse valor diretamente no formulário de aprovação da Staff no ERP.

---

### 3. Painel de Progresso Staff Reestruturado (`/dashboard/staff/progress`)
- **Imagem Aberta com Lightbox:** Fim dos links de texto soltos. O print do jogo é exibido diretamente no card, com opção de clique para zoom em tela cheia para inspeção minuciosa.
- **Destaque do OCR:** Card visual exibindo a decomposição da conta `(Ataque + Defesa + Precisão = CP Somado)`.
- **Inspeção de Buffs Anti-Malandragem:** O painel destaca a classe do jogador (ex: *Dagger*, *Berserker*, etc.) e exibe lembrete visual para a Staff validar se não há buffs de suporte de outra classe (ex: Dagger com buff de Healer) ou itens de evento não permitidos inflando o CP.
- **Aprovação Ágil em 1 Clique:** O campo de CP já vem pré-preenchido com o valor do OCR. Se os buffs estiverem corretos, basta 1 clique em `[✅ Aprovar CP]` para atualizar o perfil e o ranking. Em caso de irregularidade, a Staff pode ajustar o número ou rejeitar informando o motivo.

---

### 4. Centrais Discord Atualizadas
- As centrais `📚・central-player-tutorials-guias` e `🛡️・central-staff-guias` foram sincronizadas com as novas instruções operacionais de envio por comando slash e homologação rápida.
