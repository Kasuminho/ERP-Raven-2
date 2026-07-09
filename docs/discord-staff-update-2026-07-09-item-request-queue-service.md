# Requests com servico de fila separado

**PT-BR**

- A proxima fatia do roadmap 2026-07 foi publicada: forecast de fila, sugestoes de troca e prioridade de material dos requests agora ficam em `ItemRequestQueueService`.
- `ItemRequestsService` continua cuidando do fluxo principal de pedido, entrega, auditoria e notificacao, sem carregar o calculo pesado de fila no mesmo arquivo.
- Nao muda regra de fila, entrega, prioridade T3, visibilidade de players nem payload publico; e refactor de ownership com teste direto de regressao.
- O deploy foi verificado em producao com `/health` respondendo a versao `3a5cf8a`.

**Aristolfo tirou a planilha mental da fila do meio do servico principal. A fila segue julgando todo mundo, mas agora em sala propria.**
