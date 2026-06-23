#!/usr/bin/env bash
# Generate SERVER_ENV_B64 for GitHub Actions secret.
set -euo pipefail

ENV_FILE="${1:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found" >&2
  exit 1
fi

B64="$(base64 -i "$ENV_FILE" | tr -d '\n')"

if ! printf '%s' "$B64" | base64 -d >/dev/null 2>&1; then
  echo "ERROR: generated base64 is invalid" >&2
  exit 1
fi

echo "$B64" | pbcopy 2>/dev/null || true
echo "Valid SERVER_ENV_B64 generated (${#B64} chars)."
echo "Copied to clipboard on macOS. Paste into GitHub secret SERVER_ENV_B64."
