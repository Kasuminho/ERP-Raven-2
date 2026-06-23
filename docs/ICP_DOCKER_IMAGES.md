# ICP deploy with prebuilt Docker images

Use this flow when the ICP Node.js deploy is compiling too much on the VPS.
GitHub Actions builds the API and Web Docker images, then ICP only pulls and runs them.

## Images

- `ghcr.io/kasuminho/erp-raven-2-api:latest`
- `ghcr.io/kasuminho/erp-raven-2-web:latest`

## ICP Compose

Use `docker-compose.icp-images.yml` in the ICP Compose screen.
It includes Watchtower, which checks for new `latest` images every 5 minutes and recreates only containers marked with the Watchtower label.

API and Web also have Docker healthchecks and configurable CPU/memory guardrails. Web
waits for a healthy API before starting.

The API still needs all production environment variables, especially:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/guild_platform?schema=public
JWT_SECRET=replace_me
JWT_EXPIRES_IN=12h
PUBLIC_APP_URL=https://app.guild-g3x.com.br
CORS_ORIGIN=https://app.guild-g3x.com.br
DISCORD_CALLBACK_URL=https://app.guild-g3x.com.br/api/v1/auth/discord/callback
NEXT_PUBLIC_API_URL=https://app.guild-g3x.com.br/api/v1
ICP_SHARED_NETWORK=icontainer-network-name
IMAGE_STORAGE_PROVIDER=local
UPLOADS_HOST_DIR=/srv/guild/uploads
```

Set `ICP_SHARED_NETWORK` to the exact Docker network used by the ICP PostgreSQL container. This keeps API/Web on the same internal network as Postgres and avoids falling back to external database access.

The API stores new uploaded images in `${UPLOADS_HOST_DIR}` mounted at `/app/uploads`.
Keep this host directory persistent and include it in backups together with PostgreSQL.

## OpenResty

Route:

- `/api/v1` -> `http://127.0.0.1:3000`
- `/uploads` -> `http://127.0.0.1:3000`
- `/` -> `http://127.0.0.1:5173`

## Migrating legacy Google Drive images

New uploads should use `IMAGE_STORAGE_PROVIDER=local`, but old database records can
still point to Google Drive until they are migrated.

Before applying the migration, create a PostgreSQL backup and keep a raw copy of the
Google Drive folder. Then run an inventory:

```bash
npm run images:migrate-drive -- --dry-run
```

Apply a small batch first:

```bash
npm run images:migrate-drive -- --apply --limit 10 --uploads-dir /srv/guild/uploads
```

After checking the generated `reports/drive-image-migration-*.jsonl` manifest and
opening migrated images in production, run the full migration:

```bash
npm run images:migrate-drive -- --apply --uploads-dir /srv/guild/uploads
```

If running the command inside the `guild-api` container instead of on the VPS host,
use `--uploads-dir /app/uploads`, because the host directory is mounted there.

The script validates PNG, JPEG and WebP by magic bytes before writing files, stores
them under `/uploads/<uuid>.<ext>`, updates the image URL fields in PostgreSQL, and
keeps a JSONL manifest with old URL, new URL, size and SHA-256. Do not remove Drive
access or CSP allowances until the dry-run reports zero remaining Drive references.

## Update flow

1. Commit and push to `master`.
2. GitHub Actions builds and publishes new `latest` images to GHCR.
3. Watchtower running in ICP detects the new image within about 5 minutes.
4. Watchtower pulls the image, recreates `guild-api` and/or `guild-web`, and removes old image layers.

If the GHCR packages are private, the ICP host needs Docker registry credentials for `ghcr.io`, or the packages must be made public.

ICP's Docker daemon may reject old Docker API negotiation, so Watchtower is pinned with `DOCKER_API_VERSION=1.40`.

## Immutable deploy and rollback

`latest` remains the default and preserves the current Watchtower flow. For a controlled
release, publish API and Web with the same immutable Git SHA tag, then run:

```bash
scripts/prod/deploy-images.sh GIT_SHA
EXPECTED_VERSION=GIT_SHA scripts/prod/smoke-production.sh
```

The deploy promotes local state only after both containers become healthy. Return to
the previously recorded immutable tag with `scripts/prod/rollback-images.sh`.

Do not use a mutable tag as a rollback target. Deployment state lives in `.deploy/` and
is excluded from Git. Operational procedures are in `docs/OPERATIONS_RUNBOOKS.md`;
external monitoring is in `docs/MONITORING.md`.
