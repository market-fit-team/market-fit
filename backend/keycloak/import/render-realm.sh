#!/bin/sh
set -eu

TEMPLATE="/opt/keycloak/import-template/pickle-realm.template.json"
TARGET_DIR="/opt/keycloak/data/import"
TARGET="$TARGET_DIR/pickle-realm.json"

: "${PICKLE_WEB_CLIENT_SECRET:=pickle-web-secret}"
: "${GOOGLE_CLIENT_ID:=CHANGE_ME}"
: "${GOOGLE_CLIENT_SECRET:=CHANGE_ME}"

escape_sed_replacement() {
  # Google OAuth client IDs/secrets do not normally contain JSON quotes.
  # Escape only sed replacement metacharacters for the | delimiter.
  printf '%s' "$1" | sed -e 's/[&|]/\\&/g'
}

mkdir -p "$TARGET_DIR"

WEB_SECRET_ESCAPED=$(escape_sed_replacement "$PICKLE_WEB_CLIENT_SECRET")
GOOGLE_CLIENT_ID_ESCAPED=$(escape_sed_replacement "$GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET_ESCAPED=$(escape_sed_replacement "$GOOGLE_CLIENT_SECRET")

sed   -e "s|__PICKLE_WEB_CLIENT_SECRET__|$WEB_SECRET_ESCAPED|g"   -e "s|__GOOGLE_CLIENT_ID__|$GOOGLE_CLIENT_ID_ESCAPED|g"   -e "s|__GOOGLE_CLIENT_SECRET__|$GOOGLE_CLIENT_SECRET_ESCAPED|g"   "$TEMPLATE" > "$TARGET"

exec /opt/keycloak/bin/kc.sh "$@"
