# Recibo interno de changelog Staff

**PT-BR**

- A proxima fatia do roadmap 2026-07 foi publicada: envios reais de changelog Staff agora gravam recibo interno sanitizado.
- O recibo usa `DiscordWebhookDelivery` com `action=STAFF_CHANGELOG_SENT`, arquivo, titulo, contagem de mensagens/embeds e status `SENT`.
- Nenhuma URL de webhook e gravada; o painel de deploy passa a marcar o changelog como concluido quando encontra recibo do arquivo mais recente.
- O deploy foi verificado em producao com `/health` respondendo a versao `d2a987e`.

**Aristolfo, 570 anos de webhook:** agora o changelog sai com carimbo interno. Burocracia, mas da que presta.
