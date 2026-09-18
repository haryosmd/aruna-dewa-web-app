#!/usr/bin/env bash
#
# Drill restore. DIJALANKAN DARI LAPTOP, bulanan, dan setelah tiap migrasi Prisma yang menyentuh
# tabel besar.
#
# Backup yang belum pernah dipulihkan adalah hipotesis, bukan backup. Melihat `pg_restore` keluar
# 0 tidak membuktikan apa pun — yang membuktikan ada di assertion di bawah.
#
#   ./drill.sh                 # ambil dump harian terbaru
#   ./drill.sh postgres/monthly/aruna-<stamp>.dump.age
#
# Butuh: REMOTE, AGE_KEY, dan HC_DRILL_URL (opsional tapi sangat dianjurkan).
set -euo pipefail

cd "$(dirname "$0")"
: "${REMOTE:?REMOTE wajib disetel}"
: "${AGE_KEY:?AGE_KEY wajib disetel}"
DRILL_NAME="${DRILL_NAME:-aruna-drill}"
DRILL_PORT="${DRILL_PORT:-55432}"
DRILL_PASSWORD="${DRILL_PASSWORD:-drill}"
MAX_DUMP_AGE_DAYS="${MAX_DUMP_AGE_DAYS:-3}"
APP_IMAGE="${APP_IMAGE:-ghcr.io/haryosmd/aruna-dewa-web-app:latest}"
API_NAME="${API_NAME:-aruna-drill-api}"
API_PORT="${API_PORT:-13001}"

ping() { [ -n "${HC_DRILL_URL:-}" ] && curl -fsS -m 10 -o /dev/null "$@" || true; }
cleanup() { docker rm -f "$API_NAME" "$DRILL_NAME" >/dev/null 2>&1 || true; }
fail() { echo; echo "DRILL GAGAL."; ping "${HC_DRILL_URL:-}/fail"; }
trap fail ERR
trap cleanup EXIT

OBJECT="${1:-}"
if [ -z "$OBJECT" ]; then
  # Terbaru menurut nama, dan itu sah: stempelnya ISO-8601 UTC, jadi urutan leksikal = urutan waktu.
  latest="$(rclone lsf "$REMOTE/postgres/daily/" | sort | tail -1)"
  [ -n "$latest" ] || { echo "Tidak ada objek di $REMOTE/postgres/daily/" >&2; exit 1; }
  OBJECT="postgres/daily/$latest"
fi
echo "Objek: $OBJECT"

# Assertion 0 — umur dump. Yang ini menangkap kesalahan paling manusiawi: mendrill arsip lama
# dan menyimpulkan backup-nya sehat, padahal yang harian sudah berhenti berjalan berhari-hari.
python3 - "$OBJECT" "$MAX_DUMP_AGE_DAYS" <<'PY'
import re, sys, datetime
m = re.search(r'aruna-(\d{8}T\d{6}Z)', sys.argv[1])
if not m:
    sys.exit(f"Nama objek tidak memuat stempel waktu: {sys.argv[1]}")
made = datetime.datetime.strptime(m.group(1), '%Y%m%dT%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
age = (datetime.datetime.now(datetime.timezone.utc) - made).total_seconds() / 86400
print(f"  dibuat {made:%Y-%m-%d %H:%M} UTC, umur {age:.1f} hari")
if age > float(sys.argv[2]):
    sys.exit(f"GAGAL: dump berumur {age:.1f} hari, lebih dari {sys.argv[2]}. Backup harian berhenti?")
PY

REMOTE="$REMOTE" AGE_KEY="$AGE_KEY" DRILL_NAME="$DRILL_NAME" DRILL_PORT="$DRILL_PORT" \
  DRILL_PASSWORD="$DRILL_PASSWORD" ./restore.sh "$OBJECT" drill

q() { docker exec -e PGPASSWORD="$DRILL_PASSWORD" "$DRILL_NAME" psql -U aruna -d aruna -tAc "$1"; }

echo
echo "== assertion a: tabel inti tidak kosong =="
for t in User Invitation Guest Order Package; do
  n="$(q "SELECT count(*) FROM \"$t\"")"
  printf '  %-12s %s\n' "$t" "$n"
  [ "$n" -gt 0 ] || { echo "GAGAL: tabel $t kosong setelah restore." >&2; exit 1; }
done

echo
echo "== assertion b: katalog terisi =="
# Tanpa Package aktif, halaman /order tidak punya apa pun untuk dijual — payments/orders.service.ts
# membacanya dari database, bukan dari @aruna/contracts.
active="$(q 'SELECT count(*) FROM "Package" WHERE active')"
echo "  paket aktif: $active"
[ "$active" -ge 1 ] || { echo "GAGAL: tidak ada paket aktif." >&2; exit 1; }

echo
echo "== assertion c: skema cocok dengan commit ini =="
# Restore yang berhasil ke skema yang tertinggal enam migrasi adalah restore yang aplikasinya
# tidak bisa boot di atasnya.
# Prisma memuat packages/database/.env dan akan mengumumkannya di keluaran, tapi dotenv tidak
# menimpa variabel yang sudah ada di lingkungan — jadi nilai di baris ini yang menang, dan yang
# diperiksa memang container drill. Diverifikasi, bukan diasumsikan.
DATABASE_URL="postgresql://aruna:$DRILL_PASSWORD@127.0.0.1:$DRILL_PORT/aruna" \
  pnpm --dir ../.. --filter @aruna/database exec prisma migrate status

echo
echo "== assertion d: media yang disebut DB benar-benar ada di bucket =="
# Ini yang menangkap dump sempurna yang separuh fotonya tidak pernah terunggah — kelas kegagalan
# yang paling mahal, karena foto pernikahan tidak bisa dibuat ulang.
#
# TANPA filter provider, dan itu bukan penyederhanaan. Filter `provider = 'LOCAL'` benar selama
# hanya ada satu provider; setelah media pindah ke bucket ia memeriksa himpunan yang menyusut jadi
# kosong — dan cabang "tidak ada yang bisa diperiksa" di bawah membuat drill-nya tetap LULUS.
# Assertion yang berhenti mengukur sambil tetap hijau lebih buruk daripada tidak ada assertion.
keys="$(q "SELECT key FROM \"MediaAsset\" ORDER BY random() LIMIT 20")"
if [ -z "$keys" ]; then
  echo "  (belum ada MediaAsset sama sekali — tidak ada yang bisa diperiksa)"
else
  missing=0
  while IFS= read -r k; do
    [ -z "$k" ] && continue
    if rclone lsf "$REMOTE/media/$k.age" >/dev/null 2>&1; then
      printf '  ada     %s\n' "$k"
    else
      printf '  HILANG  %s\n' "$k"; missing=$((missing + 1))
    fi
  done <<< "$keys"
  [ "$missing" -eq 0 ] || { echo "GAGAL: $missing objek media tidak ada di backup." >&2; exit 1; }
fi

echo
echo "== assertion e: aplikasi benar-benar menyala di atas data hasil restore =="
# Bukan "datanya kembali", tapi "aplikasinya jalan di atas data yang kembali". Memakai kontrak
# kesiapan yang sama persis dengan deploy.yml dan healthcheck compose.prod.yaml.
docker rm -f "$API_NAME" >/dev/null 2>&1 || true
docker run -d --name "$API_NAME" --add-host host.docker.internal:host-gateway \
  -e "DATABASE_URL=postgresql://aruna:$DRILL_PASSWORD@host.docker.internal:$DRILL_PORT/aruna" \
  -e JWT_SECRET=drill-only-secret-at-least-32-characters-long \
  -e WEB_ORIGIN=http://127.0.0.1:3000 -e API_ORIGIN=http://127.0.0.1:3001 \
  -e HOST=0.0.0.0 -e PORT=3001 \
  -p "$API_PORT:3001" "$APP_IMAGE" pnpm --filter @aruna/api start >/dev/null

up=0
for _ in $(seq 1 60); do
  if curl -fsS -m 3 "http://127.0.0.1:$API_PORT/ready" >/dev/null 2>&1; then up=1; break; fi
  sleep 1
done
if [ "$up" != 1 ]; then
  echo "GAGAL: API tidak pernah menjawab /ready. Log:" >&2
  docker logs --tail 40 "$API_NAME" >&2 || true
  exit 1
fi
echo "  /ready menjawab 200."

echo
echo "== informasi (tidak menggagalkan drill) =="
# Sengaja informatif, bukan assertion. Bisnis undangan bisa sepi berhari-hari dengan sangat wajar,
# jadi ambang keras di sini akan berbunyi palsu lebih sering daripada benar. Yang menangkap
# "backup berhenti berjalan" adalah dead man's switch harian, bukan baris ini.
for t in User Invitation Order; do
  printf '  %-12s baris terbaru: %s\n' "$t" "$(q "SELECT coalesce(max(\"createdAt\")::text, '-') FROM \"$t\"")"
done

echo
echo "DRILL LULUS."
ping "${HC_DRILL_URL:-}"
