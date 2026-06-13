#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [ ! -f ".env.production" ]; then
  echo "Missing .env.production. Copy .env.production.example and fill the production secrets first." >&2
  exit 1
fi

echo "Building production images..."
docker compose -f "$COMPOSE_FILE" --env-file .env.production build api web

echo "Starting production stack..."
docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d

echo "Stack status:"
docker compose -f "$COMPOSE_FILE" --env-file .env.production ps

echo "Cleaning unused Docker build cache/images..."
docker builder prune -af >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true

echo "Done."
