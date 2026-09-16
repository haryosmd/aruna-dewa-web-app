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
Keempat `SMTP_*` wajib saat boot sejak Fase 23; API menolak menyala tanpanya.

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
