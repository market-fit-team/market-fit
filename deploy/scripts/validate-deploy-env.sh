#!/usr/bin/env bash
# Fail deployment before placeholder secrets can be applied to databases or authentik.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.env}"

fail_count=0

report_error() {
  echo "::error::$*" >&2
  fail_count=$((fail_count + 1))
}

lowercase() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

looks_like_placeholder() {
  local value="$1"
  local lower
  lower="$(lowercase "$value")"

  [[ "$lower" == *change_me* ]] ||
    [[ "$lower" == *change-me* ]] ||
    [[ "$lower" == *changeme* ]] ||
    [[ "$lower" == *replace_me* ]] ||
    [[ "$lower" == *replace-me* ]] ||
    [[ "$lower" == "todo" ]] ||
    [[ "$lower" == "todo_"* ]]
}

require_value() {
  local var_name="$1"
  local value="${!var_name:-}"

  if [[ -z "$value" ]]; then
    report_error "$var_name is required in $ENV_FILE"
    return
  fi

  if looks_like_placeholder "$value"; then
    report_error "$var_name still looks like a placeholder in $ENV_FILE"
  fi
}

require_min_length() {
  local var_name="$1"
  local min_length="$2"
  local value="${!var_name:-}"

  if [[ -n "$value" && "${#value}" -lt "$min_length" ]]; then
    report_error "$var_name must be at least $min_length characters"
  fi
}

require_equal() {
  local var_name="$1"
  local expected="$2"
  local value="${!var_name:-}"

  if [[ "$value" != "$expected" ]]; then
    report_error "$var_name must be '$expected' for this deploy stack"
  fi
}

if [[ ! -f "$ENV_FILE" ]]; then
  report_error "deploy env file is missing: $ENV_FILE"
  echo "This deployment uses deploy/.env, not the repository-root .env." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required_non_placeholder_vars=(
  FRONTEND_PUBLIC_HOST
  FRONTEND_PUBLIC_ORIGIN
  API_PUBLIC_HOST
  API_PUBLIC_ORIGIN
  AUTH_PUBLIC_HOST
  AUTH_PUBLIC_ORIGIN
  TRAEFIK_CORS_ORIGINS
  AUTHENTIK_SECRET_KEY
  AUTHENTIK_BOOTSTRAP_PASSWORD
  AUTHENTIK_BOOTSTRAP_TOKEN
  BETTER_AUTH_SECRET
  AUTHENTIK_CLIENT_ID
  AUTHENTIK_CLIENT_SECRET
  AUTHENTIK_SERVICE_ROLE_KEY
  AUTHENTIK_BETTER_AUTH_CALLBACK_URL
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  AUTHENTIK_DB_PASSWORD
  BACKEND_DB_POSTGRES_PASSWORD
  ONBOARDING_DB_PASSWORD
  AGENT_DB_PASSWORD
  POST_DB_PASSWORD
  TREND_DB_PASSWORD
  MARKET_DB_PASSWORD
  FRANCHISE_DB_PASSWORD
)

for var_name in "${required_non_placeholder_vars[@]}"; do
  require_value "$var_name"
done

require_equal FRONTEND_PUBLIC_HOST "market-fit.jongchoi.com"
require_equal FRONTEND_PUBLIC_ORIGIN "https://market-fit.jongchoi.com"
require_equal API_PUBLIC_HOST "api.market-fit.jongchoi.com"
require_equal API_PUBLIC_ORIGIN "https://api.market-fit.jongchoi.com"
require_equal AUTH_PUBLIC_HOST "auth.market-fit.jongchoi.com"
require_equal AUTH_PUBLIC_ORIGIN "https://auth.market-fit.jongchoi.com"
require_equal AUTHENTIK_CLIENT_ID "pickle-web"

expected_callback_url="${FRONTEND_PUBLIC_ORIGIN%/}/api/auth/oauth2/callback/authentik"
if [[ "${AUTHENTIK_BETTER_AUTH_CALLBACK_URL:-}" != "$expected_callback_url" ]]; then
  report_error "AUTHENTIK_BETTER_AUTH_CALLBACK_URL must be '$expected_callback_url'"
fi

require_min_length AUTHENTIK_SECRET_KEY 32
require_min_length BETTER_AUTH_SECRET 32
require_min_length AUTHENTIK_CLIENT_SECRET 16
require_min_length AUTHENTIK_SERVICE_ROLE_KEY 32
require_min_length AUTHENTIK_DB_PASSWORD 16
require_min_length BACKEND_DB_POSTGRES_PASSWORD 16
require_min_length MARKET_DB_PASSWORD 16
require_min_length FRANCHISE_DB_PASSWORD 16

if [[ "$fail_count" -gt 0 ]]; then
  echo "Deployment stopped before applying placeholder env values." >&2
  echo "Fix $ENV_FILE and re-run the workflow." >&2
  exit 1
fi

echo ">> deploy env validation passed: $ENV_FILE"
