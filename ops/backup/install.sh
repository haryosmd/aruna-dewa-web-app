#!/usr/bin/env bash
#
# Pasang backup harian di server. Dijalankan sebagai root DI VPS, idempoten:
#   sudo ops/backup/install.sh
#
# Yang TIDAK dilakukan skrip ini, dan sengaja:
#   - membuat kunci age (upacara sekali jalan di laptop; lihat README.md)
#   - menulis /srv/aruna/backup.env (berisi rahasia)
#   - menulis rclone.conf (berisi kredensial)
# Ketiganya butuh keputusan manusia, dan ketiganya akan diperiksa di bawah.
set -euo pipefail

[ "$(id -u)" = "0" ] || { echo "Jalankan sebagai root." >&2; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"
LIB=/usr/local/lib/aruna
ETC=/etc/aruna

echo "== prasyarat =="
missing=0
for bin in docker age rclone curl; do
  if command -v "$bin" >/dev/null 2>&1; then
    printf '  ada     %s\n' "$bin"
  else
    printf '  HILANG  %s\n' "$bin"; missing=$((missing + 1))
  fi
done
[ "$missing" -eq 0 ] || {
  echo "Pasang dulu yang hilang. age: apt install age. rclone: apt install rclone." >&2; exit 1; }

echo "== recipients age =="
# Berkas recipient yang menyimpang dari repo adalah kegagalan paling sunyi yang mungkin terjadi:
# backup tetap "berhasil" tiap malam, terenkripsi ke kunci yang privatnya tidak ada di mana pun,
# dan ketahuannya baru saat kamu butuh restore. Karena itu dibandingkan, bukan sekadar disalin.
grep -qE '^age1[a-z0-9]+$' "$HERE/recipients.txt" || {
  echo "recipients.txt belum berisi satu pun kunci publik age. Kerjakan upacara kunci di README.md." >&2
  exit 1; }
install -d -m 755 "$ETC"
install -m 644 "$HERE/recipients.txt" "$ETC/backup-recipients.txt"
echo "  $(grep -cE '^age1' "$ETC/backup-recipients.txt") penerima terpasang di $ETC/backup-recipients.txt"

echo "== skrip =="
install -d -m 755 "$LIB"
install -m 755 "$HERE/backup.sh" "$LIB/backup.sh"
[ -f "$HERE/../rollback.sh" ] && install -m 755 "$HERE/../rollback.sh" "$LIB/rollback.sh"
install -d -m 700 /var/backups/aruna
echo "  $LIB/backup.sh, $LIB/rollback.sh, /var/backups/aruna"

echo "== konfigurasi yang harus kamu isi sendiri =="
ENVFILE=/srv/aruna/backup.env
[ -f "$ENVFILE" ] || {
  echo "  $ENVFILE belum ada. Salin dari ops/backup/backup.env.example, isi, lalu chmod 600." >&2
  exit 1; }
[ "$(stat -c '%a' "$ENVFILE")" = "600" ] || {
  echo "  $ENVFILE harus mode 600 (sekarang $(stat -c '%a' "$ENVFILE")). Ia berisi rahasia." >&2
  exit 1; }
for key in HC_URL REMOTE; do
  grep -qE "^$key=.+" "$ENVFILE" || { echo "  $key belum terisi di $ENVFILE." >&2; exit 1; }
done
echo "  $ENVFILE lengkap dan mode 600"

# Kredensial rclone tidak boleh punya izin hapus. Tidak bisa diverifikasi dari sini — dicatat
# supaya orang yang memasang ini membacanya sekali lagi. Lihat README.md bagian bucket.
rclone listremotes | grep -q . || { echo "  Belum ada remote rclone terkonfigurasi." >&2; exit 1; }
echo "  remote rclone: $(rclone listremotes | tr '\n' ' ')"

echo "== unit systemd =="
install -m 644 "$HERE/aruna-backup.service" /etc/systemd/system/aruna-backup.service
install -m 644 "$HERE/aruna-backup.timer"   /etc/systemd/system/aruna-backup.timer
systemctl daemon-reload
systemctl enable --now aruna-backup.timer
systemctl list-timers aruna-backup --no-pager || true

cat <<'NEXT'

Terpasang. Dua langkah berikutnya, dan yang kedua tidak boleh dilewati:

  1. Jalankan sekali manual, perhatikan keluarannya:
       systemctl start aruna-backup.service && journalctl -u aruna-backup -n 60 --no-pager

  2. Drill restore dari LAPTOP, sebelum mempercayai backup ini:
       REMOTE=... AGE_KEY=... ops/backup/drill.sh

     Sampai drill pertama lulus, yang kamu punya adalah berkas terenkripsi di bucket — bukan
     backup. Keduanya terlihat sama persis sampai hari kamu membutuhkannya.
NEXT
