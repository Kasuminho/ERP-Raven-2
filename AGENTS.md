# AGENTS.md

Este arquivo define o contrato de trabalho para qualquer agente Codex neste repositorio.

## Inicio de toda tarefa

1. Leia `AGENTS.md` e `WIKI.md` antes de planejar ou editar.
2. Confira `git status --short`, `git log -3 --oneline` e, quando houver rede, compare com `origin/master` antes de editar.
3. Nao presuma que o checkout local esta atualizado: automacoes podem publicar commits em worktrees separadas.
4. Nao reverta mudancas existentes do usuario nem sobrescreva commits remotos mais novos.
5. Use o codigo e os documentos atuais como fonte de verdade. O wiki orienta, mas nao substitui a leitura dos arquivos afetados.
6. Consulte o historico Git e os changelogs quando a tarefa envolver comportamento ou comunicacao ja alterados recentemente.

## Controle anti-reexecucao de roadmaps

Antes de executar qualquer roadmap vivo, especialmente
`docs/RAVEN2_PRODUCT_IMPROVEMENT_PROGRAM.md`:

1. Classifique os itens como `implementado`, `parcial`, `pendente` ou `futuro`.
2. Trate blocos `Estado em ...` como fonte de verdade documental ate prova em contrario.
3. Confira `git log --oneline -- ARQUIVO` e os arquivos citados antes de implementar.
4. Nao execute uma "ordem sugerida" historica sem confirmar a proxima pendencia real.
5. Se a tarefa for criar nova rodada de melhorias, produza primeiro um roadmap novo e pare; nao comece a programar sem pedido explicito.

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

## Sincronizacao obrigatoria dos tutoriais Discord

Toda nova implementacao ou alteracao que mude um fluxo visivel do site deve atualizar, no mesmo trabalho, a Central correspondente no Discord.

1. Classifique o impacto como `player`, `Staff`, `ambos` ou `sem impacto de tutorial`.
2. Se a mudanca ampliar uma jornada existente, atualize o post canonico. Se criar uma jornada independente, publique um tutorial ou passo novo.
3. Fluxos de player usam `scripts/player-forum-content.js`; mantenha PT-BR e EN em blocos separados.
4. Fluxos Staff usam `scripts/staff-forum-content.js`; mantenha somente PT-BR.
5. Atualize texto, rota, ordem dos passos, alertas, regras e imagem sempre que algum deles deixar de representar o site real.
6. Regenere as imagens e valide o publicador antes do commit:

```powershell
npm.cmd run discord:player-forum:assets
npm.cmd run discord:player-forum -- --dry-run
npm.cmd run discord:staff-forum:assets
npm.cmd run discord:staff-forum -- --dry-run
```

Execute apenas os comandos da audiencia afetada. Mudancas que alcancem os dois publicos exigem as duas centrais.

- Nao publique no Discord um fluxo que ainda nao esteja disponivel em producao.
- No protocolo completo, sincronize o forum afetado somente depois de verificar a mudanca em producao e antes do changelog final.
- Depois da sincronizacao, confirme post/indice, imagem, idioma, links, tags e permissoes pela API do Discord.
- Se o usuario nao autorizou deploy/publicacao, deixe texto e assets canonicos atualizados no codigo, informe que a sincronizacao live ficou pendente e nao descreva o fluxo futuro como ja disponivel.
- Mudanca puramente interna, sem efeito em tela, regra percebida, permissao ou sequencia operacional, pode ser classificada como `sem impacto de tutorial`; registre essa conclusao na entrega.
- Nao conclua uma tarefa com fluxo visivel novo ou alterado deixando o tutorial correspondente desatualizado.

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

1. Atualizar codigo, `WIKI.md`, guias e o conteudo canonico dos tutoriais Discord afetados.
2. Regenerar assets de tutorial, executar os `--dry-run` aplicaveis, validar codigo e revisar `git diff --check`.
3. Criar commit objetivo e enviar para `master`.
4. Confirmar o GitHub Actions `Build Docker images`.
5. Aguardar o Watchtower e verificar producao por um sinal especifico da mudanca.
6. Sincronizar cada Central Discord afetada e verificar post, imagem, links, tags, idioma e permissoes.
7. Enviar changelog da Staff somente em PT-BR, depois das verificacoes de producao e dos tutoriais.

Leia `docs/ICP_DOCKER_IMAGES.md`, `docs/DISCORD_WEBHOOK_VOICE.md`, `docs/PLAYER_DISCORD_FORUM.md` e `docs/STAFF_DISCORD_FORUM.md` para detalhes.
