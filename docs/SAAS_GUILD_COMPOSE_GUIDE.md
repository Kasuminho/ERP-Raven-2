# Guia de Compose por guilda

Este guia descreve como criar uma nova instancia Raven para outra guilda usando
um arquivo Compose proprio. A G3X continua com o Compose atual; novas guildas
devem ganhar arquivos separados, revisaveis e explicitos.

Nao registrar senhas, tokens, URLs completas de webhooks ou conteudo real de
env neste documento.

## Estrategia

- Um Compose por guilda.
- Uma API por guilda.
- Uma Web por guilda.
- Um volume/pasta de uploads por guilda.
- Um env file por guilda.
- Uma database PostgreSQL por guilda.
- Um usuario PostgreSQL por guilda, com acesso apenas a database dela.
- Um conjunto proprio de credenciais Discord e webhooks por guilda.
- Um diretorio de backups e marcador de backup verificado por guilda.
- Smoke, rollback e backup sempre executados com variaveis apontando para a
  guilda alvo.

Nao e necessario subir um PostgreSQL Docker novo para cada cliente se a VPS ja
tem um PostgreSQL operacional. O isolamento minimo aceitavel e database separada
mais usuario restrito por guilda.

## Banco compartilhado com isolamento por database

Exemplo para uma guilda chamada `guilda_teste`.

Conecte como usuario administrativo do PostgreSQL e rode, trocando os nomes e a
senha por valores reais fora do Git:

```sql
CREATE USER guilda_teste_app WITH PASSWORD 'trocar_fora_do_git';
CREATE DATABASE guilda_teste OWNER guilda_teste_app;

\connect guilda_teste

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO guilda_teste_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO guilda_teste_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO guilda_teste_app;
```

O `DATABASE_URL` da API dessa guilda deve apontar para a database propria:

```env
DATABASE_URL=postgresql://guilda_teste_app:SENHA@HOST:5432/guilda_teste?schema=public&connection_limit=8&pool_timeout=10
```

Guarde esse valor apenas no env real da guilda, por exemplo `icontainer-guilda-teste.env`.

## Compose da G3X atual

O Compose atual da G3X pode continuar como esta, usando:

- `container_name: guild-api`;
- `container_name: guild-web`;
- `container_name: guild-watchtower`;
- `env_file: icontainer.env`;
- upload em `/srv/guild/uploads`;
- banco `guild_platform`.

## Compose para uma nova guilda

Copie o Compose da G3X para um novo arquivo, por exemplo:

```text
docker-compose.guilda-teste.yml
```

Altere no novo arquivo:

- nomes de containers;
- env file;
- portas host;
- pasta de uploads;
- `NEXT_PUBLIC_API_URL`;
- nome do Watchtower;
- rotas no proxy/OpenResty/ICP;
- database e usuario no env real.

Exemplo baseado no Compose atual:

```yaml
networks:
  icontainer-network:
    external: true

services:
  api:
    image: ghcr.io/kasuminho/erp-raven-2-api:latest
    container_name: guilda-teste-api
    restart: unless-stopped
    labels:
      com.centurylinklabs.watchtower.enable: 'true'
    env_file:
      - icontainer-guilda-teste.env
    environment:
      NODE_ENV: production
      PORT: 3000
    ports:
      - '127.0.0.1:3010:3000'
    networks:
      - icontainer-network
    volumes:
      - /srv/guilda-teste/uploads:/app/uploads
      - /srv/guilda-teste/backups:/app/backups:ro

  web:
    image: ghcr.io/kasuminho/erp-raven-2-web:latest
    container_name: guilda-teste-web
    restart: unless-stopped
    labels:
      com.centurylinklabs.watchtower.enable: 'true'
    env_file:
      - icontainer-guilda-teste.env
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://guilda-teste.exemplo.com/api/v1
    ports:
      - '127.0.0.1:5180:5173'
    depends_on:
      - api
    networks:
      - icontainer-network

  watchtower:
    image: containrrr/watchtower:latest
    container_name: guilda-teste-watchtower
    restart: unless-stopped
    environment:
      DOCKER_API_VERSION: '1.40'
      WATCHTOWER_LABEL_ENABLE: 'true'
      WATCHTOWER_CLEANUP: 'true'
      WATCHTOWER_INCLUDE_RESTARTING: 'true'
      WATCHTOWER_POLL_INTERVAL: 300
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - icontainer-network
```

## Env real da nova guilda

O arquivo `icontainer-guilda-teste.env` deve ficar fora do Git e conter pelo
menos:

```env
DATABASE_URL=postgresql://guilda_teste_app:SENHA@HOST:5432/guilda_teste?schema=public&connection_limit=8&pool_timeout=10
JWT_SECRET=valor_unico_fora_do_git
JWT_EXPIRES_IN=12h
PUBLIC_APP_URL=https://guilda-teste.exemplo.com
CORS_ORIGIN=https://guilda-teste.exemplo.com
NEXT_PUBLIC_API_URL=https://guilda-teste.exemplo.com/api/v1
DISCORD_CALLBACK_URL=https://guilda-teste.exemplo.com/api/v1/auth/discord/callback
IMAGE_STORAGE_PROVIDER=local
UPLOADS_HOST_DIR=/srv/guilda-teste/uploads
BACKUP_DIR=/srv/guilda-teste/backups
BACKUP_STATUS_FILE=/app/backups/last-verified-backup.json
BACKUP_MAX_AGE_HOURS=26
DISCORD_GUILD_ID=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_STAFF_ROLE_ID=
```

Inclua tambem os webhooks da guilda cliente, sempre apenas no env real.

## Pre-flight sem segredo

Antes de subir uma nova guilda, revise estes pontos sem colar valores reais em
docs, tickets ou changelogs:

- slug operacional escolhido, por exemplo `guilda-teste`;
- dominio publico e callback OAuth aprovados;
- arquivo Compose exclusivo revisado por humano;
- env real criado fora do Git, com nome da guilda no arquivo;
- database e usuario PostgreSQL restrito criados;
- portas host sem colisao com G3X ou outra guilda;
- diretorios de uploads e backups criados com permissao para os containers;
- aplicacao Discord separada ou configuracao OAuth propria da guilda;
- webhooks/canais da guilda cliente configurados apenas no env real;
- comando de smoke definido com `SMOKE_BASE_URL`/`PRODUCTION_BASE_URL` da
  guilda;
- comando de backup/restore definido com `POSTGRES_CONTAINER`, `POSTGRES_DB` e
  `POSTGRES_USER` da guilda.

Rode tambem o dry-run local da stack antes de executar `up -d`. O comando le o
Compose e o env real, mas imprime apenas nomes de variaveis, caminhos e
diagnosticos sanitizados:

```bash
npm run guild:dry-run -- --guild guilda-teste --compose docker-compose.guilda-teste.yml --env-file icontainer-guilda-teste.env --base-url https://guilda-teste.exemplo.com --uploads-dir /srv/guilda-teste/uploads --backups-dir /srv/guilda-teste/backups --postgres-db guilda_teste --postgres-user guilda_teste_app
```

Use `--skip-docker` somente quando o host local nao tiver Docker disponivel; no
servidor final, deixe o script rodar `docker compose config --quiet`.

O dry-run falha quando encontra risco claro de reusar G3X por engano, como
containers `guild-api`/`guild-web`, dominio `app.guild-g3x.com.br`, diretorios
`/srv/guild/...` ou database `guild_platform` em uma guilda que nao seja G3X.

## Checklist para nova guilda

1. Criar database e usuario PostgreSQL restrito.
2. Criar diretorios isolados de uploads e backups.
3. Criar `icontainer-guilda.env` fora do Git.
4. Copiar o Compose da G3X para `docker-compose.guilda.yml`.
5. Alterar containers, portas, uploads, backups, env file e URLs publicas.
6. Criar DNS e rota do proxy para as portas da nova guilda.
7. Configurar OAuth do Discord com o callback da nova guilda.
8. Configurar webhooks/canais da guilda somente no env real.
9. Rodar o dry-run da stack por guilda:

```bash
npm run guild:dry-run -- --guild guilda --compose docker-compose.guilda.yml --env-file icontainer-guilda.env --base-url https://guilda.exemplo.com --uploads-dir /srv/guilda/uploads --backups-dir /srv/guilda/backups --postgres-db guilda --postgres-user guilda_app
```

10. Validar Compose:

```bash
docker compose -f docker-compose.guilda.yml --env-file icontainer-guilda.env config
```

11. Subir:

```bash
docker compose -f docker-compose.guilda.yml --env-file icontainer-guilda.env up -d
```

12. Rodar migrations/generate contra a database da guilda:

```bash
DATABASE_URL=postgresql://... npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
DATABASE_URL=postgresql://... npx prisma generate --schema packages/database/prisma/schema.prisma
```

Use valores reais apenas no shell/env local, nunca neste arquivo.

13. Verificar health:

```bash
curl https://guilda.exemplo.com/api/v1/health
```

14. Rodar smoke publico da guilda:

```bash
PRODUCTION_BASE_URL=https://guilda.exemplo.com scripts/prod/smoke-production.sh
SMOKE_BASE_URL=https://guilda.exemplo.com/api/v1 npm run smoke:auth
```

Use `SMOKE_AUTH_TOKEN`/`SMOKE_BEARER_TOKEN` apenas no env local quando houver
conta de automacao Staff/Admin da guilda.

15. Testar login Discord, upload de imagem e abertura de `/uploads/...`.
16. Rodar primeiro backup e verificacao de restore em arquivo temporario:

```bash
POSTGRES_CONTAINER=CONTAINER_POSTGRES POSTGRES_DB=guilda scripts/prod/backup-postgres.sh
POSTGRES_CONTAINER=CONTAINER_POSTGRES POSTGRES_DB=guilda scripts/prod/verify-backup.sh BACKUP_DA_GUILDA
```

17. Registrar o marcador `last-verified-backup.json` no diretorio de backups da
    guilda e confirmar health privado.
18. Registrar tag/SHA inicial para rollback e testar o comando em janela
    controlada antes de cliente externo.

## Operacao por guilda

Use sempre variaveis explicitas para evitar operar a G3X por acidente:

```bash
COMPOSE_FILE=docker-compose.guilda.yml scripts/prod/deploy-images.sh GIT_SHA
COMPOSE_FILE=docker-compose.guilda.yml scripts/prod/rollback-images.sh
PRODUCTION_BASE_URL=https://guilda.exemplo.com scripts/prod/smoke-production.sh
POSTGRES_CONTAINER=CONTAINER_POSTGRES POSTGRES_DB=guilda scripts/prod/backup-postgres.sh
```

Se qualquer comando mostrar container, database, dominio ou diretorio da G3X,
pare e revise o env antes de continuar.
