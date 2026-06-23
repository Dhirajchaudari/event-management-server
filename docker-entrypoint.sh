#!/bin/sh
set -eu

echo "[entrypoint] Starting Event Management API..."

if [ -z "${MONGODB_URI:-}" ]; then
  echo "[entrypoint] ERROR: MONGODB_URI is not set." >&2
  exit 1
fi

echo "[entrypoint] Starting Node server on port ${PORT:-8000}..."
exec node dist/src/server.js
