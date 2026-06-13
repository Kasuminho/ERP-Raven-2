#!/usr/bin/env sh
set -eu

CONTAINER="${POSTGRES_CONTAINER:-guild-postgres}"
DB="${POSTGRES_DB:-guild_platform}"
USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/${DB}_${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "Creating PostgreSQL backup: $FILE"
docker exec "$CONTAINER" pg_dump -U "$USER" -d "$DB" -Fc -f "/tmp/${DB}.dump"
docker cp "$CONTAINER:/tmp/${DB}.dump" "$FILE"
docker exec "$CONTAINER" rm -f "/tmp/${DB}.dump"

echo "Backup ready: $FILE"
