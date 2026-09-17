# Operasi produksi

Server: `103.181.143.128` (IDCloudHost SouthJKT, Ubuntu 24.04, 2 vCPU / 3,8 GiB / 58 GB).
Stack di `/srv/aruna`: `compose.prod.yaml`, `Caddyfile`, dan empat berkas env mode 600
(`.env`, `api.env`, `web.env`, `worker.env`). Rilis lewat push ke `main`.

## DNS

Registrar dan DNS: IDCloudHost. Nameserver `sari.ns.dnscloud.id`, `rama.ns.dnscloud.id`.

| Record | Nilai | Proxied |
|---|---|---|
| `@` | `103.181.143.128` | **OFF** |
| `www` | `103.181.143.128` | **OFF** |
| `api` | `103.181.143.128` | **OFF** |

**"Proxied" di panel IDCloudHost bukan CDN — itu halaman parkir mereka.** Sampai 2026-09-16
`@` dan `www` menunjuk `103.214.112.181` dengan toggle itu menyala, dan jawabannya
`dc-parked: 1`, `server: DNSCloud`. Artinya tidak ada satu byte pun trafik yang pernah sampai
ke VPS, dan `api` bahkan belum punya record sama sekali (NXDOMAIN) — itulah yang membuat
gerbang `Tunggu /ready` di `deploy.yml` merah di tiap rilis walaupun stack-nya sehat.

Selama toggle itu menyala, Caddy tidak pernah melihat tantangan ACME dan tidak akan pernah
punya sertifikat. Ketiganya wajib OFF.

Verifikasi:

```sh
dig +short arunadewa.id www.arunadewa.id api.arunadewa.id A    # ketiganya 103.181.143.128
echo | openssl s_client -connect api.arunadewa.id:443 -servername api.arunadewa.id 2>/dev/null \
  | openssl x509 -noout -issuer                                 # harus Let's Encrypt
curl -fsS https://api.arunadewa.id/ready
```

## Sertifikat

Caddy menerbitkannya sendiri lewat Let's Encrypt (ACME HTTP-01), menyimpannya di volume
`caddy-data`, dan memperpanjangnya otomatis. Tidak ada berkas sertifikat untuk dipasang atau
dirotasi, dan `./tls` tidak di-mount ke container.

**Port 80 wajib tetap terbuka ke dunia.** Menutupnya tidak mematikan apa pun hari ini, lalu
mematikan situs ~60 hari kemudian saat perpanjangan gagal. Catch-all `:80, :443 { abort }` di
Caddyfile tidak menelan tantangan ACME — Caddy menanganinya sebelum routing mana pun.

## X-Forwarded-For dan TRUST_PROXY

`TRUST_PROXY=1` di `api.env`, dan itu benar: Caddy satu-satunya hop.

Yang membuatnya aman **bukan firewall**, melainkan `trusted_proxies` Caddy yang kosong
(bawaannya). Dalam keadaan itu Caddy membuang `X-Forwarded-For` kiriman klien dan menggantinya
dengan alamat peer sesungguhnya. Diverifikasi di caddy 2.11.4 — untuk permintaan yang sama,
upstream menerima `127.0.0.1` dengan bawaan, tapi `1.2.3.4, 5.6.7.8, 127.0.0.1` begitu
`trusted_proxies 127.0.0.1/32` dipasang.

Jangan tambahkan `trusted_proxies`, dan jangan menaikkan `TRUST_PROXY` ke 2 tanpa membaca
bagian berikutnya. Keduanya membuat tiap limiter per-IP (`common/rate-limit.ts`) dan kolom
`Session.ip` bisa dibohongi siapa pun.

## Kalau suatu saat CDN dipasang di depan

**Belum dikerjakan, dan sengaja.** Cloudflare memberi DDoS, CDN, dan penyembunyian IP asal —
ketiganya belum punya pembeli: trafiknya nol, undangan dibuka puluhan tamu lewat WhatsApp, dan
Caddy sudah `encode zstd gzip` sendiri. Harganya nyata: migrasi NS sampai 48 jam, Origin
Certificate yang dipasang dan dirotasi manual, dan satu kewajiban firewall baru yang kalau
lupa justru membuka lubang yang sekarang tidak ada.

Kalau nanti ada alasan nyata (kena serangan, atau bandwidth VPS terasa), urutannya:

1. Pindah NS ke Cloudflare, proxy ON untuk `@`/`www`/`api`, SSL/TLS mode **Full (strict)**.
2. Pasang Origin Certificate (15 tahun, gratis) ke `/srv/aruna/tls/`, mode 0600, dan tambahkan
   `- ./tls:/etc/caddy/tls:ro` ke volume caddy di `compose.prod.yaml`.
   Direktif `tls` dipasang **di level site block** — untuk `api.arunadewa.id` sejajar
   `import keamanan`, **bukan** di dalam `handle {}`. `tls` bukan ordered HTTP handler; Caddy
   menolaknya dengan `directive 'tls' is not an ordered HTTP handler`. Repo ini pernah punya
   baris komentar persis di posisi yang salah itu, menunggu seseorang melepasnya.
3. Di Caddyfile, `header_up X-Forwarded-For {http.request.header.CF-Connecting-IP}` pada tiap
   `reverse_proxy`. **`TRUST_PROXY` tetap 1** — Caddy tetap satu-satunya hop yang menulisnya.
4. **Bersamaan dengan langkah 3, bukan menyusul:** batasi ufw 80/443 ke rentang IP Cloudflare
   (<https://www.cloudflare.com/ips/>). Tanpa ini siapa pun bisa melewati Cloudflare dan
   mengarang `CF-Connecting-IP` langsung ke VPS.

Sertifikat Let's Encrypt dari jalur sekarang tetap jadi jaring pengaman: matikan proxy dan
situs kembali hidup tanpa perubahan kode.

## Email keluar — dan port 587 yang tidak akan pernah tersambung

Relay: **Resend**, `smtp.resend.com`, user `resend`, password = API key `re_...` (sending-only).
Keempat `SMTP_*` wajib saat boot sejak Fase 23; API menolak menyala tanpanya. **`SMTP_PORT` ikut
wajib sejak Fase 27** — ia satu-satunya yang punya nilai bawaan di kode (1025, port Mailpit), jadi
lupa menulisnya dulu berarti boot hijau dan seluruh email keluar menuju port yang tidak menjawab.

**Portnya 2587, dan itu bukan pilihan gaya.** IDCloudHost memblokir port SMTP keluar yang lazim.
Diukur dari VPS ini 2026-09-16:

| Port | |
|---|---|
| 25, 465, 587 | **di-drop diam-diam** — koneksi menggantung sampai timeout, bukan ditolak |
| 2587 | terbuka |
| 443 (pembanding) | terbuka — jadi bukan jaringan keluarnya yang mati |

Bentuk kegagalannya yang mahal: paket di-*drop*, bukan di-*reject*. Tidak ada `ECONNREFUSED`
yang muncul seketika — yang ada permintaan menggantung sampai batas waktu nodemailer. Artinya
pendaftaran pelanggan pertama akan diam beberapa puluh detik lalu gagal, `/ready` tetap hijau
karena ia memang sengaja tidak menyentuh SMTP, dan tidak ada satu pun log yang menyebut "port".

Dua hal itu diperbaiki di Fase 27, dan keduanya mengubah cara bagian ini dipakai:

- `smtpTransportOptions()` menyetel `connectionTimeout`/`greetingTimeout` 10 detik, jadi port yang
  di-drop gagal dalam hitungan detik, bukan dua menit.
- `MailService` punya `Logger` dan menangkap sebab aslinya. Log sekarang menyebut host, port, dan
  `code`/`responseCode`/`response` dari relay:

  ```
  ERROR [MailService] Pengiriman email gagal lewat smtp.resend.com:2587 (auth=ya) — code=EAUTH responseCode=535 response=535 Authentication failed
  ```

  Ketiga mode kegagalan akhirnya bisa dibedakan dari log saja: `ETIMEDOUT` tanpa balasan = port
  diblokir; `EAUTH`/`535` = API key salah; AUTH lolos tapi `sendMail` dijawab `403` = domain
  pengirim belum terverifikasi di Resend. Perintah manual di bawah tetap berguna untuk memeriksa
  **sebelum** ada yang mendaftar, bukan lagi sebagai satu-satunya cara mengetahui sebabnya.

Resend menyediakan 2587 persis untuk jaringan seperti ini. `mail.service.ts` menyetel
`secure: port === 465`, jadi 2587 berjalan lewat STARTTLS tanpa perubahan kode.

Menguji kredensial **tanpa mengirim satu email pun** — `verify()` hanya melakukan koneksi dan
AUTH:

```sh
P=$(sed -n 's/^SMTP_PASS=//p' /srv/aruna/api.env)
docker exec -w /app/apps/api -e P="$P" aruna-api-1 node -e '
const nm = require("nodemailer");
nm.createTransport({ host: "smtp.resend.com", port: 2587, secure: false,
  auth: { user: "resend", pass: process.env.P } })
  .verify().then(() => console.log("SMTP OK")).catch(e => console.log("GAGAL", e.code, e.message));'
```

Menguji apakah sebuah port diblokir, tanpa melibatkan kredensial sama sekali:

```sh
timeout 8 bash -c 'exec 3<>/dev/tcp/smtp.resend.com/2587' && echo TERBUKA || echo TERBLOKIR
```

**Domain pengirim harus terverifikasi di Resend** sebelum `noreply@arunadewa.id` boleh dipakai:
tiga record (MX + SPF di `send`, DKIM di `resend._domainkey`) di panel DNS yang sama, Proxy
"DNS saja". Tanpa itu AUTH tetap lolos dan yang gagal adalah kirimnya — 403 saat `sendMail`,
bukan saat boot dan bukan saat `verify()`.

## Cookie sesi lintas subdomain

`COOKIE_DOMAIN=arunadewa.id`, dan tempatnya di **`compose.prod.yaml`**, bukan `api.env`: nilainya
bukan rahasia, dan menaruhnya di berkas yang ikut git berarti ia sampai ke server dalam rilis yang
sama dengan kode yang menuntutnya.

Tanpa atribut `Domain`, cookie yang diterbitkan `api.arunadewa.id` menjadi *host-only* dan tidak
pernah terkirim ke `arunadewa.id`. Render server Nuxt membaca sesi dari header cookie yang sampai
ke host **web**, jadi ia melihat pengunjung yang barusan berhasil masuk sebagai tamu — dan
`middleware/auth` memantulkannya ke `/login` dengan sesi yang sebenarnya hidup di sisi API.

Gejalanya menyesatkan karena terlihat seperti kegagalan login Google, padahal jalur Google hanya
korban yang paling kelihatan: ia selalu berakhir dengan navigasi penuh. Login kata sandi memantul
dengan sebab yang sama, tapi baru terasa saat halaman dimuat ulang — perpindahan setelah login
terjadi di sisi klien, dengan sesi masih di memori.

**Di mesin pengembang kelas kegagalan ini tidak bisa muncul**: web `127.0.0.1:3000` dan API
`127.0.0.1:3001` adalah host yang sama, dan cookie tidak peduli port. Suite e2e mengarah ke sana
juga. Karena itu aturannya ditegakkan saat boot, di server, oleh `apps/api/src/common/cookie-domain.ts`:
API menolak menyala kalau host web dan host API berbeda tanpa `COOKIE_DOMAIN`, atau kalau nilainya
bukan induk dari keduanya — salah ketik satu huruf membuat browser membuang cookienya tanpa galat.

Memeriksanya setelah rilis, dari DevTools di `https://arunadewa.id`: `aruna_access` dan
`aruna_refresh` harus tampil dengan `Domain = .arunadewa.id`. Muat ulang `/dashboard` — kalau
tetap di dasbor, cookie-nya sampai ke host web.

### Cookie warisan dari sebelum `COOKIE_DOMAIN`

Memasang `COOKIE_DOMAIN` tidak menyentuh cookie yang sudah telanjur ada di browser orang. Salinan
host-only di `api.arunadewa.id` dan salinan ber-`Domain` adalah **dua entri berbeda** di jar
browser: yang baru tidak menimpa yang lama, dan `logout` tidak bisa menghapus yang lama karena
`clearCookie` hanya cocok kalau `Path` dan `Domain` persis sama.

Akibatnya satu nama datang dua kali dalam satu header `Cookie`. Browser menyajikan yang lebih tua
lebih dulu (RFC 6265 §5.4) dan `cookie-parser` memenangkan kemunculan pertama, jadi API selalu
memilih token basi, menolaknya sebagai sesi yang sudah dicabut, lalu memantulkan orangnya ke
`/login` — setiap kali, sampai cookie 30 harinya kedaluwarsa sendiri. Gejalanya di mata pemakai:
"login berhasil tapi kembali ke halaman masuk", dan banner *Sesi berakhir karena akun ini dipakai
masuk di perangkat lain* pada akun yang tidak pernah dipakai di perangkat lain.

Dua hal yang menanganinya, keduanya otomatis dan tidak perlu tindakan operator:

- `apps/api/src/common/session-cookie.ts` membaca kemunculan **terakhir**, bukan yang pertama.
- `apps/api/src/common/legacy-session-cookie.middleware.ts` mengusir salinan host-only begitu
  nama ganda terlihat — di permintaan mana pun, termasuk yang berakhir 401, jadi browser yang
  terkunci sembuh pada kunjungan pertama berikutnya.

Yang perlu dilakukan operator hanya membuktikannya setelah rilis:

```bash
VERIFY_EMAIL=... VERIFY_PASSWORD=... bash scripts/verify-session.sh
```

Langkah keempat skrip itulah ujinya: menyegarkan sesi dengan `aruna_refresh` dikirim dua kali,
yang basi lebih dulu. Sebelum perbaikan ini jawabannya 401.

Aturan yang sama berlaku kalau `COOKIE_DOMAIN` suatu saat diubah lagi — mengubah cakupan cookie
sesi selalu melahirkan satu generasi cookie warisan.

## Login Google

Client OAuth-nya satu, dipakai lokal dan produksi sekaligus. Yang membedakan hanya daftar
**Authorized redirect URIs**, dan alamatnya diturunkan dari `API_ORIGIN` di
`auth.service.ts` — bukan env tersendiri, jadi ia tidak bisa disetel salah tanpa ikut
menyalahkan seluruh API:

| Lingkungan | Redirect URI |
|---|---|
| lokal | `http://127.0.0.1:3001/auth/google` |
| produksi | `https://api.arunadewa.id/auth/google` |

`Authorized JavaScript origins` tidak dipakai: penukaran `code` terjadi di server, bukan di
browser.

**Keduanya wajib saat boot sejak Fase 27.** Sebelum itu `startGoogle` baru memeriksanya saat
ada yang menekan tombolnya — dan rilis pertama berjalan berhari-hari dengan `GOOGLE_CLIENT_ID`
dan `GOOGLE_CLIENT_SECRET` kosong di `api.env`: boot hijau, `/ready` hijau, sementara tombol
Google di `/login` dan `/register` membawa tiap pengunjung ke 400 berbentuk JSON.

Menyiapkannya dari nol, termasuk langkah-langkah di Google Console yang hanya bisa dikerjakan
manusia: `./scripts/setup-google-oauth.sh`.

Memeriksa apakah ia hidup, tanpa login:

```sh
curl -sI https://api.arunadewa.id/auth/google/start | grep -i ^location
```

302 ke `accounts.google.com` berarti terkonfigurasi. Periksa juga `redirect_uri` di dalamnya
cocok dengan tabel di atas; kalau tidak, Google menolak di langkah tukar kode dengan
`redirect_uri_mismatch`.

Satu hal yang tidak terlihat dari sini: **Publishing status** di halaman Audience. Selama masih
`Testing`, hanya email yang terdaftar sebagai test user yang bisa masuk — sisanya kena "access
blocked", dan API kita tidak pernah melihat permintaannya. Scope yang dipakai cuma
`openid email profile`, ketiganya non-sensitive, jadi `PUBLISH APP` berlaku seketika tanpa
review Google.

## Backup

`ops/backup/` — dump Postgres harian + media inkremental, terenkripsi `age` ke bucket off-site,
dijadwalkan systemd timer, dijaga dead man's switch. Runbook lengkapnya di
[ops/backup/README.md](backup/README.md).

Yang paling mudah dilupakan: **drill restore bulanan**. Backup yang belum pernah dipulihkan
adalah hipotesis. Check `aruna-restore-drill` di healthchecks.io (period 35 hari) akan
menghubungi kamu kalau bulan ini terlewat.

## Pengamatan

Tanpa ini, kegagalan produksi pertama diketahui dari pelanggan yang mengeluh.

**Uptime monitor eksternal** — langkah termurah dengan hasil terbesar di seluruh daftar ini.
UptimeRobot (gratis) atau Better Stack, interval 1–5 menit, alert ke WhatsApp/email:

| URL | Membuktikan |
|---|---|
| `https://api.arunadewa.id/ready` | API hidup, database tersambung, **dan direktori media bisa ditulis** |
| `https://arunadewa.id/` | Nitro merender, dan sertifikat Caddy masih berlaku |

Yang kedua juga menangkap sertifikat kedaluwarsa — kegagalan paling sunyi di seluruh sistem ini,
karena ia datang 60 hari setelah sebabnya dan tidak ada satu pun log yang berubah di hari H.

**Dua check healthchecks.io** dari `ops/backup/` menutup kelas yang berbeda: kegagalan yang
ditandai oleh *ketiadaan* sinyal, bukan oleh sinyal yang salah.

**Yang sudah berbunyi sendiri tanpa vendor:**

| | Cara tahu |
|---|---|
| worker hidup tapi mandek | `docker compose ps` menandainya `unhealthy` — endpoint `:3002` |
| web tidak merender | healthcheck `web` |
| media tidak bisa ditulis | `/ready` 503, dan gerbang deploy merah |
| SMTP belum dikonfigurasi | API menolak menyala; deploy gagal, bukan pelanggan pertama |

**Pengiriman log terpusat sengaja tidak dipakai.** `journalctl` dan `docker logs` dengan cap
10m x 5 sudah cukup untuk satu VPS, dan menambah vendor sebelum ada trafik adalah kompleksitas
tanpa pembeli.

## Rilis dan rollback

`.github/workflows/deploy.yml` membangun image di GitHub, mengirim `Caddyfile` ke
`/srv/aruna/.staging`, memvalidasinya di container sekali pakai sebelum menimpa yang sedang
dipakai, lalu `docker compose up -d` dan `caddy reload` tanpa memutus koneksi. Gerbangnya
`Tunggu /ready`, 90 detik ke `https://api.arunadewa.id/ready`.

Rollback masih manual — tiga baris, dicetak oleh langkah yang gagal:

```sh
cd /srv/aruna
cp .image.env.previous .image.env
docker compose -f compose.prod.yaml --env-file .env --env-file .image.env up -d
```

Aman selama migrasi rilis itu aditif; migrasi Prisma maju-saja.
