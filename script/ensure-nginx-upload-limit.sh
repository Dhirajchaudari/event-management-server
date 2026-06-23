#!/usr/bin/env bash
# Ensures Nginx allows speaker photo uploads (default 1m causes HTTP 413).
set -euo pipefail

UPLOAD_LIMIT="${EM_NGINX_UPLOAD_LIMIT:-10m}"
DIRECTIVE="client_max_body_size ${UPLOAD_LIMIT};"

candidates=(
  /etc/nginx/sites-available/api-events.orbitalops.net
  /etc/nginx/sites-enabled/api-events.orbitalops.net
  /etc/nginx/conf.d/api-events.orbitalops.net.conf
)

updated=0
for file in "${candidates[@]}"; do
  [ -f "$file" ] || continue

  if grep -q 'client_max_body_size' "$file"; then
    sudo sed -i "s/client_max_body_size[^;]*;/${DIRECTIVE}/" "$file"
  else
    sudo sed -i "/server_name[[:space:]].*api-events\\.orbitalops\\.net/a\\    ${DIRECTIVE}" "$file"
  fi
  updated=1
  echo "Applied ${DIRECTIVE} to ${file}"
done

if [ "$updated" -eq 0 ]; then
  echo "WARN: No api-events Nginx config found; set client_max_body_size ${UPLOAD_LIMIT} manually" >&2
  exit 0
fi

sudo nginx -t
sudo systemctl reload nginx
echo "Nginx reloaded with upload limit ${UPLOAD_LIMIT}"
