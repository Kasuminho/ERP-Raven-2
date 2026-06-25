# Roadmap SaaS single-tenant por guilda

Este plano transforma o Raven em um produto empacotavel por guilda, mantendo uma
instancia isolada de Web, API, PostgreSQL e uploads para cada cliente. A guilda
G3X continua sendo a primeira instalacao, nao o modelo rigido do produto.

Nao enviar changelog no Discord da G3X para este trabalho enquanto ele estiver
em fase de descoberta, documentacao ou infraestrutura SaaS interna.

## Decisao de arquitetura

O MVP SaaS deve usar single-tenant operacional:

- um arquivo Compose por guilda;
- uma database PostgreSQL por guilda;
- um volume de uploads por guilda;
- variaveis de ambiente e integracao Discord por guilda;
- dominio ou subdominio por guilda;
- deploy, backup, restore, smoke e rollback executaveis por guilda.

Nao iniciar com banco multi-tenant compartilhado. O schema atual nao possui
`tenantId`/`guildId` em todos os modelos operacionais, e o produto ja funciona
bem como uma aplicacao single-guild.

## Modelo alvo

```text
docker-compose.g3x.yml
  guild-api
  guild-web
  guild-postgres
  guild-watchtower
  /srv/guild/uploads
  ./backups ou /srv/guild/backups

docker-compose.guilda-a.yml
  guilda-a-api
  guilda-a-web
  database `guilda_a` no PostgreSQL compartilhado
  guilda-a-watchtower
  /srv/guilda-a/uploads
  /srv/guilda-a/backups

docker-compose.guilda-b.yml
  guilda-b-api
  guilda-b-web
  database `guilda_b` no PostgreSQL compartilhado
  guilda-b-watchtower
  /srv/guilda-b/uploads
  /srv/guilda-b/backups
```

Cada Compose deve ser explicito. Nada de uma camada generica que muda nomes de
container por env escondido. Para uma nova guilda, criar um novo Compose,
revisar o arquivo e so entao subir a stack.

## Principios

- Isolamento vence elegancia: nenhuma guilda deve depender da database, uploads
  ou webhooks de outra.
- Compose explicito vence magia: cada guilda deve ter um arquivo facil de ler,
  revisar e operar.
- Sem segredos em Git: documentar nomes de variaveis, nunca valores.
- G3X vira preset: regras, textos e voz atuais podem ser o primeiro template,
  mas o produto precisa aceitar outras guildas.
- Operacao antes de venda: backup, restore, health, rollback e smoke precisam
  existir antes de cliente externo.

## Fase 0 - Inventario e limites

Objetivo: saber onde o Raven ainda e G3X por acoplamento direto.

Entregas:

- inventario de dominios, nomes de container, paths e scripts fixos;
- inventario de variaveis obrigatorias por instancia;
- inventario de textos/branding G3X ou Aristolfo que precisam virar preset;
- decisao sobre quais guias historicos continuam G3X e quais viram docs do
  produto.

Achados iniciais:

- `docker-compose.icp-images.yml` e `docker-compose.prod.yml` sao a base G3X;
- o proximo passo nao e parametrizar esses arquivos por env, e sim criar um
  Compose separado para uma guilda teste;
- o PostgreSQL pode ser compartilhado na mesma VPS, desde que cada guilda use
  database e usuario restrito proprios;
- `scripts/prod/backup-postgres.sh`, `restore-postgres.sh` e
  `verify-backup.sh` ja aceitam variaveis para container/banco quando for
  necessario operar uma stack especifica;
- `scripts/prod/smoke-production.sh` ja aceita `PRODUCTION_BASE_URL`;
- `apps/web/src/lib/public-api-url.ts` contem fallback especifico para o dominio
  publico atual;
- documentos de deploy e monitoramento ainda descrevem a instalacao G3X como
  caminho principal.

## Fase 1 - Compose de guilda teste

Objetivo: criar uma stack explicita para validar o modelo sem tocar na G3X.

Entregas:

- criar `docker-compose.guilda-teste.yml`;
- escolher portas host diferentes das portas da G3X;
- definir nomes fixos e explicitos para containers da guilda teste;
- definir volume/pasta de uploads proprio;
- definir banco proprio;
- criar usuario PostgreSQL restrito a database da guilda;
- documentar `.env.production` esperado sem valores reais;
- validar com `docker compose -f docker-compose.guilda-teste.yml config`.

Validacao:

- Compose renderiza sem erro;
- nenhum segredo real aparece no arquivo;
- os nomes de container nao conflitam com G3X;
- os volumes/pastas nao conflitam com G3X;
- o arquivo pode ser revisado manualmente antes de subir.

## Fase 2 - Operacao por guilda

Objetivo: conseguir manter varias guildas sem operacao artesanal demais.

Comandos devem receber explicitamente o Compose ou as variaveis necessarias:

```bash
COMPOSE_FILE=docker-compose.guilda-teste.yml scripts/prod/deploy-images.sh TAG
PRODUCTION_BASE_URL=https://guilda-teste.example.com scripts/prod/smoke-production.sh
POSTGRES_CONTAINER=CONTAINER_POSTGRES_EXISTENTE POSTGRES_DB=guilda_teste scripts/prod/backup-postgres.sh
```

Entregas:

- update de uma guilda especifica;
- rollback de uma guilda especifica;
- backup e restore por guilda;
- smoke por guilda;
- runbook de incidente por guilda.

## Fase 3 - Produto configuravel

Objetivo: reduzir customizacao manual por cliente.

Areas que devem virar configuracao/preset:

- nome da guilda e identidade visual;
- identidade dos webhooks;
- idioma dos posts de players e Staff;
- cargos Discord mapeados para Staff/Admin/Membro;
- canais e webhooks Discord;
- regras de DKP;
- tipos de evento e bosses;
- regras de leilao, ALL_IN e Staff Review;
- catalogo inicial de itens;
- textos de guias e politicas publicas.

Cuidados:

- Aristolfo pode continuar como preset G3X ou preset Raven, mas nao deve ser a
  unica identidade possivel para todos os clientes;
- conteudo historico da G3X nao deve virar seed default de cliente novo;
- contratos publicos de API devem continuar compativeis enquanto a configuracao
  for introduzida.

## Fase 4 - Painel SaaS central

Objetivo: operar clientes sem entrar por SSH para tarefas rotineiras.

Primeira versao:

- listar guildas;
- exibir dominio, versao, status e ultimo backup;
- registrar plano/status comercial manual;
- disparar smoke;
- disparar backup;
- marcar manutencao;
- guardar notas operacionais sem segredos.

Nao incluir no primeiro painel:

- billing automatico;
- multi-tenant no banco do Raven operacional;
- edicao livre de regras complexas;
- acesso aos dados internos das guildas clientes sem necessidade operacional.

## Backlog tecnico inicial

1. Feito: criar `docs/SAAS_SINGLE_TENANT_ROADMAP.md`.
2. Criar `docker-compose.guilda-teste.yml` explicito.
3. Criar `.env.guilda-teste.example` sem segredos reais.
4. Validar `docker compose -f docker-compose.guilda-teste.yml config`.
5. Rodar migrations e seed limpo em `guilda-teste`.
6. Validar OAuth Discord em aplicacao separada.
7. Validar backup, restore e smoke da instancia teste.
8. Remover fallbacks G3X do codigo runtime.
9. Documentar preset G3X separado de preset generico.

## Criterio de pronto para piloto externo

- Uma guilda nova sobe a partir de Compose proprio e revisado.
- Cada guilda tem database, usuario PostgreSQL, uploads e backups independentes.
- Update e rollback funcionam por guilda.
- Smoke confirma login e health no dominio da guilda.
- Restore foi testado pelo menos uma vez em banco temporario.
- Discord OAuth e webhooks usam credenciais da propria guilda.
- G3X permanece sem regressao.
- Nenhum segredo foi documentado ou commitado.
