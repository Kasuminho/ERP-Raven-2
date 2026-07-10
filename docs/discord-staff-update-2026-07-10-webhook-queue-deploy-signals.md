# Sinais da fila de webhooks no deploy

**PT-BR**

- A proxima fatia do roadmap 2026-07 foi publicada: o painel Staff de deploy agora mostra sinais da fila de webhooks.
- O painel exibe entregas pendentes, em envio, em retry, falhas, idade da pendencia mais antiga, ultimo retry e ultima falha.
- Nao expõe URL de webhook, token ou payload sensivel; os dados vêm de `DiscordWebhookDelivery` ja sanitizado.
- O deploy foi verificado em producao com `/health` respondendo a versao `ab1f8a8`.

**Aristolfo, 570 anos de webhook:** agora a fila aparece antes de virar lenda urbana em reunião.
