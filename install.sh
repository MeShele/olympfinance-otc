#!/usr/bin/env bash
# =============================================================================
# Olymp Finance OTC — self-host installer.
# =============================================================================
# Stands up the Olymp Finance exchange on a fresh Linux host. Cloud Supabase
# is the backend (auth, database, edge functions, storage), so the
# only thing this script provisions is the static frontend container
# behind Caddy with automatic Let's Encrypt SSL.
#
# Usage (interactive):
#   curl -fsSL https://olympfinance.kg/install.sh | bash
#
# Usage (non-interactive — useful for CI):
#   DOMAIN=olympfinance.kg \
#   ADMIN_EMAIL=ops@olympfinance.kg \
#   SUPABASE_URL=https://xxx.supabase.co \
#   SUPABASE_KEY=eyJh... \
#   bash install.sh --yes
#
# What it does:
#   1. Verifies the host (Linux + root + Docker)
#   2. Asks for: domain, admin email, Supabase URL, Supabase publishable key
#   3. Writes .env with those values
#   4. Pulls/builds the exchange image
#   5. Brings up docker compose + a Caddy reverse proxy with auto-TLS
#
# What it does NOT do (compared to the platform installer):
#   - No central license-manager handshake — the OTC client owns the
#     code and runs autonomously.
#   - No OTA update banner / heartbeat back to a central server.
#   - No Postgres / Kong / GoTrue / PostgREST containers — backend is
#     a Cloud Supabase project the operator manages separately.
#   - No multi-tenant routing — single domain, one operator.
# =============================================================================

set -euo pipefail

ASSUME_YES=0
[ "${1:-}" = "--yes" ] && ASSUME_YES=1

log() { echo -e "\033[1;36m[install]\033[0m $*"; }
err() { echo -e "\033[1;31m[error]\033[0m $*" >&2; }

ask() {
  local prompt="$1" default="${2:-}" var
  if [ "$ASSUME_YES" = "1" ] && [ -n "$default" ]; then
    echo "$default"
    return
  fi
  if [ -n "$default" ]; then
    read -r -p "$prompt [$default]: " var || true
    echo "${var:-$default}"
  else
    read -r -p "$prompt: " var || true
    echo "$var"
  fi
}

# -----------------------------------------------------------------------------
# Step 1: prereqs
# -----------------------------------------------------------------------------

[ "$(id -u)" -eq 0 ] || { err "Run as root (or via sudo)."; exit 1; }
[ "$(uname)" = "Linux" ] || { err "Linux only."; exit 1; }

if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  err "Docker Compose v2 missing. Re-run docker installer or install manually."
  exit 1
fi

# -----------------------------------------------------------------------------
# Step 2: collect inputs
# -----------------------------------------------------------------------------

DOMAIN="${DOMAIN:-$(ask 'Домен (например olympfinance.kg)')}"
ADMIN_EMAIL="${ADMIN_EMAIL:-$(ask 'Email администратора (для Let'\''s Encrypt)')}"
SUPABASE_URL="${SUPABASE_URL:-$(ask 'Supabase Project URL (https://xxx.supabase.co)')}"
SUPABASE_KEY="${SUPABASE_KEY:-$(ask 'Supabase publishable key (anon JWT или sb_publishable_*)')}"

[ -z "$DOMAIN" ] && { err "DOMAIN required"; exit 1; }
[ -z "$ADMIN_EMAIL" ] && { err "ADMIN_EMAIL required"; exit 1; }
[ -z "$SUPABASE_URL" ] && { err "SUPABASE_URL required"; exit 1; }
[ -z "$SUPABASE_KEY" ] && { err "SUPABASE_KEY required"; exit 1; }

INSTALL_DIR="${INSTALL_DIR:-/opt/olymp}"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# -----------------------------------------------------------------------------
# Step 3: write .env
# -----------------------------------------------------------------------------

cat >"$INSTALL_DIR/.env" <<ENV
DOMAIN=$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_KEY
ENV
chmod 600 "$INSTALL_DIR/.env"
log "Wrote $INSTALL_DIR/.env (mode 600)."

# -----------------------------------------------------------------------------
# Step 4: docker-compose.yaml
# -----------------------------------------------------------------------------
# Caddy fronts the static container and handles cert issuance from
# Let's Encrypt. The operator can swap it for an existing nginx /
# Traefik setup by repointing the upstream.
# -----------------------------------------------------------------------------

cat >"$INSTALL_DIR/docker-compose.yaml" <<'YAML'
services:
  exchange:
    image: ghcr.io/olympfinance/olympfinance-otc:latest
    container_name: olympfinance-exchange
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
    expose:
      - "80"
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    container_name: olymp-caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    restart: unless-stopped
    depends_on:
      - exchange

volumes:
  caddy-data:
  caddy-config:
YAML

cat >"$INSTALL_DIR/Caddyfile" <<CADDY
{
  email $ADMIN_EMAIL
}

$DOMAIN, www.$DOMAIN {
  reverse_proxy exchange:80
  encode gzip zstd
  header {
    Strict-Transport-Security "max-age=31536000"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "SAMEORIGIN"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}
CADDY

# -----------------------------------------------------------------------------
# Step 5: bring it up
# -----------------------------------------------------------------------------

log "Pulling images and starting…"
docker compose -f "$INSTALL_DIR/docker-compose.yaml" pull
docker compose -f "$INSTALL_DIR/docker-compose.yaml" up -d

log "Waiting for Caddy to issue the certificate (this can take a minute)…"
sleep 8

if curl -sI "https://$DOMAIN" >/dev/null 2>&1; then
  log "✓ Установка завершена — открой https://$DOMAIN"
else
  log "Готово, но https:// пока не отвечает. Проверь: docker compose logs caddy"
fi
