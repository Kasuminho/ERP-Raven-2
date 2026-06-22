#!/usr/bin/env sh
set -eu

BASE_URL="${PRODUCTION_BASE_URL:-https://app.guild-g3x.com.br}"
EXPECTED_VERSION="${EXPECTED_VERSION:-}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT INT TERM

check() {
  URL="$1"
  EXPECTED="$2"
  CODE="$(curl --silent --show-error --location --output "$TMP" --write-out '%{http_code}' --max-time 20 "$URL")"
  [ "$CODE" = "$EXPECTED" ] || { echo "Smoke failed: $URL returned $CODE, expected $EXPECTED" >&2; exit 1; }
}

check "$BASE_URL/login" 200
check "$BASE_URL/api/v1/health" 200

if [ -n "$EXPECTED_VERSION" ]; then
  curl --silent --show-error --fail --max-time 20 "$BASE_URL/api/v1/health" | grep -F "$EXPECTED_VERSION" >/dev/null || {
    echo "Health response does not contain expected version: $EXPECTED_VERSION" >&2
    exit 1
  }
fi

echo "Production smoke passed: login and API health are reachable${EXPECTED_VERSION:+ at version $EXPECTED_VERSION}."
