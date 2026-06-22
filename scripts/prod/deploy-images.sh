#!/usr/bin/env sh
set -eu

TAG="${1:-${DEPLOY_IMAGE_TAG:-latest}}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.icp-images.yml}"
STATE_DIR="${DEPLOY_STATE_DIR:-.deploy}"
STATE_FILE="$STATE_DIR/current.env"
HISTORY_FILE="$STATE_DIR/tag-history"

cleanup() {
  rm -f "$STATE_FILE.next"
}
trap cleanup EXIT INT TERM

[ -f .env.production ] || { echo "Missing .env.production" >&2; exit 1; }
mkdir -p "$STATE_DIR"
touch "$HISTORY_FILE"

CURRENT="$(sed -n 's/^DEPLOY_IMAGE_TAG=//p' "$STATE_FILE" 2>/dev/null | tail -n 1 || true)"
if [ -n "$CURRENT" ] && [ "$CURRENT" != "$TAG" ]; then
  printf '%s\n' "$CURRENT" >> "$HISTORY_FILE"
fi

printf 'DEPLOY_IMAGE_TAG=%s\n' "$TAG" > "$STATE_FILE.next"
DEPLOY_IMAGE_TAG="$TAG" docker compose -f "$COMPOSE_FILE" --env-file .env.production pull api web
DEPLOY_IMAGE_TAG="$TAG" docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d --no-deps api
DEPLOY_IMAGE_TAG="$TAG" docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d web

ATTEMPTS=0
until [ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' guild-api 2>/dev/null || true)" = healthy ] && \
      [ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' guild-web 2>/dev/null || true)" = healthy ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [ "$ATTEMPTS" -lt 30 ] || { echo "Deployment did not become healthy; state was not promoted." >&2; exit 1; }
  sleep 5
done

mv "$STATE_FILE.next" "$STATE_FILE"
trap - EXIT INT TERM
echo "Deployment healthy at image tag: $TAG"
