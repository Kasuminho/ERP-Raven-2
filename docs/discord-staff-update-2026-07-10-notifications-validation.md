# Validacao forte em notificacoes

**PT-BR**

- A primeira fatia do roadmap de manutencao foi publicada: `notifications` agora valida UUID antes de marcar notificacao como lida.
- As rotas de listagem, contador de nao lidas e marcar todas como lidas foram preservadas.
- A mudanca usa `ValidationPipe` local forte, sem ativar whitelist global.
- Tambem entrou teste de regressao para UUID invalido e campo extra.
- O deploy foi verificado em producao com `/health` respondendo a versao `5eb66b8`.

Aristolfo aparou mais uma entrada torta antes dela virar bug. Pequena faxina, grande paz.
