#!/usr/bin/env bash
#
# Mode demo lokal dalam satu perintah (fase 64). Jalankan: `pnpm demo` atau `./scripts/demo-local.sh`.
#
# Menyalakan Postgres, kotak surat SMTP, API, dan web dev ber-`NUXT_DEV_DEMO=1`, sesudah memastikan
# skema dan akun demo ada. Ctrl+C mematikan semua yang DINYALAKAN SKRIP INI — tidak pernah yang
# sudah jalan sebelumnya.
#
# Dua hal yang menahan seluruh berkas ini:
#
#   `set -m` — dengan job control menyala, tiap job latar jadi pemimpin grup prosesnya sendiri
#   (`PGID == PID`), jadi satu `kill -TERM -- -$pid` menjangkau `pnpm` → `nest` → `tsx`. Tanpa itu
#   anak berbagi grup dengan skrip, `kill -- -$pid` tidak cocok dengan siapa pun, dan yang tersisa
#   adalah pohon yatim ber-`PPID=1` yang memegang port sampai mesin dimatikan.
#
#   `< /dev/null` pada tiap job latar — di bawah job control, `nest start --watch` dan `nuxt dev`
#   membaca stdin, kena `SIGTTIN`, lalu BERHENTI (state `T`) tanpa satu baris galat pun. Gejalanya
#   cuma "menunggu kesiapan" yang tidak pernah selesai.
#
# Bash 3.2 (bawaan macOS): tanpa associative array, tanpa `mapfile`, tanpa `wait -n`.

set -eu
set -m
# Sengaja tanpa `pipefail`: probe Postgres di bawah memipa `nc` ke `head -c 1`, dan `head` yang
# menutup pipa memang mengirim SIGPIPE ke `nc`.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[ -f "$ROOT/pnpm-workspace.yaml" ] || { echo "Skrip ini harus berada di scripts/ di dalam repo aruna-dewa."; exit 1; }

DEMO_EMAIL='demo@aruna.local'
DEMO_PASSWORD='arunademo123'
WEB_URL='http://127.0.0.1:3000'
API_URL='http://127.0.0.1:3001'
LOG_DIR='.data/logs'

PG_PID=''
MAIL_PID=''
API_PID=''
WEB_PID=''
OWNED_PIDS=''
PG_REUSED=0
MAIL_REUSED=0
API_REUSED=0

# --- keluaran ----------------------------------------------------------------------------------

step() { printf '==> %s\n' "$1"; }
ok()   { printf '    [ok] %s\n' "$1"; }
info() { printf '    %s\n' "$1"; }
warn() { printf '    [!] %s\n' "$1" >&2; }
fail() { printf '\n[gagal] %s\n' "$1" >&2; exit 1; }

tail_log() {
  [ -f "$1" ] || return 0
  printf '\n--- 40 baris terakhir %s ---\n' "$1" >&2
  tail -n 40 "$1" >&2 || true
}

# --- port --------------------------------------------------------------------------------------

# `-G` (batas waktu connect) hanya ada di nc bawaan macOS; kalau yang terpasang varian lain,
# flag tak dikenal membuat tiap probe "gagal" dan skrip menyalakan layanan kedua di port yang
# sudah terpakai.
NC_OPTS='-G 2 -w 2'
if ! nc -h 2>&1 | grep -q -- '-G'; then NC_OPTS='-w 2'; fi

# Selalu ke literal 127.0.0.1: `localhost` ditempuh lewat ::1 lebih dulu, sementara port terbitan
# Docker hanya mengikat IPv4 — "bebas" yang keliru adalah cara paling halus untuk gagal.
# shellcheck disable=SC2086
port_open() { nc -z $NC_OPTS 127.0.0.1 "$1" >/dev/null 2>&1; }

# Hanya untuk jalur galat: `lsof` bisa makan waktu sedetik dan berisik di sebagian mesin.
port_owner() { lsof -nP -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | tail -n +2; }

# Pertanyaannya "ini Postgres atau bukan", bukan "prosesnya bernama apa". Frame `SSLRequest`
# 8 bita; balasan `N` (tanpa TLS) atau `S` (dengan TLS) hanya datang dari Postgres. Embedded dan
# container menjawab sama — itulah kenapa `docker ps` tidak dipakai di sini.
speaks_postgres() {
  reply=$(printf '\x00\x00\x00\x08\x04\xd2\x16\x2f' | nc -w 2 127.0.0.1 "$1" 2>/dev/null | head -c 1 || true)
  [ "$reply" = "N" ] || [ "$reply" = "S" ]
}

# 0 = siap, 1 = kehabisan waktu, 2 = prosesnya mati duluan (ketahuan dalam ~1 detik, bukan 120).
wait_for_port() {
  _port="$1"; _limit="$2"; _pid="${3:-}"; _waited=0
  while [ "$_waited" -lt "$_limit" ]; do
    port_open "$_port" && return 0
    if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then return 2; fi
    sleep 1; _waited=$((_waited + 1))
  done
  return 1
}

wait_for_http() {
  _url="$1"; _limit="$2"; _pid="${3:-}"; _waited=0
  while [ "$_waited" -lt "$_limit" ]; do
    curl -fs -o /dev/null --max-time 3 "$_url" 2>/dev/null && return 0
    if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then return 2; fi
    sleep 1; _waited=$((_waited + 1))
  done
  return 1
}

# Nuxt dev boleh menjawab 404 atau overlay galat saat pemanasan; yang ditunggu cuma "ada yang
# menjawab HTTP". Karena itu tanpa `-f`.
wait_for_any_http() {
  _url="$1"; _limit="$2"; _pid="${3:-}"; _waited=0
  while [ "$_waited" -lt "$_limit" ]; do
    curl -s -o /dev/null --max-time 5 "$_url" && return 0
    if [ -n "$_pid" ] && ! kill -0 "$_pid" 2>/dev/null; then return 2; fi
    sleep 1; _waited=$((_waited + 1))
  done
  return 1
}

# --- pembersihan -------------------------------------------------------------------------------

stop_group() {
  _pid="$1"; _label="$2"
  [ -n "$_pid" ] || return 0
  kill -0 "$_pid" 2>/dev/null || return 0
  printf '    mematikan %s (%s)\n' "$_label" "$_pid"
  kill -TERM -- -"$_pid" 2>/dev/null || true
  _i=0
  while kill -0 -- -"$_pid" 2>/dev/null; do
    _i=$((_i + 1)); if [ "$_i" -gt 28 ]; then break; fi; sleep 0.25
  done
  kill -0 -- -"$_pid" 2>/dev/null && kill -KILL -- -"$_pid" 2>/dev/null
  wait "$_pid" 2>/dev/null || true
}

# Postgres berbeda: postmaster ikut grup pembungkusnya, tapi tiap backend dan `io worker` adalah
# pemimpin sesi sendiri. SIGKILL grup akan meninggalkan backend yatim dan `postmaster.pid` basi
# yang memaksa crash recovery di jalan berikutnya. Jadi: SIGTERM ke pembungkusnya, biar penangan
# `pg.stop()` di local-postgres.mjs yang menutup rapat.
stop_postgres() {
  [ -n "$PG_PID" ] || return 0
  kill -0 "$PG_PID" 2>/dev/null || return 0
  printf '    mematikan postgres (%s)\n' "$PG_PID"
  kill -TERM "$PG_PID" 2>/dev/null || true
  _i=0
  while kill -0 "$PG_PID" 2>/dev/null; do
    _i=$((_i + 1)); if [ "$_i" -gt 60 ]; then break; fi; sleep 0.25
  done
  kill -0 "$PG_PID" 2>/dev/null && kill -KILL -- -"$PG_PID" 2>/dev/null
  wait "$PG_PID" 2>/dev/null || true
}

CLEANED=0
cleanup() {
  rc=$?
  if [ "$CLEANED" = 1 ]; then return 0; fi
  CLEANED=1
  trap - INT TERM HUP EXIT
  # Wajib: dengan `set -e` masih menyala, satu `kill -0` ke pid yang sudah mati membatalkan sisa
  # daftar — dan menyisakan persis layanan yang seharusnya dimatikan.
  set +e
  printf '\n'
  step 'Membereskan…'
  stop_group "$WEB_PID" 'web'
  stop_group "$API_PID" 'api'
  stop_group "$MAIL_PID" 'mail'
  stop_postgres
  # Hanya port yang layanannya memang kita nyalakan. Memperingatkan soal port milik orang lain
  # pada jalur yang baru saja menolak memakainya cuma menambah kebisingan.
  if [ -n "$WEB_PID" ] && port_open 3000; then
    warn 'Port 3000 masih dipakai sesudah pembersihan:'
    port_owner 3000 >&2
  fi
  if [ -n "$API_PID" ] && port_open 3001; then
    warn 'Port 3001 masih dipakai sesudah pembersihan:'
    port_owner 3001 >&2
  fi
  ok 'Selesai.'
  exit "$rc"
}
trap cleanup INT TERM HUP EXIT

# --- 1. preflight ------------------------------------------------------------------------------

step 'Memeriksa perkakas dan konfigurasi'

for _cmd in node pnpm curl nc lsof; do
  command -v "$_cmd" >/dev/null 2>&1 || fail "Perintah \`$_cmd\` tidak ada. Pasang dulu, lalu jalankan ulang."
done

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 22 ] || fail "Butuh Node 22, yang terpasang $(node -v). Pasang Node 22 (mis. lewat nvm), lalu ulangi."
if [ "$NODE_MAJOR" -gt 22 ]; then
  warn "Node $(node -v) lebih baru dari 22 yang dipakai repo ini; lanjut, tapi kalau ada yang aneh coba Node 22."
fi

case "$(pnpm --version)" in
  10.*) ;;
  *) warn "pnpm $(pnpm --version); repo ini dikunci ke pnpm 10.8.0. Kalau ada yang aneh: corepack enable" ;;
esac

[ -d node_modules ] || fail 'Dependency belum terpasang. Jalankan `pnpm install` dulu.'
[ -f apps/api/.env ] || fail 'apps/api/.env belum ada. Salin dari apps/api/.env.example, lalu isi JWT_SECRET (`openssl rand -hex 32`).'
[ -f packages/database/.env ] || fail 'packages/database/.env belum ada. Isi DATABASE_URL yang sama dengan apps/api/.env.'

# Nilainya dibaca untuk diperiksa, tidak pernah dicetak.
env_value() { grep -E "^$1=" "$2" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"; }

JWT=$(env_value JWT_SECRET apps/api/.env)
[ -n "$JWT" ] || fail 'JWT_SECRET di apps/api/.env kosong. API menolak menyala. Isi dengan `openssl rand -hex 32`.'
if [ "$JWT" = 'development-only-change-me' ]; then
  fail 'JWT_SECRET masih nilai contoh. API menolak menyala. Ganti dengan `openssl rand -hex 32`.'
fi

WEB_ORIGIN=$(env_value WEB_ORIGIN apps/api/.env)
case "$WEB_ORIGIN" in
  *http://127.0.0.1:3000*) ;;
  *) fail "WEB_ORIGIN di apps/api/.env ($WEB_ORIGIN) tidak memuat http://127.0.0.1:3000. Tanpa itu OriginGuard menolak semua POST dari web dengan 403." ;;
esac

for _f in apps/api/.env packages/database/.env; do
  _url=$(env_value DATABASE_URL "$_f")
  case "$_url" in
    *@127.0.0.1:*|*@localhost:*|*@[::1]:*) ;;
    '') fail "DATABASE_URL di $_f kosong." ;;
    *) fail "DATABASE_URL di $_f bukan loopback. Skrip demo menolak menulis akun demo ke basis data jauh." ;;
  esac
done

[ -n "$(env_value SMTP_HOST apps/api/.env)" ] || fail 'SMTP_HOST di apps/api/.env kosong; API menolak menyala sejak fase 23. Isi 127.0.0.1.'
[ -n "$(env_value SMTP_PORT apps/api/.env)" ] || fail 'SMTP_PORT di apps/api/.env kosong. Isi 1025.'

ok 'Konfigurasi lokal terbaca.'

# --- 2. log ------------------------------------------------------------------------------------

mkdir -p "$LOG_DIR"
: > "$LOG_DIR/postgres.log"
: > "$LOG_DIR/mail.log"
: > "$LOG_DIR/api.log"
: > "$LOG_DIR/web.log"

# --- 3. postgres ---------------------------------------------------------------------------------

step 'Basis data (127.0.0.1:54329)'
if port_open 54329; then
  if speaks_postgres 54329; then
    PG_REUSED=1
    ok 'Memakai Postgres yang sudah jalan.'
  else
    warn 'Port 54329 dipakai, tapi yang menjawab bukan Postgres:'
    port_owner 54329 >&2
    fail 'Matikan proses itu dulu, atau bebaskan port 54329.'
  fi
else
  if [ ! -f .data/postgres/PG_VERSION ]; then
    info 'Menyiapkan basis data untuk pertama kali — bisa sekitar satu menit. Jangan ditutup.'
  fi
  node scripts/local-postgres.mjs < /dev/null >> "$LOG_DIR/postgres.log" 2>&1 &
  PG_PID=$!
  OWNED_PIDS="$OWNED_PIDS $PG_PID"
  if wait_for_port 54329 90 "$PG_PID"; then
    ok 'Postgres siap.'
  else
    rc=$?
    tail_log "$LOG_DIR/postgres.log"
    if [ "$rc" = 2 ]; then fail 'Postgres berhenti saat dinyalakan.'; fi
    fail 'Postgres tidak siap dalam 90 detik.'
  fi
fi

# --- 4. kotak surat ------------------------------------------------------------------------------

step 'Kotak surat SMTP (127.0.0.1:1025)'
if port_open 1025; then
  MAIL_REUSED=1
  ok 'Memakai SMTP yang sudah jalan.'
else
  node scripts/local-mail.mjs < /dev/null >> "$LOG_DIR/mail.log" 2>&1 &
  MAIL_PID=$!
  OWNED_PIDS="$OWNED_PIDS $MAIL_PID"
  if wait_for_port 1025 10 "$MAIL_PID"; then
    ok 'SMTP siap; email keluar tersimpan sebagai .eml di .data/mail.'
  else
    rc=$?
    tail_log "$LOG_DIR/mail.log"
    if [ "$rc" = 2 ]; then fail 'Kotak surat berhenti saat dinyalakan.'; fi
    fail 'Kotak surat tidak siap dalam 10 detik.'
  fi
fi

# --- 5. skema & katalog ---------------------------------------------------------------------------

# `db:deploy` (migrate deploy), bukan `db:migrate` (migrate dev): yang kedua bisa berhenti bertanya
# di tengah jalan, dan skrip ini harus bisa ditinggal.
step 'Skema dan katalog'
pnpm db:generate >/dev/null || fail 'prisma generate gagal.'
if ! pnpm db:deploy; then
  cat >&2 <<'HINT'

Migrasi gagal. Arti kode Prisma yang biasa muncul:
  P1001 — basis data tidak terjangkau; pastikan Postgres di 127.0.0.1:54329 hidup.
  P1000 — kredensial DATABASE_URL salah untuk basis data yang menjawab di port itu.
  P3009 — ada migrasi gagal yang tercatat di _prisma_migrations; bereskan manual, jangan diulang buta.
HINT
  fail 'pnpm db:deploy gagal.'
fi
pnpm db:seed >/dev/null || fail 'pnpm db:seed gagal.'
ok 'Skema mutakhir, katalog paket terisi.'

# --- 6. akun demo ---------------------------------------------------------------------------------

# Harus selesai sebelum web menyala: kalau browser sampai di /dashboard saat akunnya belum ada,
# login SSR gagal dan DemoCooldown mengunci auto-login 60 detik — pemilik melihat form login.
step 'Akun demo'
pnpm demo:local >/dev/null || fail 'pnpm demo:local gagal. Lihat pesannya dengan menjalankannya sendiri.'
ok "$DEMO_EMAIL siap sebagai operator."

# --- 7. api ----------------------------------------------------------------------------------------

step 'API (127.0.0.1:3001)'
if port_open 3001; then
  if curl -fsS --max-time 5 "$API_URL/health" 2>/dev/null | grep -q '"ok"'; then
    API_REUSED=1
    ok 'Memakai API yang sudah jalan.'
    warn 'API itu bukan dinyalakan skrip ini — bisa jadi proses lama dengan kode lama, dan Ctrl+C tidak akan mematikannya. Pemiliknya:'
    port_owner 3001 >&2
  else
    warn 'Port 3001 dipakai, tapi yang menjawab bukan API Aruna:'
    port_owner 3001 >&2
    fail 'Matikan proses itu dulu, atau bebaskan port 3001.'
  fi
else
  pnpm --filter @aruna/api dev < /dev/null >> "$LOG_DIR/api.log" 2>&1 &
  API_PID=$!
  OWNED_PIDS="$OWNED_PIDS $API_PID"
  info 'Menunggu API siap (kompilasi pertama bisa satu–dua menit)…'
fi

# --- 8. gerbang kesiapan API -------------------------------------------------------------------------

if wait_for_http "$API_URL/ready" 120 "$API_PID"; then
  ok 'API siap.'
else
  rc=$?
  if [ "$rc" = 2 ]; then tail_log "$LOG_DIR/api.log"; fail 'API berhenti saat dinyalakan.'; fi
  # /ready sudah menyebut subsistem mana yang gagal, dalam bahasa Indonesia. Cetak apa adanya.
  BODY=$(curl -s --max-time 5 "$API_URL/ready" 2>/dev/null || true)
  if [ -n "$BODY" ]; then warn "Jawaban /ready: $BODY"; fi
  tail_log "$LOG_DIR/api.log"
  fail 'API tidak siap dalam 120 detik.'
fi

# --- 9. web -------------------------------------------------------------------------------------------

# Satu-satunya port yang tidak pernah dipakai ulang. Dari luar, `dev:demo` dan `nuxt dev` biasa
# tidak bisa dibedakan — dan memakai ulang yang salah menyuguhkan form login, kegagalan paling
# buruk yang bisa diberikan skrip ini. Yang dibunuh biar diputuskan manusia.
step 'Web demo (127.0.0.1:3000)'
if port_open 3000; then
  warn 'Port 3000 sudah dipakai:'
  port_owner 3000 >&2
  cat >&2 <<'HINT'

Mode demo wajib di 127.0.0.1:3000 — OriginGuard API menolak origin lain dengan 403, dan
auto-login hanya menyala di host loopback. Matikan proses di atas dulu:

  kill <PID>

lalu jalankan ulang skrip ini.
HINT
  fail 'Port 3000 tidak bebas.'
fi

pnpm --filter @aruna/web dev:demo --port 3000 < /dev/null >> "$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!
OWNED_PIDS="$OWNED_PIDS $WEB_PID"
info 'Menunggu web siap (Nuxt ikut menjalankan pengecekan tipe; bisa dua–tiga menit)…'

# Probe ke `/`, tidak pernah ke `/dashboard`: satu kali gagal di sana akan mengarmkan cooldown
# 60 detik dan memantulkan pemilik ke form login.
if wait_for_any_http "$WEB_URL/" 180 "$WEB_PID"; then
  ok 'Web siap.'
else
  rc=$?
  tail_log "$LOG_DIR/web.log"
  if [ "$rc" = 2 ]; then fail 'Web berhenti saat dinyalakan.'; fi
  fail 'Web tidak siap dalam 180 detik.'
fi

# --- 10. spanduk ---------------------------------------------------------------------------------------

printf '\n'
printf '  Mode demo lokal siap.\n\n'
printf '  Buka       : %s/dashboard\n' "$WEB_URL"
printf '  Masuk      : otomatis. Kalau form login muncul, pakai:\n'
printf '               %s / %s\n' "$DEMO_EMAIL" "$DEMO_PASSWORD"
printf '  Bayar      : tidak ada. Akun demo adalah operator, jadi "Buat undangan"\n'
printf '               langsung aktif tanpa Midtrans.\n'
if [ "$PG_REUSED" = 1 ];   then printf '  Postgres   : memakai yang sudah jalan (tidak akan dimatikan)\n'; fi
if [ "$MAIL_REUSED" = 1 ]; then printf '  SMTP       : memakai yang sudah jalan (tidak akan dimatikan)\n'; fi
if [ "$API_REUSED" = 1 ];  then printf '  API        : memakai yang sudah jalan (tidak akan dimatikan)\n'; fi
printf '  Log        : %s/\n' "$LOG_DIR"
printf '\n  Tekan Ctrl+C untuk mematikan semuanya.\n\n'

if [ "${DEMO_NO_OPEN:-}" != '1' ] && command -v open >/dev/null 2>&1; then
  open "$WEB_URL/dashboard" >/dev/null 2>&1 || true
fi

# --- 11. pengawas ----------------------------------------------------------------------------------------

# Tidak ada `wait -n` di bash 3.2, dan `wait` telanjang tidak memberi tahu siapa yang mati.
# `sleep 2` langsung terputus oleh SIGINT, jadi Ctrl+C tetap sigap.
while :; do
  sleep 2
  for _pid in $OWNED_PIDS; do
    if ! kill -0 "$_pid" 2>/dev/null; then
      warn "Salah satu layanan berhenti sendiri (pid $_pid). Lihat $LOG_DIR/."
      exit 1
    fi
  done
done
