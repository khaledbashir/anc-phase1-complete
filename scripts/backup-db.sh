#!/usr/bin/env bash
# Backup production PostgreSQL database: dump, gzip, prune old backups, log.
# Run from repo root or any dir (script resolves repo root). Schedule with cron for 2:00 AM daily.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
LOG_FILE="$BACKUP_DIR/backup.log"

cd "$ROOT_DIR"

# Load database credentials from .env
if [[ ! -f .env ]]; then
  echo "ERROR: .env not found in $ROOT_DIR" >&2
  exit 1
fi
set -a
# shellcheck source=/dev/null
source .env
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set in .env" >&2
  exit 1
fi

# Extract DB name for filename (e.g. postgres://user:pass@host:port/nata?query -> nata)
if [[ $DATABASE_URL =~ /([^/?]+)(\?|$) ]]; then
  DB_NAME="${BASH_REMATCH[1]}"
else
  DB_NAME="db"
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-${TIMESTAMP}.sql.gz"

# Run pg_dump (use Docker if not installed, e.g. when DB runs in Docker)
run_pg_dump() {
  if command -v pg_dump &>/dev/null; then
    pg_dump "$DATABASE_URL"
  elif command -v docker &>/dev/null; then
    docker run --rm --network host postgres:17 pg_dump "$DATABASE_URL"
  else
    echo "ERROR: pg_dump not found. Install postgresql-client or run with Docker." >&2
    exit 1
  fi
}

if run_pg_dump | gzip > "$BACKUP_FILE"; then
  echo "$(date -Iseconds) SUCCESS backup $BACKUP_FILE" >> "$LOG_FILE"
else
  echo "$(date -Iseconds) FAILED backup $BACKUP_FILE" >> "$LOG_FILE"
  exit 1
fi

# Delete backups older than 30 days
DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -name '*.sql.gz' -mtime +30 -print -delete | wc -l)
if [[ "$DELETED" -gt 0 ]]; then
  echo "$(date -Iseconds) Pruned $DELETED backup(s) older than 30 days" >> "$LOG_FILE"
fi

echo "Backup done: $BACKUP_FILE"
