# Deploy ICP Integrator

Este guia sobe a plataforma G3X em uma VPS com painel ICP, usando:

- Docker/Container do painel para `api`, `web` e `postgres`
- OpenResty/SSL do ICP como proxy público
- PostgreSQL persistente em volume Docker
- Backup/restore para migrar o banco atual sem perder dados

## Recursos recomendados

A VPS informada, `4 vCPU / 6 GB RAM / 100 GB NVMe`, é suficiente para começar com tudo na mesma máquina.

## Domínio

Recomendado:

- `app.guild-g3x.com.br` apontando para o IP da VPS
- SSL ativo no ICP/OpenResty

No Cloudflare/DNS, crie:

```text
Tipo: A
Nome: app
Valor: IP_DA_VPS
Proxy: pode ficar ligado se o ICP SSL aceitar, ou DNS only se der conflito
```

## Variáveis

Na VPS, crie `.env.production` a partir de `.env.production.example`.

Pontos obrigatórios:

```text
PUBLIC_APP_URL=https://app.guild-g3x.com.br
NEXT_PUBLIC_API_URL=https://app.guild-g3x.com.br/api/v1
CORS_ORIGIN=https://app.guild-g3x.com.br
DISCORD_CALLBACK_URL=https://app.guild-g3x.com.br/api/v1/auth/discord/callback
POSTGRES_PASSWORD=uma_senha_longa_e_unica
JWT_ACCESS_SECRET=segredo_longo
JWT_REFRESH_SECRET=outro_segredo_longo
```

No Discord Developer Portal, atualize o redirect OAuth para:

```text
https://app.guild-g3x.com.br/api/v1/auth/discord/callback
```

## Subida com Container/Docker

Se o ICP permitir apontar para um arquivo Compose, use:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Se ele tiver tela separada de containers, crie os serviços equivalentes:

- `guild-postgres`
  - imagem: `postgres:16-alpine`
  - volume: `/var/lib/postgresql/data`
  - env: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `guild-api`
  - build target: `api`
  - porta interna: `3000`
  - bind host: `127.0.0.1:3000`
  - env file: `.env.production`
- `guild-web`
  - build target: `web`
  - porta interna: `5173`
  - bind host: `127.0.0.1:5173`
  - build arg: `NEXT_PUBLIC_API_URL`

## OpenResty

O proxy deve encaminhar:

- `/api/v1/*` para `http://127.0.0.1:3000`
- `/` para `http://127.0.0.1:5173`

Exemplo de server block:

```nginx
server {
  listen 80;
  server_name app.guild-g3x.com.br;

  client_max_body_size 25m;

  location /api/v1/ {
    proxy_pass http://127.0.0.1:3000/api/v1/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:5173;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Se o ICP gerenciar SSL automaticamente, aplique essa regra dentro do editor de proxy/site dele.

## Migrar o banco atual

No PC atual, com Docker local rodando:

```powershell
.\scripts\prod\export-current-db.ps1
```

Isso gera um arquivo em:

```text
backups/guild_platform_YYYYMMDD_HHMMSS.dump
```

Envie esse arquivo para a VPS.

Valide que o arquivo existe antes de mexer no banco da VPS. O arquivo `.dump` fica fora do Git por segurança.

Na VPS, com o container `guild-postgres` já de pé:

```bash
scripts/prod/restore-postgres.sh ./backups/guild_platform_YYYYMMDD_HHMMSS.dump
```

Depois recrie a API para garantir migrations:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate api
```

## Backup automático

Rode manualmente:

```bash
scripts/prod/backup-postgres.sh
```

Cron diário sugerido:

```cron
20 4 * * * cd /caminho/do/projeto && POSTGRES_CONTAINER=guild-postgres POSTGRES_DB=guild_platform POSTGRES_USER=postgres scripts/prod/backup-postgres.sh >> logs/backup.log 2>&1
```

Se o ICP tiver agendador próprio, configure o mesmo comando nele.

## Deploy de atualização

Com SSH liberado:

```bash
git pull
scripts/prod/deploy.sh
```

Sem SSH, pelo painel:

1. Envie o código atualizado ou conecte o repositório Git.
2. Rebuild dos containers `api` e `web`.
3. Recreate dos containers.
4. Não remova o volume `postgres_data`.

## Checklist pós-deploy

- `https://app.guild-g3x.com.br/login` abre
- `https://app.guild-g3x.com.br/api/v1/auth/discord/login` redireciona para Discord
- Login volta para `https://app.guild-g3x.com.br/login/callback`
- Staff consegue abrir `/dashboard/staff`
- Upload de imagem envia ao Google Drive
- Webhooks postam no Discord
- Backup manual gera arquivo `.dump`

## Atenção

Nunca apague:

```text
postgres_data
```

Esse volume guarda o banco.
