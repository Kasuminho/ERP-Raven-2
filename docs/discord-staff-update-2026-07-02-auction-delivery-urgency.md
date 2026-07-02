# Fila de entregas ganhou prioridade de verdade

**PT-BR**

- `/dashboard/staff/deliveries` agora mostra urgencia, idade, prazo e motivo operacional para cada entrega pendente de leilao.
- A fila ganhou contadores e filtros por todos, atrasados, hoje, sem prova, player/item e tier.
- O endpoint `GET /drops/pending-auction-deliveries` preserva os dados antigos e adiciona `urgency`, `ageHours`, `deliveryDueAt` e `priorityReason`.
- Dashboard Staff e modo reuniao passam a carregar idade e motivo nas tarefas `DROP_DELIVERY`.

**Aristolfo botou etiqueta vermelha no drop esquecido. Se ficar mofando, agora pelo menos mofa com holofote.**
