#!/usr/bin/env sh
set -eu

if [ -z "${1:-}" ]; then
  echo "Usage: scripts/prod/verify-backup.sh BACKUP_FILE" >&2
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER="${POSTGRES_CONTAINER:-guild-postgres}"
USER="${POSTGRES_USER:-postgres}"
VERIFY_DB="backup_verify_$(date +%s)_$$"
RESTORE_FILE="$BACKUP_FILE"
TEMP_DECRYPTED=""

cleanup() {
  docker exec "$CONTAINER" dropdb -U "$USER" --if-exists "$VERIFY_DB" >/dev/null 2>&1 || true
  docker exec "$CONTAINER" rm -f /tmp/verify.dump >/dev/null 2>&1 || true
  [ -z "$TEMP_DECRYPTED" ] || rm -f "$TEMP_DECRYPTED"
}
trap cleanup EXIT INT TERM

[ -f "$BACKUP_FILE" ] || { echo "Backup file not found: $BACKUP_FILE" >&2; exit 1; }
[ -f "$BACKUP_FILE.sha256" ] || { echo "Checksum file not found: $BACKUP_FILE.sha256" >&2; exit 1; }
BACKUP_DIR="$(dirname "$BACKUP_FILE")"
BACKUP_NAME="$(basename "$BACKUP_FILE")"
(cd "$BACKUP_DIR" && sha256sum -c "$BACKUP_NAME.sha256")

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

docker cp "$RESTORE_FILE" "$CONTAINER:/tmp/verify.dump"
docker exec "$CONTAINER" createdb -U "$USER" "$VERIFY_DB"
docker exec "$CONTAINER" pg_restore -U "$USER" -d "$VERIFY_DB" --no-owner --no-privileges --exit-on-error /tmp/verify.dump
TABLE_COUNT="$(docker exec "$CONTAINER" psql -U "$USER" -d "$VERIFY_DB" -Atc "select count(*) from pg_catalog.pg_tables where schemaname = 'public';")"
[ "$TABLE_COUNT" -gt 0 ] || { echo "Restore completed but no public tables were found" >&2; exit 1; }
STATUS_FILE="${BACKUP_STATUS_FILE:-$(dirname "$BACKUP_FILE")/last-verified-backup.json}"
STATUS_DIR="$(dirname "$STATUS_FILE")"
mkdir -p "$STATUS_DIR"
cat > "$STATUS_FILE" <<EOF
{
  "status": "verified",
  "verifiedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "backupFile": "$(basename "$BACKUP_FILE")",
  "tableCount": $TABLE_COUNT
}
EOF
echo "Backup verified by temporary restore ($TABLE_COUNT public tables)."
echo "Backup status ready: $STATUS_FILE"
