#!/usr/bin/env bash
# Restore a backup into the database. Usage: scripts/restore-db.sh backups/nata-2026-02-07.sql.gz
# WARNING: For a full replace, drop the target DB first (or restore to a fresh DB).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  echo "Example: $0 backups/nata-2026-02-07.sql.gz" >&2
  exit 1
fi

BACKUP_FILE="$1"
if [[ "$BACKUP_FILE" != /* ]]; then
  BACKUP_FILE="$ROOT_DIR/$BACKUP_FILE"
fi
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: File not found: $BACKUP_FILE" >&2
  exit 1
fi

cd "$ROOT_DIR"
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

run_psql() {
  if command -v psql &>/dev/null; then
    psql "$DATABASE_URL"
  elif command -v docker &>/dev/null; then
    docker run --rm -i --network host postgres:17 psql "$DATABASE_URL"
  else
    echo "ERROR: psql not found. Install postgresql-client or run with Docker." >&2
    exit 1
  fi
}

echo "Restoring $BACKUP_FILE into database..."
gunzip -c "$BACKUP_FILE" | run_psql
echo "Restore finished."
