# ICP deploy with prebuilt Docker images

Use this flow when the ICP Node.js deploy is compiling too much on the VPS.
GitHub Actions builds the API and Web Docker images, then ICP only pulls and runs them.

## Images

- `ghcr.io/kasuminho/erp-raven-2-api:latest`
- `ghcr.io/kasuminho/erp-raven-2-web:latest`

## ICP Compose

Use `docker-compose.icp-images.yml` in the ICP Compose screen.

The API still needs all production environment variables, especially:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/guild_platform?schema=public
JWT_SECRET=replace_me
JWT_EXPIRES_IN=12h
PUBLIC_APP_URL=https://app.guild-g3x.com.br
CORS_ORIGIN=https://app.guild-g3x.com.br
DISCORD_CALLBACK_URL=https://app.guild-g3x.com.br/api/v1/auth/discord/callback
NEXT_PUBLIC_API_URL=https://app.guild-g3x.com.br/api/v1
```

## OpenResty

Route:

- `/api/v1` -> `http://127.0.0.1:3000`
- `/` -> `http://127.0.0.1:5173`
