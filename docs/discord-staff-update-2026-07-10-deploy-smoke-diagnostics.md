# Diagnostico de smoke e borda no deploy

**PT-BR**

- A quinta fatia do roadmap de manutencao foi publicada: o painel Staff de deploy agora separa falha real de API, falha parcial, problema de rede/configuracao e challenge de borda/WAF.
- O smoke publico mostra outcome geral, tempo total, mensagem operacional e diagnostico por endpoint: `OK`, `Borda/WAF`, `HTTP`, `Rede` ou `Config`.
- Quando a borda desafia o runner/verificador com HTML 403, o protocolo fica como validacao manual em vez de parecer API simplesmente morta.
- O endpoint `GET /operations/staff/deploy` ganhou esses campos de diagnostico sem expor segredos, tokens ou URLs de webhook.
- O deploy foi verificado em producao com `/health` respondendo a versao `fa3a17b`.

Aristolfo colocou etiqueta no alarme: se for a porta da frente fazendo cena, nao precisa desmontar a cozinha da API.
