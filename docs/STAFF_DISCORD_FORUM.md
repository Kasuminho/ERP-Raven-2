# Central da Staff no Discord

Publicador idempotente do forum interno de tutoriais da Staff do ERP Raven 2.

## Alvo atual

- Servidor configurado por `DISCORD_GUILD_ID`.
- Categoria: `1528829674166423552` (`staff`).
- Forum: `🛡️・central-da-staff`.
- Idioma: somente PT-BR.
- Acesso: `@everyone` bloqueado; cargo configurado por `DISCORD_STAFF_ROLE_ID` autorizado a visualizar, criar e responder.

O token e carregado de `DISCORD_BOT_TOKEN`; nunca deve ser gravado neste documento, no Git ou em logs.

## Manutencao

O conteudo fica em `scripts/staff-forum-content.js`. As imagens sao geradas de forma deterministica com a identidade visual interna do Aristolfo:

```powershell
npm.cmd run discord:staff-forum:assets
npm.cmd run discord:staff-forum -- --dry-run
npm.cmd run discord:staff-forum
```

O publicador procura o forum e os posts pelos nomes canonicos. Quando ja existem, atualiza mensagem inicial, imagem e tag sem duplicar. Ele opera somente no forum nomeado dentro da categoria configurada e nao remove canais ou posts extras.

## Obrigacao em mudancas de fluxo

Toda implementacao que altere uma jornada operacional visivel da Staff deve atualizar `scripts/staff-forum-content.js` no mesmo trabalho. Atualize um post existente quando a jornada continuar a mesma; crie um post novo quando surgir uma jornada independente.

Regenerar assets e executar o `--dry-run` faz parte da validacao anterior ao commit. A sincronizacao live deve ocorrer somente depois de a mudanca estar verificada em producao. Depois do envio, confirme texto somente PT-BR, imagem, links, indice, tag e permissoes Staff-only pela API do Discord.
