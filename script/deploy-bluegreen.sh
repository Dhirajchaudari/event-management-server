#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STATE_FILE="${EM_STATE_FILE:-.deploy/active-slot}"
ENV_FILE="${EM_ENV_FILE:-.env.production}"
IMAGE_NAME="${EM_IMAGE_NAME:-event-management-server}"
IMAGE_TAG="${EM_IMAGE_TAG:-latest}"

BLUE_PORT="${EM_BLUE_PORT:-18082}"
GREEN_PORT="${EM_GREEN_PORT:-28082}"
APP_PORT="${EM_APP_PORT:-8000}"
BLUE_CONTAINER="${EM_BLUE_CONTAINER:-event-management-api-blue}"
GREEN_CONTAINER="${EM_GREEN_CONTAINER:-event-management-api-green}"

PUBLIC_HEALTH_URL="${EM_PUBLIC_HEALTH_URL:-}"
PUBLIC_HEALTH_SUCCESS_COUNT="${EM_PUBLIC_HEALTH_SUCCESS_COUNT:-3}"
PUBLIC_HEALTH_MAX_TIME_SECONDS="${EM_PUBLIC_HEALTH_MAX_TIME_SECONDS:-8}"
ZERO_DOWNTIME_CHECK="${EM_ZERO_DOWNTIME_CHECK:-1}"
ZERO_DOWNTIME_DURATION_SECONDS="${EM_ZERO_DOWNTIME_DURATION_SECONDS:-30}"
ZERO_DOWNTIME_INTERVAL_SECONDS="${EM_ZERO_DOWNTIME_INTERVAL_SECONDS:-0.2}"
NGINX_UPSTREAM_FILE="${EM_NGINX_UPSTREAM_FILE:-/etc/nginx/conf.d/event-management-api-upstream.conf}"
NGINX_UPSTREAM_NAME="${EM_NGINX_UPSTREAM_NAME:-event_management_api_active}"
DRAIN_SECONDS="${EM_DRAIN_SECONDS:-20}"

mkdir -p "$(dirname "$STATE_FILE")"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: env file not found: $ENV_FILE" >&2
  exit 1
fi

health_ok() {
  local port="$1"
  curl -fsS --connect-timeout 3 "http://127.0.0.1:${port}/health" >/dev/null 2>&1
}

show_container_logs() {
  local container_name="$1"
  echo "=== Last 80 lines of ${container_name} logs ===" >&2
  docker logs --tail 80 "$container_name" 2>&1 || true
}

wait_for_health() {
  local port="$1"
  local container_name="$2"
  local attempts="${3:-60}"
  local i
  echo "Waiting for container ${container_name} on 127.0.0.1:${port} (server startup)..."
  for i in $(seq 1 "$attempts"); do
    if health_ok "$port"; then
      echo "Local health OK on 127.0.0.1:${port} (attempt ${i})"
      return 0
    fi
    if [ $((i % 5)) -eq 0 ]; then
      echo "Still waiting for health... attempt ${i}/${attempts} (~$((i * 2))s)"
      if ! docker ps --format '{{.Names}}' | grep -qx "$container_name"; then
        echo "ERROR: container ${container_name} is not running" >&2
        show_container_logs "$container_name"
        return 1
      fi
    fi
    sleep 2
  done
  echo "ERROR: local health failed on 127.0.0.1:${port} after ${attempts} attempts" >&2
  show_container_logs "$container_name"
  return 1
}

wait_for_public_health() {
  local url="$1"
  local required="${2:-3}"
  local max_time="${3:-8}"
  local success=0
  local i
  for i in $(seq 1 60); do
    if curl -fsSL --connect-timeout 5 --max-time "$max_time" "$url" >/dev/null 2>&1; then
      success=$((success + 1))
      echo "Public health OK via ${url} (${success}/${required}, attempt ${i})"
      if [ "$success" -ge "$required" ]; then
        return 0
      fi
    else
      success=0
      echo "Public health failed via ${url} (attempt ${i})"
    fi
    sleep 2
  done
  echo "ERROR: public health check failed for ${url} after 60 attempts" >&2
  return 1
}

assert_zero_downtime_window() {
  local url="$1"
  local duration_s="${2:-30}"
  local interval_s="${3:-0.2}"
  local start_epoch
  local now_epoch
  local elapsed
  local requests=0
  local failures=0

  echo "Verifying zero downtime for ${duration_s}s (interval ${interval_s}s) via ${url}..."
  start_epoch="$(date +%s)"

  while true; do
    now_epoch="$(date +%s)"
    elapsed=$((now_epoch - start_epoch))
    if [ "$elapsed" -ge "$duration_s" ]; then
      break
    fi

    requests=$((requests + 1))
    if ! curl -fsSL --connect-timeout 3 --max-time 8 "$url" >/dev/null 2>&1; then
      failures=$((failures + 1))
    fi
    sleep "$interval_s"
  done

  echo "Zero-downtime window results: requests=${requests}, failures=${failures}"
  if [ "$failures" -gt 0 ]; then
    echo "ERROR: downtime detected during cutover window" >&2
    return 1
  fi
}

write_upstream() {
  local port="$1"
  sudo install -d -m 755 "$(dirname "$NGINX_UPSTREAM_FILE")"
  sudo tee "$NGINX_UPSTREAM_FILE" >/dev/null <<EOF
upstream ${NGINX_UPSTREAM_NAME} {
    server 127.0.0.1:${port};
}
EOF
  sudo nginx -t
  sudo systemctl reload nginx
}

stop_container_if_exists() {
  local container_name="$1"
  docker rm -f "$container_name" >/dev/null 2>&1 || true
}

run_container() {
  local container_name="$1"
  local publish_port="$2"

  stop_container_if_exists "$container_name"

  docker run -d \
    --name "$container_name" \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    -e PORT="$APP_PORT" \
    -p "${publish_port}:${APP_PORT}" \
    "${IMAGE_NAME}:${IMAGE_TAG}" >/dev/null
}

build_image() {
  docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .
}

ACTIVE_SLOT="blue"
if [ -f "$STATE_FILE" ]; then
  ACTIVE_SLOT="$(tr -d '[:space:]' <"$STATE_FILE")"
fi

if [ "$ACTIVE_SLOT" = "blue" ]; then
  INACTIVE_SLOT="green"
  INACTIVE_PORT="$GREEN_PORT"
  INACTIVE_CONTAINER="$GREEN_CONTAINER"
  ACTIVE_CONTAINER="$BLUE_CONTAINER"
else
  INACTIVE_SLOT="blue"
  INACTIVE_PORT="$BLUE_PORT"
  INACTIVE_CONTAINER="$BLUE_CONTAINER"
  ACTIVE_CONTAINER="$GREEN_CONTAINER"
fi

echo "=== Event-management blue/green deploy: active=${ACTIVE_SLOT}, next=${INACTIVE_SLOT} ==="
echo "Building Docker image ${IMAGE_NAME}:${IMAGE_TAG}..."
build_image
echo "Starting container ${INACTIVE_CONTAINER} on port ${INACTIVE_PORT}..."
run_container "$INACTIVE_CONTAINER" "$INACTIVE_PORT"
wait_for_health "$INACTIVE_PORT" "$INACTIVE_CONTAINER" 75
write_upstream "$INACTIVE_PORT"

if [ -n "$PUBLIC_HEALTH_URL" ]; then
  wait_for_public_health "$PUBLIC_HEALTH_URL" "$PUBLIC_HEALTH_SUCCESS_COUNT" "$PUBLIC_HEALTH_MAX_TIME_SECONDS"
  if [ "$ZERO_DOWNTIME_CHECK" = "1" ]; then
    assert_zero_downtime_window "$PUBLIC_HEALTH_URL" "$ZERO_DOWNTIME_DURATION_SECONDS" "$ZERO_DOWNTIME_INTERVAL_SECONDS"
  fi
fi

echo "$INACTIVE_SLOT" > "$STATE_FILE"
echo "Draining old slot for ${DRAIN_SECONDS}s..."
sleep "$DRAIN_SECONDS"
stop_container_if_exists "$ACTIVE_CONTAINER"
docker image prune -f >/dev/null 2>&1 || true
echo "=== Deployment complete: active=${INACTIVE_SLOT} ==="
