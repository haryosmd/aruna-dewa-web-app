#!/usr/bin/env bash
#
# Backup harian: Postgres (dump penuh) + media (inkremental), terenkripsi ke bucket off-site.
# Dipasang di /usr/local/lib/aruna/backup.sh oleh install.sh, dijalankan aruna-backup.service.
#
# Dua sifat yang membentuk seluruh skrip ini:
#   1. Enkripsi asimetris (age). Server hanya bisa MENGENKRIPSI. Kunci privat tidak pernah ada
#      di sini, jadi penyerang yang menguasai VPS tidak bisa membaca satu pun backup lama.
#   2. Kredensial rclone hanya Put+List, tanpa Delete. Kedaluwarsa dijalankan lifecycle rule di
#      sisi bucket. Backup yang bisa dihapus dari mesin yang dicadangkannya bukan backup.
set -euo pipefail

: "${HC_URL:?HC_URL wajib ada di /srv/aruna/backup.env}"
: "${REMOTE:?REMOTE wajib ada di /srv/aruna/backup.env}"
COMPOSE_DIR="${COMPOSE_DIR:-/srv/aruna}"
RECIPIENTS="${RECIPIENTS:-/etc/aruna/backup-recipients.txt}"
LOCAL_DIR="${LOCAL_DIR:-/var/backups/aruna}"
LOCAL_KEEP="${LOCAL_KEEP:-2}"
MIN_DUMP_BYTES="${MIN_DUMP_BYTES:-51200}"
MEDIA_JOBS="${MEDIA_JOBS:-4}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$(mktemp -d)"
LOG="$(mktemp)"
exec > >(tee -a "$LOG") 2>&1

# ping tidak boleh pernah menjatuhkan backup: healthchecks.io yang sedang down akan membalik
# arah masalahnya, melaporkan gagal untuk backup yang sebenarnya berhasil.
ping() { curl -fsS -m 10 --retry 3 -o /dev/null "$@" || true; }

fail() {
  # Sepuluh kilobyte terakhir ikut ke notifikasi. Alert yang cuma berbunyi "backup gagal"
  # memaksa ssh sebelum kamu tahu ini perlu ditangani sekarang atau besok pagi.
  tail -c 10000 "$LOG" | curl -fsS -m 10 --data-binary @- -o /dev/null "$HC_URL/fail" || true
}
# ERR dipasang sebelum pekerjaan pertama, bukan di akhir: gagal di pg_dump harus berbunyi sama
# kerasnya dengan gagal di rclone.
trap fail ERR
trap 'rm -rf "$WORK" "$LOG"' EXIT

# /start memberi healthchecks.io durasi tiap run. Backup yang perlahan memanjang dari 3 menit
# ke 40 menit adalah peringatan dini yang hanya terlihat kalau durasinya terekam.
ping "$HC_URL/start"

test -s "$RECIPIENTS" || { echo "Berkas recipient age kosong atau tidak ada: $RECIPIENTS"; exit 1; }
mkdir -p "$LOCAL_DIR"; chmod 700 "$LOCAL_DIR"

cd "$COMPOSE_DIR"
compose="docker compose -f compose.prod.yaml --env-file .env"
# .image.env ditulis tiap deploy, tapi belum ada di server yang belum pernah dirilis. Compose
# gagal keras pada --env-file yang tidak ada, dan compose.prod.yaml sudah punya nilai bawaan
# untuk ARUNA_IMAGE — jadi dipasang hanya kalau berkasnya benar-benar ada.
[ -f .image.env ] && compose="$compose --env-file .image.env"
# shellcheck disable=SC1091
POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' .env | cut -d= -f2- || true)"
test -n "$POSTGRES_PASSWORD" || { echo "POSTGRES_PASSWORD tidak terbaca dari $COMPOSE_DIR/.env"; exit 1; }

echo "== 1/5 dump Postgres =="
DUMP="$LOCAL_DIR/aruna-$STAMP.dump"
# `exec`, BUKAN `run --rm`: `run` menyalakan postmaster kedua di atas direktori data yang sama,
# cara tercepat merusak cluster. `-T` melepas TTY, wajib karena keluarannya biner dan dipipe.
# PGPASSWORD dikirim eksplisit walau pg_hba bawaan image mengizinkan trust lokal — menggantungkan
# backup pada nilai bawaan yang bisa berubah saat image naik versi adalah taruhan yang tidak
# berbunyi saat kalah.
$compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  pg_dump -U aruna -d aruna -Fc --compress=9 > "$DUMP"

echo "== 2/5 verifikasi dump sebelum diunggah =="
# pg_dump bisa keluar 0 dan meninggalkan berkas yang pg_restore tidak bisa baca, misalnya saat
# koneksinya putus di tengah. Ini pemeriksaan termurah yang membuktikan arsipnya utuh.
# Berkas di-mount, bukan dialirkan lewat stdin: arsip format custom perlu di-seek, dan stdin
# container bukan berkas yang bisa di-seek. Container sekali pakai supaya pemeriksaan ini tidak
# bergantung pada container postgres yang sedang jalan.
docker run --rm -v "$DUMP:/dump:ro" postgres:17-alpine pg_restore --list /dump > "$WORK/toc.txt"
grep -q 'TABLE DATA public "Invitation"' "$WORK/toc.txt" \
  || { echo "Dump tidak memuat tabel Invitation — skema tidak seperti yang diharapkan."; exit 1; }
SIZE="$(stat -c%s "$DUMP")"
# Ambang absolut, bukan "lebih besar dari nol": dump dari database kosong juga lebih besar dari nol.
[ "$SIZE" -ge "$MIN_DUMP_BYTES" ] \
  || { echo "Dump hanya $SIZE byte, di bawah ambang $MIN_DUMP_BYTES."; exit 1; }
echo "Dump $SIZE byte, daftar isi terbaca."

echo "== 3/5 unggah dump =="
# GFS: satu dump, disalin ke prefix yang retensinya berbeda. Yang menghapus hanyalah lifecycle
# rule di sisi bucket (ops/backup/lifecycle.json) — skrip ini tidak punya izin DeleteObject.
prefixes="daily"
[ "$(date -u +%u)" = "7" ] && prefixes="$prefixes weekly"
[ "$(date -u +%d)" = "01" ] && prefixes="$prefixes monthly"
for prefix in $prefixes; do
  age -R "$RECIPIENTS" -o - -- "$DUMP" | rclone rcat "$REMOTE/postgres/$prefix/aruna-$STAMP.dump.age"
  echo "  -> postgres/$prefix/aruna-$STAMP.dump.age"
done

echo "== 4/5 salin media (inkremental) =="
# Kunci media immutable: media.service.ts memakai randomUUID dan storage.ts menulis dengan
# flag 'wx'. Tidak ada berkas yang pernah ditimpa — hanya ditambah. Itu yang membuat "salin
# yang belum ada" benar secara semantik, bukan sekadar hemat.
#
# `copy`, TIDAK PERNAH `sync`: penghapusan yang salah di produksi akan dikejar ke backup dalam
# 24 jam dan pemulihannya mustahil. Objek yang aset-nya sudah dihapus memang menumpuk di bucket;
# itu konsekuensi sadar, dan harganya kecil.
MEDIA_DIR="$($compose ps -q api | xargs -r docker inspect \
  -f '{{range .Mounts}}{{if eq .Destination "/app/.data/media"}}{{.Source}}{{end}}{{end}}')"
test -n "$MEDIA_DIR" && test -d "$MEDIA_DIR" \
  || { echo "Volume media tidak ditemukan lewat container api."; exit 1; }
echo "  volume: $MEDIA_DIR"

# Daftar remote adalah sumber kebenaran. Tidak ada berkas state lokal yang bisa ikut hilang
# bersama disk yang justru sedang kita cadangkan.
rclone lsf -R --files-only "$REMOTE/media/" 2>/dev/null | sed 's/\.age$//' | sort > "$WORK/remote.txt"
find "$MEDIA_DIR" -type f -printf '%P\n' | sort > "$WORK/local.txt"
comm -23 "$WORK/local.txt" "$WORK/remote.txt" > "$WORK/todo.txt"
echo "  lokal $(wc -l < "$WORK/local.txt"), sudah di bucket $(wc -l < "$WORK/remote.txt"), baru $(wc -l < "$WORK/todo.txt")"

export MEDIA_DIR REMOTE RECIPIENTS
# rcat streaming: disk 58 GB tidak perlu menampung salinan kedua seluruh media dalam bentuk
# terenkripsi. -P supaya ribuan foto tidak diunggah satu per satu secara berurutan.
xargs -r -a "$WORK/todo.txt" -d '\n' -P "$MEDIA_JOBS" -I{} \
  sh -c 'age -R "$RECIPIENTS" -o - -- "$MEDIA_DIR/$1" | rclone rcat "$REMOTE/media/$1.age"' _ {}

echo "== 5/5 verifikasi objek benar-benar ada di remote =="
# rcat yang putus di tengah bisa meninggalkan objek terpotong. Yang ditanya bukan "apakah
# perintahnya keluar 0" tapi "apakah objeknya ada di sana dan ukurannya masuk akal".
REMOTE_SIZE="$(rclone lsjson "$REMOTE/postgres/daily/aruna-$STAMP.dump.age" \
  | sed -n 's/.*"Size":\([0-9]*\).*/\1/p' | head -1)"
[ -n "$REMOTE_SIZE" ] && [ "$REMOTE_SIZE" -ge "$MIN_DUMP_BYTES" ] \
  || { echo "Objek dump tidak ditemukan di remote, atau terpotong (bytes=${REMOTE_SIZE:-kosong})."; exit 1; }
echo "Objek di remote: $REMOTE_SIZE byte."

# Satu-satunya penghapusan yang dilakukan skrip ini, dan objeknya ada di disk lokal — bukan di
# bucket. Dump lokal adalah jalur restore tercepat kalau yang rusak hanya database, bukan server.
ls -1t "$LOCAL_DIR"/aruna-*.dump 2>/dev/null | tail -n "+$((LOCAL_KEEP + 1))" | xargs -r rm -f

df -h / | tail -1

# Satu-satunya jalan ke baris ini: dump utuh, terunggah, terbukti ada di remote, media tersalin.
# Ping sukses berarti tepat itu — bukan "prosesnya tidak crash".
ping "$HC_URL"
echo "Selesai."
