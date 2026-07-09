#!/usr/bin/env bash
# Align existing PostgreSQL roles with the current deploy/.env passwords.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_FILE="${STACK_FILE:-$ROOT_DIR/compose/backend-public-stack.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$ROOT_DIR/.env}"
VALIDATE_DEPLOY_ENV_SCRIPT="${VALIDATE_DEPLOY_ENV_SCRIPT:-$ROOT_DIR/scripts/validate-deploy-env.sh}"

bash "$VALIDATE_DEPLOY_ENV_SCRIPT" "$COMPOSE_ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$COMPOSE_ENV_FILE"
set +a

COMPOSE=(docker compose --env-file "$COMPOSE_ENV_FILE" -f "$STACK_FILE")

wait_for_postgres() {
  local service_name="$1"
  local user_name="$2"
  local db_name="$3"
  local max_attempts="${DB_READY_MAX_ATTEMPTS:-30}"
  local sleep_seconds="${DB_READY_SLEEP_SECONDS:-2}"
  local attempt=1

  while ((attempt <= max_attempts)); do
    if "${COMPOSE[@]}" exec -T "$service_name" \
      psql -U "$user_name" -d "$db_name" -v ON_ERROR_STOP=1 -tAc "SELECT 1" >/dev/null 2>&1; then
      return 0
    fi

    echo ">> waiting for $service_name... (${attempt}/${max_attempts})"
    sleep "$sleep_seconds"
    ((attempt++))
  done

  echo "$service_name is not ready" >&2
  return 1
}

run_psql_with_retry() {
  local service_name="$1"
  local connect_user="$2"
  local connect_db="$3"
  local description="$4"
  shift 4

  local max_attempts="${DB_READY_MAX_ATTEMPTS:-30}"
  local sleep_seconds="${DB_READY_SLEEP_SECONDS:-2}"
  local attempt=1
  local sql
  sql="$(cat)"

  while ((attempt <= max_attempts)); do
    if printf '%s\n' "$sql" | "${COMPOSE[@]}" exec -T "$service_name" \
      psql -U "$connect_user" -d "$connect_db" -v ON_ERROR_STOP=1 "$@"; then
      return 0
    fi

    echo ">> retrying $description... (${attempt}/${max_attempts})"
    sleep "$sleep_seconds"
    ((attempt++))
  done

  echo "$description failed" >&2
  return 1
}

alter_required_role_password() {
  local service_name="$1"
  local connect_user="$2"
  local connect_db="$3"
  local role_name="$4"
  local role_password="$5"

  wait_for_postgres "$service_name" "$connect_user" "$connect_db"
  echo ">> syncing password for $service_name role '$role_name'"
  run_psql_with_retry "$service_name" "$connect_user" "$connect_db" "$service_name role '$role_name' password sync" \
    -v role_name="$role_name" -v role_password="$role_password" <<'SQL'
ALTER ROLE :"role_name" WITH LOGIN PASSWORD :'role_password';
SQL
}

alter_existing_role_password() {
  local service_name="$1"
  local connect_user="$2"
  local connect_db="$3"
  local role_name="$4"
  local role_password="$5"

  wait_for_postgres "$service_name" "$connect_user" "$connect_db"
  echo ">> syncing password for $service_name role '$role_name' if it exists"
  run_psql_with_retry "$service_name" "$connect_user" "$connect_db" "$service_name role '$role_name' password sync" \
    -v role_name="$role_name" -v role_password="$role_password" <<'SQL'
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'role_name', :'role_password')
WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role_name')\gexec
SQL
}

alter_required_role_password authentik-db authentik authentik authentik "$AUTHENTIK_DB_PASSWORD"

alter_required_role_password backend-db postgres postgres postgres "$BACKEND_DB_POSTGRES_PASSWORD"
alter_existing_role_password backend-db postgres postgres market "$MARKET_DB_PASSWORD"
alter_existing_role_password backend-db postgres postgres franchise "$FRANCHISE_DB_PASSWORD"

alter_required_role_password onboarding-db "${ONBOARDING_DB_USER:-onboarding}" "${ONBOARDING_DB_NAME:-onboarding}" "${ONBOARDING_DB_USER:-onboarding}" "$ONBOARDING_DB_PASSWORD"
alter_required_role_password agent-db "${AGENT_DB_USER:-agent}" "${AGENT_DB_NAME:-agent}" "${AGENT_DB_USER:-agent}" "$AGENT_DB_PASSWORD"
alter_required_role_password post-db "${POST_DB_USER:-post}" "${POST_DB_NAME:-post}" "${POST_DB_USER:-post}" "$POST_DB_PASSWORD"
alter_required_role_password trend-db "${TREND_DB_USER:-trend}" "${TREND_DB_NAME:-trend}" "${TREND_DB_USER:-trend}" "$TREND_DB_PASSWORD"

echo ">> postgres role password sync done"
