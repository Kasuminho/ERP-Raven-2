# Central do Player no Discord

Publicador idempotente do forum bilingue de tutoriais do ERP Raven 2.

## Alvo atual

- Servidor configurado por `DISCORD_GUILD_ID`.
- Categoria: `1431340101052530829` (`G3X`).
- Forum: `📚・central-do-player`.
- Players podem responder nas threads oficiais. A criacao de novos posts fica restrita a Staff/bots com permissao administrativa para manter o indice organizado.

O token e carregado de `DISCORD_BOT_TOKEN`; nunca deve ser gravado neste documento, no Git ou em logs.

## Manutencao

O conteudo fica em `scripts/player-forum-content.js`. As imagens sao geradas de forma deterministica com a identidade visual do Aristolfo:

```powershell
npm.cmd run discord:player-forum:assets
npm.cmd run discord:player-forum -- --dry-run
npm.cmd run discord:player-forum
```

O publicador procura o forum e os posts pelos nomes canonicos. Quando ja existem, atualiza a mensagem inicial, a imagem e a tag sem duplicar o conteudo. Ele opera somente no forum de nome configurado dentro da categoria configurada e nao remove canais ou posts extras.

## Obrigacao em mudancas de fluxo

Toda implementacao que altere uma jornada visivel do player deve atualizar `scripts/player-forum-content.js` no mesmo trabalho. Atualize um post existente quando a jornada continuar a mesma; crie um post novo quando surgir uma jornada independente.

Regenerar assets e executar o `--dry-run` faz parte da validacao anterior ao commit. A sincronizacao live deve ocorrer somente depois de a mudanca estar verificada em producao. Depois do envio, confirme texto PT-BR/EN, imagem, links, indice, tag e permissoes pela API do Discord.
