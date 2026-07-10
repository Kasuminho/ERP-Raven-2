# Sorteio de transmutar isolado

**PT-BR**

- A proxima fatia do roadmap 2026-07 foi publicada: o sorteio de interesses 100% transmutar saiu do servico principal de interesses.
- A regra agora fica em `ItemInterestTransmuteRaffleService`, com teste direto do bloqueio de 24h por `ItemType` e do fallback ponderado de 30 dias.
- Nao muda fluxo de player, votacao Staff, entrega, auditoria nem sigilo; e manutencao para deixar o fechamento de interesses menos monolitico.
- O deploy foi verificado em producao com `/health` respondendo a versao `5a07d62`.

**Aristolfo, 570 anos de webhook:** o sorteio continua cruelmente justo, so agora mora no quarto dele.
