#!/usr/bin/env bash
#
# Kembalikan produksi ke image rilis sebelumnya. Dipasang di /usr/local/lib/aruna/rollback.sh
# oleh ops/backup/install.sh, dijalankan di VPS:
#
#   ssh aruna sudo /usr/local/lib/aruna/rollback.sh
#
# Sebelumnya ini tiga baris yang dicetak oleh langkah deploy yang gagal, untuk diketik ulang
# saat panik. Tiga baris yang diketik ulang jam 2 pagi adalah tiga kesempatan salah ketik.
#
# BATASNYA, dan ini penting: aman selama migrasi rilis yang di-rollback bersifat aditif. Migrasi
# Prisma maju-saja — kalau rilis terakhir menghapus atau mengubah kolom, image lama tidak akan
# cocok dengan skema yang sudah berubah, dan yang kamu butuhkan adalah restore, bukan rollback.
set -euo pipefail

cd "${COMPOSE_DIR:-/srv/aruna}"

[ -f .image.env.previous ] || {
  echo "Tidak ada .image.env.previous — belum pernah ada rilis kedua di server ini." >&2; exit 1; }

current="$(sed -n 's/^ARUNA_IMAGE=//p' .image.env 2>/dev/null || true)"
previous="$(sed -n 's/^ARUNA_IMAGE=//p' .image.env.previous)"
[ -n "$previous" ] || { echo ".image.env.previous tidak memuat ARUNA_IMAGE." >&2; exit 1; }

echo "sekarang   : ${current:-(tidak diketahui)}"
echo "kembali ke : $previous"

if [ "${ASSUME_YES:-}" != "1" ] && [ -t 0 ]; then
  printf 'Lanjut? [y/N] '; read -r answer
  case "$answer" in y|Y|ya|Ya) ;; *) echo "Dibatalkan."; exit 1 ;; esac
fi

# Ditukar, bukan ditimpa: satu rollback yang salah sasaran harus bisa dibalik lagi tanpa
# menebak-nebak tag mana yang tadi sedang jalan.
cp .image.env .image.env.rollback-from 2>/dev/null || true
cp .image.env.previous .image.env

compose="docker compose -f compose.prod.yaml --env-file .env --env-file .image.env"
$compose pull
$compose up -d

echo
echo "Menunggu /ready..."
# Ditanyakan dari dalam container, bukan lewat Caddy di port 80. Caddy menjawab 308 ke https,
# dan `curl -f` tidak menganggap 3xx sebagai gagal — pemeriksaannya akan lulus walau API mati.
# Bentuk ini sama persis dengan healthcheck `api` di compose.prod.yaml.
probe='fetch("http://127.0.0.1:3001/ready").then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))'
ok=0
for _ in $(seq 1 18); do
  if $compose exec -T api node -e "$probe" >/dev/null 2>&1; then ok=1; break; fi
  sleep 5
done
[ "$ok" = 1 ] && echo "Rollback selesai, /ready menjawab 200." || {
  echo "::error::/ready tidak menjawab setelah rollback. Periksa: $compose logs --tail 50 api" >&2
  exit 1; }
