#!/usr/bin/env bash
# ============================================================
# Maqolalar — PostgreSQL kunlik backup (docker-compose.prod uchun)
# ============================================================
# Ishlatish (backend papkasida):
#   bash deploy/backup.sh
#
# Cron bilan har kuni 02:30 da (crontab -e):
#   30 2 * * * cd /opt/maqolalar/backend && bash deploy/backup.sh >> /var/log/maqolalar-backup.log 2>&1
#
# Tiklash (restore):
#   gunzip -c backups/maqolalar_maqolalar_2026-06-23_023000.sql.gz \
#     | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d maqolalar
#
# MUHIM: backups/ papkasini boshqa joyga (S3, boshqa disk) ham nusxalang —
# server o'lsa, undagi backup ham yo'qoladi. Pastda "Off-site" izohiga qarang.
# ============================================================
set -euo pipefail

# --- Sozlamalar (env orqali bekor qilish mumkin) ---
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SERVICE="${PG_SERVICE:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# DB kreditallarini .env dan o'qiymiz (POSTGRES_USER / POSTGRES_DB)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
PG_USER="${POSTGRES_USER:-postgres}"
PG_DB="${POSTGRES_DB:-maqolalar}"

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y-%m-%d_%H%M%S)"
OUT="$BACKUP_DIR/maqolalar_${PG_DB}_${TS}.sql.gz"

echo "[$(date)] Backup boshlandi -> $OUT"

# pg_dump konteyner ichida ishlaydi, oqim host'da gzip qilinadi.
# --clean --if-exists: tiklashda eski jadvallar avval tashlanadi (toza restore).
docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE" \
  pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner --clean --if-exists \
  | gzip > "$OUT"

# Bo'sh yoki buzilgan faylni qoldirmaymiz (xato bo'lsa darrov bilamiz).
if [ ! -s "$OUT" ]; then
  echo "[$(date)] XATO: backup fayli bo'sh — o'chirildi" >&2
  rm -f "$OUT"
  exit 1
fi

SIZE="$(du -h "$OUT" | cut -f1)"
echo "[$(date)] Backup tayyor: $OUT ($SIZE)"

# Rotatsiya: RETENTION_DAYS kundan eski backuplarni o'chiramiz.
find "$BACKUP_DIR" -name 'maqolalar_*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Rotatsiya tugadi (>${RETENTION_DAYS} kun o'chirildi)"

# ============================================================
# Off-site (tavsiya): backup'ni serverdan tashqariga ham yuboring.
# Misol (AWS S3):
#   aws s3 cp "$OUT" "s3://maqolalar-backups/$(basename "$OUT")"
# Yoki rsync bilan boshqa serverga:
#   rsync -az "$OUT" backup-user@backup-host:/srv/maqolalar-backups/
# ============================================================
