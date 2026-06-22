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

if [ "${RESTORE_CONFIRM:-}" != "$DB" ]; then
  echo "Refusing destructive restore. Set RESTORE_CONFIRM=$DB after checking the target." >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

RESTORE_FILE="$BACKUP_FILE"
TEMP_DECRYPTED=""
cleanup() {
  [ -z "$TEMP_DECRYPTED" ] || rm -f "$TEMP_DECRYPTED"
  docker exec "$CONTAINER" rm -f /tmp/restore.dump >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

if [ -f "$BACKUP_FILE.sha256" ]; then
  BACKUP_DIR="$(dirname "$BACKUP_FILE")"
  BACKUP_NAME="$(basename "$BACKUP_FILE")"
  (cd "$BACKUP_DIR" && sha256sum -c "$BACKUP_NAME.sha256")
else
  echo "Warning: checksum file not found: $BACKUP_FILE.sha256" >&2
fi

case "$BACKUP_FILE" in
  *.gpg)
    command -v gpg >/dev/null 2>&1 || { echo "gpg is required to decrypt this backup" >&2; exit 1; }
    TEMP_DECRYPTED="$(mktemp)"
    if [ -n "${BACKUP_GPG_PASSPHRASE_FILE:-}" ]; then
      gpg --batch --yes --passphrase-file "$BACKUP_GPG_PASSPHRASE_FILE" --output "$TEMP_DECRYPTED" --decrypt "$BACKUP_FILE"
    else
      gpg --batch --yes --output "$TEMP_DECRYPTED" --decrypt "$BACKUP_FILE"
    fi
    RESTORE_FILE="$TEMP_DECRYPTED"
    ;;
esac

echo "Copying backup into container..."
docker cp "$RESTORE_FILE" "$CONTAINER:/tmp/restore.dump"

echo "Dropping and recreating public schema in $DB..."
docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 -c "drop schema if exists public cascade; create schema public;"

echo "Restoring backup..."
docker exec "$CONTAINER" pg_restore -U "$USER" -d "$DB" --no-owner --no-privileges "/tmp/restore.dump"
docker exec "$CONTAINER" rm -f "/tmp/restore.dump"

echo "Restore finished."
