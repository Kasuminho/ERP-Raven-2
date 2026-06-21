# AGENTS.md

Este arquivo define o contrato de trabalho para qualquer agente Codex neste repositorio.

## Inicio de toda tarefa

1. Leia `AGENTS.md` e `WIKI.md` antes de planejar ou editar.
2. Confira `git status --short`, `git log -3 --oneline` e, quando houver rede, compare com `origin/master` antes de editar.
3. Nao presuma que o checkout local esta atualizado: automacoes podem publicar commits em worktrees separadas.
4. Nao reverta mudancas existentes do usuario nem sobrescreva commits remotos mais novos.
5. Use o codigo e os documentos atuais como fonte de verdade. O wiki orienta, mas nao substitui a leitura dos arquivos afetados.
6. Consulte o historico Git e os changelogs quando a tarefa envolver comportamento ou comunicacao ja alterados recentemente.

## Memoria viva obrigatoria

Atualize `WIKI.md` no mesmo trabalho sempre que houver mudanca relevante em:

- arquitetura, banco, migracoes, endpoints ou contratos;
- regras de negocio ou permissoes;
- fluxos de Staff ou players;
- webhooks, idiomas, identidade ou canais;
- deploy, infraestrutura, scripts ou automacoes;
- decisoes que um proximo chat precisaria redescobrir.

Ao atualizar o wiki:

- altere a secao tematica correspondente;
- atualize `Ultima revisao`;
- acrescente uma linha curta em `Historico recente`;
- documente o estado final, nao a conversa nem tentativas intermediarias;
- remova informacao obsoleta em vez de apenas acumular contradicoes.

Mudancas triviais de estilo, typo ou texto isolado nao exigem alterar o wiki.

## Seguranca documental

- Nunca grave senhas, tokens, cookies, URLs completas de webhooks ou conteudo de `.env` no wiki, changelog ou commit.
- Pode registrar apenas o nome da variavel de ambiente e a finalidade.
- Webhooks compartilhados em conversa devem ser tratados como segredo.

## Regras permanentes do produto

- Conteudo exclusivo da Staff: somente PT-BR.
- Conteudo destinado aos players: PT-BR e EN, em blocos separados.
- Todos os webhooks usam `Aristolfo, 570 anos de webhook` e o avatar configurado.
- Humor curto, sarcastico, gamer e saudavel; clareza operacional vem antes da piada.
- Ranking, bids, locks e identidade dos participantes de leilao sao sigilosos para players ate o resultado/entrega. Staff autorizada pode consultar.
- Cada boss possui evento, presenca e DKP independentes, mesmo quando criado em lote.

## Padrao de implementacao

- Respeite os padroes existentes de NestJS, Next.js, Prisma e React Query.
- Use `rg`/`rg --files` para busca e `apply_patch` para edicoes manuais.
- Evite refatoracao fora do escopo e nao sobrescreva trabalho alheio.
- Toda alteracao de schema Prisma precisa de migration versionada.
- Preserve compatibilidade de API quando possivel; quando o contrato mudar, atualize API, Web e `WIKI.md` juntos.

## Validacao minima

Conforme o escopo, execute:

```powershell
npx.cmd prisma validate --schema packages/database/prisma/schema.prisma
npx.cmd prisma generate --schema packages/database/prisma/schema.prisma
npm.cmd run lint
npm.cmd run build --workspace apps/api
npm.cmd run build --workspace apps/web
```

O warning conhecido em `eligibility.service.ts` sobre o argumento `client` nao usado e anterior; nao trate como falha da tarefa sem relacao.

## Protocolo de entrega

Quando o usuario autorizar o protocolo completo:

1. Validar codigo e revisar `git diff --check`.
2. Criar commit objetivo e enviar para `master`.
3. Confirmar o GitHub Actions `Build Docker images`.
4. Aguardar o Watchtower e verificar producao por um sinal especifico da mudanca.
5. Enviar changelog da Staff somente em PT-BR, apenas depois da verificacao de producao.
6. Atualizar `WIKI.md` antes do commit final.

Leia `docs/ICP_DOCKER_IMAGES.md` e `docs/DISCORD_WEBHOOK_VOICE.md` para detalhes.
