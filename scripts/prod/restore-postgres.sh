#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ]; then
  echo "Usage: scripts/prod/restore-postgres.sh ./backups/guild_platform_YYYYMMDD_HHMMSS.dump" >&2
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER="${POSTGRES_CONTAINER:-guild-postgres}"
DB="${POSTGRES_DB:-guild_platform}"
USER="${POSTGRES_USER:-postgres}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "Copying backup into container..."
docker cp "$BACKUP_FILE" "$CONTAINER:/tmp/restore.dump"

echo "Dropping and recreating public schema in $DB..."
docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 -c "drop schema if exists public cascade; create schema public;"

echo "Restoring backup..."
docker exec "$CONTAINER" pg_restore -U "$USER" -d "$DB" --no-owner --no-privileges "/tmp/restore.dump"
docker exec "$CONTAINER" rm -f "/tmp/restore.dump"

echo "Restore finished."
