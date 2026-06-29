#!/usr/bin/env bash
# frontend 배포 전에 Orval 산출물을 다시 생성한다.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$ROOT_DIR/.env}"
STACK_FILE="${STACK_FILE:-$ROOT_DIR/compose/backend-public-stack.yml}"
COMPOSE=(docker compose --env-file "$COMPOSE_ENV_FILE" -f "$STACK_FILE")
TEMP_ENV_FILES=()

cleanup_temp_env_files() {
  if [[ "${#TEMP_ENV_FILES[@]}" -eq 0 ]]; then
    return
  fi

  rm -f "${TEMP_ENV_FILES[@]}"
}

ensure_temp_env_file() {
  local target_file="$1"
  local template_file="${2:-}"

  if [[ -e "$target_file" ]]; then
    return
  fi

  mkdir -p "$(dirname "$target_file")"

  if [[ -n "$template_file" && -f "$template_file" ]]; then
    cp "$template_file" "$target_file"
  else
    : > "$target_file"
  fi

  TEMP_ENV_FILES+=("$target_file")
}

trap cleanup_temp_env_files EXIT

if [[ -f "$COMPOSE_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$COMPOSE_ENV_FILE"
  set +a
fi

# root docker-compose.yml이 기대하는 이름과 deploy/.env 이름을 맞춘다.
export MARKET_DB_USERNAME="${MARKET_DB_USERNAME:-${MARKET_DB_USER:-}}"
export FRANCHISE_DB_USERNAME="${FRANCHISE_DB_USERNAME:-${FRANCHISE_DB_USER:-}}"
export NEXT_PUBLIC_API_ORIGIN="${NEXT_PUBLIC_API_ORIGIN:-${API_PUBLIC_ORIGIN:-}}"

: "${AUTHENTIK_SERVICE_ROLE_KEY:?set AUTHENTIK_SERVICE_ROLE_KEY}"
: "${MARKET_DB_PASSWORD:?set MARKET_DB_PASSWORD}"
: "${FRANCHISE_DB_PASSWORD:?set FRANCHISE_DB_PASSWORD}"
: "${MARKET_DB_USERNAME:?set MARKET_DB_USER}"
: "${FRANCHISE_DB_USERNAME:?set FRANCHISE_DB_USER}"
: "${NEXT_PUBLIC_API_ORIGIN:?set API_PUBLIC_ORIGIN}"

# api:catalog는 root docker-compose.yml의 env_file 경로도 함께 검증하므로
# 배포 clone에는 없는 로컬 env 파일을 codegen 동안만 임시로 맞춘다.
ensure_temp_env_file "$REPO_ROOT/.env" "$COMPOSE_ENV_FILE"
ensure_temp_env_file \
  "$REPO_ROOT/backend/services/agent-service/.env" \
  "$REPO_ROOT/backend/services/agent-service/.env.example"

echo ">> frontend codegen에 필요한 gateway/auth 라우팅 반영"
"${COMPOSE[@]}" up -d traefik authentik-server

echo ">> frontend 의존성 설치"
(
  cd "$FRONTEND_DIR"
  npm ci
)

echo ">> frontend api:gen 실행"
(
  cd "$FRONTEND_DIR"
  npm run api:gen
)

echo ">> done"
