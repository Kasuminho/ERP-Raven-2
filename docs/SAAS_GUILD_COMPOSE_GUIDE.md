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
DISCORD_GUILD_ID=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_STAFF_ROLE_ID=
```

Inclua tambem os webhooks da guilda cliente, sempre apenas no env real.

## Checklist para nova guilda

1. Criar database e usuario PostgreSQL restrito.
2. Criar `icontainer-guilda.env` fora do Git.
3. Copiar o Compose da G3X para `docker-compose.guilda.yml`.
4. Alterar containers, portas, uploads, env file e URLs publicas.
5. Criar DNS e rota do proxy para as portas da nova guilda.
6. Configurar OAuth do Discord com o callback da nova guilda.
7. Validar Compose:

```bash
docker compose -f docker-compose.guilda.yml --env-file icontainer-guilda.env config
```

8. Subir:

```bash
docker compose -f docker-compose.guilda.yml --env-file icontainer-guilda.env up -d
```

9. Verificar health:

```bash
curl https://guilda.exemplo.com/api/v1/health
```

10. Testar login Discord e upload de imagem.
