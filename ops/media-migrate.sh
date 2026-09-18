#!/usr/bin/env bash
#
# Pindahkan media dari volume lokal ke bucket. DIJALANKAN DI SERVER:
#
#   ssh aruna sudo MEDIA_REMOTE=aruna-media:aruna-media /usr/local/lib/aruna/media-migrate.sh --copy
#   ssh aruna sudo /usr/local/lib/aruna/media-migrate.sh --status
#   ssh aruna sudo /usr/local/lib/aruna/media-migrate.sh --flip      # jauh belakangan, sadar
#
# Dua perintah terpisah, dan pemisahannya yang menjadi seluruh isi skrip ini.
#
#   --copy  menyalin objek dan MEMBUKTIKAN tiap kunci `MediaAsset` benar-benar ada di bucket.
#           Tidak menyentuh satu baris pun di database. Boleh diulang sesering apa pun.
#   --flip  mengubah baris `LOCAL` jadi `S3`. Ini titik rollback terakhir yang hilang: setelah
#           ini, mengembalikan `MEDIA_PROVIDER: local` tidak lagi memulihkan apa pun, karena
#           `storageForAsset()` memilih dari kolom, dan kolomnya sudah bilang S3.
#
# Urutan yang benar: --copy → backup mencakup bucket → flip `MEDIA_PROVIDER` di compose →
# biarkan beberapa hari → --flip. Yang menahan risikonya urutan ini, bukan kodenya.
set -euo pipefail

cd "${COMPOSE_DIR:-/srv/aruna}"

MODE="${1:-}"
case "$MODE" in
  --copy|--flip|--status) ;;
  *) echo "Pakai: $0 --copy | --status | --flip" >&2; exit 1 ;;
esac

compose="docker compose -f compose.prod.yaml --env-file .env"
[ -f .image.env ] && compose="$compose --env-file .image.env"

POSTGRES_PASSWORD="$(sed -n 's/^POSTGRES_PASSWORD=//p' .env | head -1)"
test -n "$POSTGRES_PASSWORD" || { echo "POSTGRES_PASSWORD tidak terbaca dari $(pwd)/.env" >&2; exit 1; }
q() { $compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres psql -U aruna -d aruna -tAc "$1"; }

hitung() {
  printf '  baris LOCAL : %s\n' "$(q "SELECT count(*) FROM \"MediaAsset\" WHERE provider = 'LOCAL'")"
  printf '  baris S3    : %s\n' "$(q "SELECT count(*) FROM \"MediaAsset\" WHERE provider = 'S3'")"
}

if [ "$MODE" = "--status" ]; then
  hitung
  exit 0
fi

if [ "$MODE" = "--flip" ]; then
  : "${MEDIA_REMOTE:?MEDIA_REMOTE wajib disetel juga untuk --flip: ia memverifikasi ulang sebelum mengubah baris}"
  sisa="$(q "SELECT count(*) FROM \"MediaAsset\" WHERE provider = 'LOCAL'")"
  echo "Akan mengubah $sisa baris LOCAL menjadi S3."
  # Verifikasi ulang, bukan mempercayai bahwa --copy pernah lulus. Di antara keduanya bisa ada
  # unggahan baru, restore database, atau berminggu-minggu. Yang murah diperiksa lagi, diperiksa lagi.
  echo "Memverifikasi ulang sebelum menyentuh satu baris pun..."
  VERIFIKASI_SAJA=1 MEDIA_REMOTE="$MEDIA_REMOTE" "$0" --copy
  q "UPDATE \"MediaAsset\" SET provider = 'S3' WHERE provider = 'LOCAL'" >/dev/null
  echo "Selesai."
  hitung
  exit 0
fi

# ---- --copy ----------------------------------------------------------------------------------
: "${MEDIA_REMOTE:?MEDIA_REMOTE wajib disetel (remote rclone + bucket media, mis. aruna-media:aruna-media)}"

MEDIA_DIR="$($compose ps -q api | xargs -r docker inspect \
  -f '{{range .Mounts}}{{if eq .Destination "/app/.data/media"}}{{.Source}}{{end}}{{end}}')"
test -n "$MEDIA_DIR" && test -d "$MEDIA_DIR" \
  || { echo "Volume media tidak ditemukan lewat container api." >&2; exit 1; }
echo "Volume : $MEDIA_DIR"
echo "Bucket : $MEDIA_REMOTE"
echo

if [ -z "${VERIFIKASI_SAJA:-}" ]; then
  echo "== 1/2 menyalin objek yang belum ada di bucket =="
  # `copy`, TIDAK PERNAH `sync`: kunci media immutable, jadi yang belum ada memang yang baru —
  # dan `sync` akan mengejar penghapusan yang salah di produksi sampai ke bucket.
  # `.probe/` dikecualikan: berkas probe kesiapan bukan media, dan tidak pernah punya baris DB.
  rclone copy --exclude '.probe/**' --transfers 8 "$MEDIA_DIR" "$MEDIA_REMOTE/"
  echo
fi

echo "== 2/2 membuktikan tiap kunci MediaAsset ada di bucket =="
# Bukan "rclone keluar 0", tapi "objeknya ada di sana". Skrip yang menyimpulkan keberhasilan dari
# kode keluar perintah penyalin adalah persis cara separuh foto bisa hilang tanpa ada yang tahu.
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
rclone lsf -R --files-only "$MEDIA_REMOTE/" 2>/dev/null | sort > "$tmp/bucket.txt"
q "SELECT key FROM \"MediaAsset\"" | sort > "$tmp/db.txt"
comm -23 "$tmp/db.txt" "$tmp/bucket.txt" > "$tmp/hilang.txt"

total="$(wc -l < "$tmp/db.txt" | tr -d ' ')"
hilang="$(wc -l < "$tmp/hilang.txt" | tr -d ' ')"
echo "  kunci di DB : $total"
echo "  di bucket   : $(wc -l < "$tmp/bucket.txt" | tr -d ' ')"
if [ "$hilang" -ne 0 ]; then
  echo "  HILANG      : $hilang"
  sed 's/^/    /' "$tmp/hilang.txt"
  echo >&2
  echo "GAGAL: $hilang objek belum ada di bucket. Jangan flip apa pun." >&2
  exit 1
fi
echo "  hilang      : 0"
echo
hitung
echo
echo "Verifikasi lulus."
