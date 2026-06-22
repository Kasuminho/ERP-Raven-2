#!/usr/bin/env sh
set -eu

STATE_DIR="${DEPLOY_STATE_DIR:-.deploy}"
HISTORY_FILE="$STATE_DIR/tag-history"
[ -s "$HISTORY_FILE" ] || { echo "No previous deployment tag is recorded." >&2; exit 1; }

PREVIOUS="$(tail -n 1 "$HISTORY_FILE")"
sed '$d' "$HISTORY_FILE" > "$HISTORY_FILE.next"
mv "$HISTORY_FILE.next" "$HISTORY_FILE"
echo "Rolling back to immutable image tag: $PREVIOUS"
exec scripts/prod/deploy-images.sh "$PREVIOUS"
