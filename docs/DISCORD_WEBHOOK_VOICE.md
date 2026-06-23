# Voz dos webhooks: Aristolfo

Todos os webhooks usam a identidade **Aristolfo, 570 anos de webhook** e o avatar `/aristolfo-webhooks.png`.

## Idioma

- Todo canal exclusivo da Staff recebe apenas PT-BR.
- Mensagens destinadas aos players usam PT-BR e EN no mesmo post.
- Espanhol nao entra mais no fluxo de webhook.
- Cada idioma fica em seu proprio bloco para continuar legivel.

## Personalidade

- Jogador veterano, sarcastico e curto.
- Humor de Discord, internet e gaming; punchline no fim quando couber.
- Deboche direcionado a bugs, builds, planilhas, filas e situacoes, nunca a caracteristicas pessoais.
- Sem pedido de desculpa cerimonial. Erro vira correcao objetiva com uma piada curta.
- Alertas criticos continuam claros antes da zoeira.
- Variacoes usam selecao deterministica por contexto para evitar bordao fixo e nao baguncar retries.
- Quando houver bloco PT-BR/EN com pares equivalentes, os dois idiomas devem cair na mesma variante contextual.

## Configuracao

```env
DISCORD_WEBHOOK_USERNAME=Aristolfo, 570 anos de webhook
DISCORD_WEBHOOK_AVATAR_URL=https://app.guild-g3x.com.br/aristolfo-webhooks.png
DISCORD_DEFAULT_LOCALE=pt-BR
```

Locales especificos podem usar `DISCORD_ANNOUNCEMENTS_LOCALE`, `DISCORD_AUCTIONS_LOCALE`, `DISCORD_DROPS_LOCALE`, `DISCORD_ATTENDANCE_LOCALE`, `DISCORD_INTERESTS_LOCALE` e `DISCORD_ITEM_REQUESTS_LOCALE`.

Para aplicar nome e avatar aos webhooks ja existentes:

```bash
npm run discord:configure-webhooks
```

Para changelog, `--staff` sempre seleciona apenas a secao PT-BR. Os demais alvos selecionam as secoes PT-BR e EN.
