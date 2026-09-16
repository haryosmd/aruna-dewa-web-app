#!/usr/bin/env bash
#
# Pulihkan satu dump dari bucket. DIJALANKAN DARI LAPTOP, tidak pernah dari VPS.
#
# Itu bukan preferensi gaya: kunci privat age ada di laptop dan tidak pernah ada di server, jadi
# server secara struktural tidak bisa mendekripsi backup-nya sendiri. Batasan keamanan dan
# batasan operasional kebetulan sejajar di sini — restore produksi yang tidak disengaja menjadi
# mustahil, bukan sekadar tidak dianjurkan.
#
#   ./restore.sh <objek-remote> [drill|local]
#   ./restore.sh postgres/daily/aruna-20260916T031701Z.dump.age drill
#
# Butuh di lingkungan: REMOTE, AGE_KEY. Muat dari berkas lokalmu, mis:
#   set -a; . ~/.config/aruna/drill.env; set +a
set -euo pipefail

OBJECT="${1:?Objek remote wajib, mis. postgres/daily/aruna-<stamp>.dump.age}"
TARGET="${2:-drill}"
: "${REMOTE:?REMOTE wajib disetel (remote rclone + bucket)}"
: "${AGE_KEY:?AGE_KEY wajib menunjuk berkas kunci privat age di mesin ini}"

# Versi image dipaku ke yang dipakai produksi. pg_restore dari server minor yang lebih baru ke
# yang lebih lama gagal — dan itu harus ketahuan di drill, bukan saat krisis.
PG_IMAGE="${PG_IMAGE:-postgres:17-alpine}"
DRILL_NAME="${DRILL_NAME:-aruna-drill}"
DRILL_PORT="${DRILL_PORT:-55432}"
DRILL_PASSWORD="${DRILL_PASSWORD:-drill}"

case "$TARGET" in
  prod|production)
    # Ditolak dengan sengaja. Restore produksi adalah keputusan sadar dengan prosedur tertulis
    # di README.md — bukan flag yang bisa terketik saat panik jam 2 pagi.
    echo "Target 'prod' ditolak. Baca bagian 'Restore produksi' di ops/backup/README.md." >&2
    exit 2 ;;
  drill|local) ;;
  *) echo "Target tidak dikenal: $TARGET (drill|local)" >&2; exit 2 ;;
esac

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "== unduh =="
rclone copyto "$REMOTE/$OBJECT" "$WORK/dump.age"

echo "== dekripsi =="
age -d -i "$AGE_KEY" -o "$WORK/aruna.dump" "$WORK/dump.age"
echo "  $(wc -c < "$WORK/aruna.dump") byte"

if [ "$TARGET" = "local" ]; then
  : "${DATABASE_URL:?DATABASE_URL wajib untuk target local}"
  echo "== restore ke database pengembangan =="
  docker run --rm -i -v "$WORK/aruna.dump:/dump:ro" --network host "$PG_IMAGE" \
    pg_restore --no-owner --no-privileges --clean --if-exists -d "$DATABASE_URL" /dump
  echo "Selesai."
  exit 0
fi

echo "== nyalakan Postgres sekali pakai ($PG_IMAGE, port $DRILL_PORT) =="
docker rm -f "$DRILL_NAME" >/dev/null 2>&1 || true
docker run -d --name "$DRILL_NAME" \
  -e POSTGRES_USER=aruna -e POSTGRES_DB=aruna -e POSTGRES_PASSWORD="$DRILL_PASSWORD" \
  -p "$DRILL_PORT:5432" "$PG_IMAGE" >/dev/null

# Polling, bukan sleep: waktu siap postgres bervariasi menurut beban mesin, dan `sleep` yang
# kependekan gagal sebagai "pg_restore tidak bisa menyambung" — jauh dari penyebabnya.
ready=0
for _ in $(seq 1 60); do
  if docker exec "$DRILL_NAME" pg_isready -U aruna -d aruna >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[ "$ready" = 1 ] || { echo "Postgres drill tidak pernah siap dalam 60 detik." >&2; exit 1; }

echo "== pg_restore =="
docker cp "$WORK/aruna.dump" "$DRILL_NAME:/tmp/aruna.dump"
docker exec -e PGPASSWORD="$DRILL_PASSWORD" "$DRILL_NAME" \
  pg_restore --no-owner --no-privileges --clean --if-exists -U aruna -d aruna /tmp/aruna.dump

echo
echo "Database hasil restore siap di 127.0.0.1:$DRILL_PORT (container '$DRILL_NAME')."
echo "  postgresql://aruna:$DRILL_PASSWORD@127.0.0.1:$DRILL_PORT/aruna"
echo "Bersihkan dengan: docker rm -f $DRILL_NAME"
