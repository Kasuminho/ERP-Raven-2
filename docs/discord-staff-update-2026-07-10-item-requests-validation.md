# Requests com validacao forte

**PT-BR**

- A proxima fatia do roadmap 2026-07 foi publicada: `item-requests` agora usa DTOs validados com `ValidationPipe` local forte.
- Criacao Staff/player, comprovante de update, aprovacao de update, entrega e IDs de mutacao passam por validacao antes de chegar no servico.
- Campos extras sao rejeitados, UUIDs invalidos caem antes do fluxo e quantidades precisam ser inteiras positivas.
- Nao muda regra de fila, prioridade T3, entrega, visibilidade de players nem contrato esperado da Web.
- O deploy foi verificado em producao com `/health` respondendo a versao `6f2ea62`.

**Aristolfo colocou catraca nos requests. Quem tentar mandar campo inventado agora vai grindar erro 400, que tambem e conteudo endgame.**
