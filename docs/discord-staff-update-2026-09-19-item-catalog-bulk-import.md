# Atualização Staff: Importação em Lote via Print (OCR) & Suporte a Itens Comuns

**PT-BR**
### 📷 Importação em Lote por Print (OCR) & Validação de Duplicatas no Catálogo

O Catálogo de Itens (`/dashboard/admin/items`) foi atualizado com suporte a extração automática por prints do jogo e suporte nativo a itens de fase inicial do Servidor Zero:

1. **Leitor Óptico de Prints (OCR Client-Side)**:
   - Novo botão **"📷 Importar por Print / Lote (OCR)"** no cabeçalho do catálogo.
   - Suporte completo a **colar print com `Ctrl+V`**, arrastar arquivo ou selecionar imagem da tela de inventário, baú ou craft do Raven 2.
   - Reconhecimento óptico com `tesseract.js` processado diretamente no navegador do usuário, com alta velocidade e sem consumir processamento do servidor.
   - Visualização split-screen com o print à esquerda e a tabela de dados à direita para rápida conferência visual.

2. **Validação Inteligente de Duplicatas em Tempo Real**:
   - Cada linha extraída pelo OCR ou colada em texto é checada instantaneamente contra o banco de dados.
   - Identificação com badges visuais: `✨ Novo` (liberado para cadastro) vs `⚠️ Já existe` (item já presente no catálogo, desmarcado por padrão para impedir duplicidade acidental).

3. **Entrada Alternativa por Lista em Texto**:
   - Aba alternativa para colar listas diretas de nomes (um por linha) copiadas de chats ou planilhas.
   - Limpeza automática de prefixos e sufixos de contagem (`+0`, `Lv.`, `x10`, etc.).

4. **Suporte a Itens Brancos (Comuns) e Verdes (Incomuns) - Servidor Zero**:
   - O catálogo agora suporta itens de categoria `common` (branco) e `uncommon` (verde), além de `material`, sem a exigência de `itemTier` de endgame (`T2/T3/T4`).
   - Prepara o sistema para as futuras regras de DKP do Servidor Zero voltadas para requisições de itens brancos e materiais básicos de progressão de guilda.
