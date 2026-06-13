# ICP deploy with prebuilt Docker images

Use this flow when the ICP Node.js deploy is compiling too much on the VPS.
GitHub Actions builds the API and Web Docker images, then ICP only pulls and runs them.

## Images

- `ghcr.io/kasuminho/erp-raven-2-api:latest`
- `ghcr.io/kasuminho/erp-raven-2-web:latest`

## ICP Compose

Use `docker-compose.icp-images.yml` in the ICP Compose screen.
It includes Watchtower, which checks for new `latest` images every 5 minutes and recreates only containers marked with the Watchtower label.

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

## Update flow

1. Commit and push to `master`.
2. GitHub Actions builds and publishes new `latest` images to GHCR.
3. Watchtower running in ICP detects the new image within about 5 minutes.
4. Watchtower pulls the image, recreates `guild-api` and/or `guild-web`, and removes old image layers.

If the GHCR packages are private, the ICP host needs Docker registry credentials for `ghcr.io`, or the packages must be made public.
