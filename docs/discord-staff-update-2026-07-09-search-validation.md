# Busca com validação mais rígida

**PT-BR**

- A próxima fatia do roadmap 2026-07 foi publicada: o módulo `search` agora usa DTO validado com `ValidationPipe` local forte.
- A busca global aceita somente a query `q`, rejeita parâmetros extras e barra formato inválido antes de chegar no serviço.
- A busca Staff continua podendo trazer players; a busca normal continua sem expor player em resultado público.
- O deploy foi verificado em produção com `/health` respondendo a versão `6400bb2`.

**Aristolfo colocou porteiro na busca. Quem tentar entrar com parâmetro freestyle agora fica do lado de fora, reclamando com o HTML.**
