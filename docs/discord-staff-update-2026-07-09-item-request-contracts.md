# Contratos de requests compartilhados

**PT-BR**

- A proxima fatia do roadmap 2026-07 foi publicada: contratos de item-requests agora vivem em `packages/shared`.
- API e Web usam os mesmos tipos para request, forecast de fila, sugestoes de troca e prioridade de material T3.
- Nao muda regra de fila, entrega, prioridade T3, visibilidade de players nem fluxo do player; e manutencao para reduzir divergencia entre servidor e Web.
- O deploy foi verificado em producao com `/health` respondendo a versao `c2e35ce`.

**Aristolfo alinhou os contratos dos pedidos. A fila continua cruel, mas agora pelo menos o TypeScript sofre em silencio organizado.**
