#!/usr/bin/env bash
#
# Verifikasi jalur sesi terhadap server yang sudah menyala — dijalankan setelah rilis, dari
# mesin mana pun. Yang dibuktikan bukan "login bisa", melainkan empat hal yang masing-masing
# pernah gagal sendiri-sendiri di produksi:
#
#   1. cookie sesi terbit dengan cakupan yang benar (`Domain`, `Secure`, `SameSite`);
#   2. cookie itu benar-benar dibaca kembali oleh `/auth/me`;
#   3. penyegaran memutar token tanpa mengeluarkan siapa pun;
#   4. nama cookie yang datang dua kali tidak lagi memenangkan salinan yang basi — kelas bug
#      yang mengunci setiap akun lama setelah `COOKIE_DOMAIN` dipasang.
#
# Nomor 4 adalah alasan berkas ini ada. Ia tidak bisa muncul di mesin pengembang: di sana web dan
# API berbagi satu host, `COOKIE_DOMAIN` kosong, dan cookie ganda tidak pernah lahir.
#
# Pemakaian:
#   VERIFY_EMAIL=... VERIFY_PASSWORD=... bash scripts/verify-session.sh
#   VERIFY_EMAIL=... VERIFY_PASSWORD=... API_BASE=http://127.0.0.1:3001 WEB_ORIGIN=http://127.0.0.1:3000 \
#     bash scripts/verify-session.sh
#
# Kata sandinya lewat lingkungan, tidak pernah lewat argumen: argumen terbaca di `ps` oleh siapa
# pun yang sedang masuk ke mesin yang sama.

set -eu

API_BASE="${API_BASE:-https://api.arunadewa.id}"
WEB_ORIGIN="${WEB_ORIGIN:-https://arunadewa.id}"
: "${VERIFY_EMAIL:?setel VERIFY_EMAIL}"
: "${VERIFY_PASSWORD:?setel VERIFY_PASSWORD}"

JAR="$(mktemp -t aruna-session-jar)"
HEAD="$(mktemp -t aruna-session-head)"
trap 'rm -f "$JAR" "$HEAD"' EXIT

gagal=0
lulus() { printf '  ok   %s\n' "$1"; }
cacat() { printf '  GAGAL %s\n' "$1"; gagal=1; }
periksa() { if [ "$1" = "$2" ]; then lulus "$3 ($1)"; else cacat "$3: dapat $1, seharusnya $2"; fi; }

host_dari() { printf '%s' "${1#*//}" | cut -d/ -f1 | cut -d: -f1; }
nilai_cookie() { awk -v n="$1" '$6 == n { v = $7 } END { print v }' "$JAR"; }
# Header `set-cookie` terakhir untuk satu nama, apa adanya termasuk atributnya.
set_cookie() { set_cookie_semua "$1" | tail -n 1; }
# Semua header `set-cookie` untuk satu nama. Satu respons bisa membawa dua: pengusiran salinan
# warisan (tanpa Domain, kedaluwarsa) diikuti penerbitan yang baru — dua cookie berbeda.
set_cookie_semua() { tr -d '\r' < "$HEAD" | awk -v n="$1" 'tolower($1) == "set-cookie:" && $2 ~ "^" n "=" { print }'; }

printf '\nSasaran: %s (asal web %s)\n\n' "$API_BASE" "$WEB_ORIGIN"

# ── 1. Masuk ────────────────────────────────────────────────────────────────────────────────
printf '1. POST /v1/auth/login\n'
kode="$(curl -sS --max-time 20 -o /dev/null -D "$HEAD" -c "$JAR" -w '%{http_code}' \
  -X POST "$API_BASE/v1/auth/login" \
  -H "Origin: $WEB_ORIGIN" -H 'Content-Type: application/json' \
  --data "$(printf '{"email":%s,"password":%s}' "\"$VERIFY_EMAIL\"" "\"$VERIFY_PASSWORD\"")")"
periksa "$kode" 200 'status'

for nama in aruna_access aruna_refresh; do
  baris="$(set_cookie "$nama")"
  if [ -z "$baris" ]; then cacat "$nama tidak diterbitkan"; continue; fi
  case "$baris" in *SameSite=Lax*) lulus "$nama SameSite=Lax" ;; *) cacat "$nama tanpa SameSite=Lax" ;; esac
  # `Secure` dan `Domain` hanya wajib saat host web dan host API memang berbeda; di loopback
  # keduanya justru salah — lihat `apps/api/src/common/cookie-domain.ts`.
  if [ "$(host_dari "$API_BASE")" != "$(host_dari "$WEB_ORIGIN")" ]; then
    case "$baris" in *Secure*) lulus "$nama Secure" ;; *) cacat "$nama tanpa Secure" ;; esac
    case "$baris" in *[Dd]omain=*) lulus "$nama ber-Domain" ;; *) cacat "$nama host-only padahal host web dan API berbeda" ;; esac
  fi
done

# ── 2. Sesi terbaca kembali ─────────────────────────────────────────────────────────────────
printf '2. GET /v1/auth/me\n'
periksa "$(curl -sS --max-time 20 -o /dev/null -b "$JAR" -w '%{http_code}' "$API_BASE/v1/auth/me")" 200 'status'

# ── 3. Penyegaran memutar token ─────────────────────────────────────────────────────────────
printf '3. POST /v1/auth/refresh\n'
sebelum="$(nilai_cookie aruna_refresh)"
periksa "$(curl -sS --max-time 20 -o /dev/null -b "$JAR" -c "$JAR" -w '%{http_code}' \
  -X POST "$API_BASE/v1/auth/refresh" -H "Origin: $WEB_ORIGIN")" 200 'status'
sesudah="$(nilai_cookie aruna_refresh)"
if [ -n "$sesudah" ] && [ "$sebelum" != "$sesudah" ]; then lulus 'token berputar'; else cacat 'token tidak berputar'; fi

# ── 4. Cookie ganda: yang basi tidak boleh menang ───────────────────────────────────────────
printf '4. POST /v1/auth/refresh dengan aruna_refresh ganda (basi dulu, yang sah belakangan)\n'
asli="$(nilai_cookie aruna_refresh)"
kode="$(curl -sS --max-time 20 -o /dev/null -D "$HEAD" -w '%{http_code}' \
  -X POST "$API_BASE/v1/auth/refresh" -H "Origin: $WEB_ORIGIN" \
  -H "Cookie: aruna_refresh=basi.basi; aruna_refresh=$asli")"
# Sebelum perbaikan Fase 29 jawabannya 401: `cookie-parser` memenangkan kemunculan pertama.
periksa "$kode" 200 'status'
# Salinan warisan diusir tanpa `Domain` — hanya bentuk itu yang cocok dengan cookie host-only.
# Dicari di antara SEMUA baris `set-cookie`, bukan yang terakhir: respons yang sama juga membawa
# cookie baru hasil rotasi, dan itulah yang tercetak belakangan.
if [ "$(host_dari "$API_BASE")" != "$(host_dari "$WEB_ORIGIN")" ]; then
  usiran="$(set_cookie_semua aruna_refresh | grep -F 'Expires=Thu, 01 Jan 1970' || true)"
  if [ -z "$usiran" ]; then
    cacat 'cookie warisan tidak diusir; middleware legacy-session-cookie tidak berjalan'
  elif printf '%s' "$usiran" | grep -qiF 'domain='; then
    cacat 'pengusiran membawa Domain, jadi ia menghapus cookie yang justru sedang sah'
  else
    lulus 'cookie warisan diusir tanpa Domain'
  fi
fi

# ── 5. Keluar ───────────────────────────────────────────────────────────────────────────────
printf '5. POST /v1/auth/logout\n'
periksa "$(curl -sS --max-time 20 -o /dev/null -b "$JAR" -c "$JAR" -w '%{http_code}' \
  -X POST "$API_BASE/v1/auth/logout" -H "Origin: $WEB_ORIGIN")" 204 'status'

printf '\n'
if [ "$gagal" -eq 0 ]; then printf 'Semua lulus.\n'; else printf 'Ada yang gagal.\n'; fi
exit "$gagal"
