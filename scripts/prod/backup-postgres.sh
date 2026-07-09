#!/usr/bin/env sh
set -eu

CONTAINER="${POSTGRES_CONTAINER:-guild-postgres}"
DB="${POSTGRES_DB:-guild_platform}"
USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/${DB}_${STAMP}.dump"
TEMP_FILE="$FILE.partial"

cleanup() {
  rm -f "$TEMP_FILE"
  docker exec "$CONTAINER" rm -f "/tmp/${DB}.dump" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

mkdir -p "$BACKUP_DIR"

echo "Creating PostgreSQL backup: $FILE"
docker exec "$CONTAINER" pg_dump -U "$USER" -d "$DB" -Fc -f "/tmp/${DB}.dump"
docker cp "$CONTAINER:/tmp/${DB}.dump" "$TEMP_FILE"
docker exec "$CONTAINER" rm -f "/tmp/${DB}.dump"
mv "$TEMP_FILE" "$FILE"

ARTIFACT="$FILE"
if [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
  command -v gpg >/dev/null 2>&1 || { echo "gpg is required for BACKUP_GPG_RECIPIENT" >&2; exit 1; }
  gpg --batch --yes --encrypt --recipient "$BACKUP_GPG_RECIPIENT" --output "$FILE.gpg" "$FILE"
  rm -f "$FILE"
  ARTIFACT="$FILE.gpg"
elif [ -n "${BACKUP_GPG_PASSPHRASE_FILE:-}" ]; then
  command -v gpg >/dev/null 2>&1 || { echo "gpg is required for BACKUP_GPG_PASSPHRASE_FILE" >&2; exit 1; }
  [ -r "$BACKUP_GPG_PASSPHRASE_FILE" ] || { echo "Passphrase file is not readable" >&2; exit 1; }
  gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase-file "$BACKUP_GPG_PASSPHRASE_FILE" --output "$FILE.gpg" "$FILE"
  rm -f "$FILE"
  ARTIFACT="$FILE.gpg"
fi

ARTIFACT_DIR="$(dirname "$ARTIFACT")"
ARTIFACT_NAME="$(basename "$ARTIFACT")"
(cd "$ARTIFACT_DIR" && sha256sum "$ARTIFACT_NAME" > "$ARTIFACT_NAME.sha256")

if [ -n "${BACKUP_OFFSITE_COMMAND:-}" ]; then
  sh -c "$BACKUP_OFFSITE_COMMAND" backup-offsite "$ARTIFACT"
  sh -c "$BACKUP_OFFSITE_COMMAND" backup-offsite "$ARTIFACT.sha256"
fi

find "$BACKUP_DIR" -type f \( -name "${DB}_*.dump" -o -name "${DB}_*.dump.gpg" -o -name "${DB}_*.sha256" \) -mtime "+$RETENTION_DAYS" -delete

echo "Backup ready: $ARTIFACT"
echo "Checksum ready: $ARTIFACT.sha256"

if [ "${BACKUP_VERIFY_AFTER:-}" = "1" ] || [ "${BACKUP_VERIFY_AFTER:-}" = "true" ]; then
  SCRIPT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
  "$SCRIPT_DIR/verify-backup.sh" "$ARTIFACT"
fi
