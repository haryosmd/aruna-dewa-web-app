# Revision history

## 2026-09-11: execution started

Materialized approved plan; current frontend decisions override earlier React choices.

## 2026-09-12: penuntasan jalur auth

Tujuan `?next=` kini ikut pada jalur Google: `/auth/google/start` menerima `next`, menyimpannya di cookie
`aruna_oauth_next` (HttpOnly, `Path=/auth/google`, 10 menit) alih-alih menitipkannya pada parameter `state`
yang dipantulkan Google, lalu callback memakainya sebagai tujuan redirect. Path divalidasi dua kali dengan
`safeWebPath`, yang menolak URL absolut, `//host`, `/\host`, karakter kontrol dan nilai kelewat panjang;
`safeNextPath` di web dibuat kembar dengan aturan yang sama.

Pendaftaran tidak lagi meninggalkan akun hantu saat SMTP mati: kegagalan pengiriman verifikasi menghapus
baris user yang baru saja dibuat, dan email yang pernah didaftarkan tapi tidak pernah terverifikasi boleh
didaftarkan ulang (`decideRegistration` — `create` / `reclaim` / `conflict`). Akun yang sudah terverifikasi
tetap ditolak, dan akun tanpa password hash diarahkan ke tombol Google, bukan diambil alih lewat form daftar.

Tiga halaman web yang selama ini hanya ada sebagai endpoint akhirnya dibuat: `/verify-email` (tujuan tautan
email verifikasi — sebelumnya 404, sehingga tidak ada akun yang pernah bisa terverifikasi), `/forgot-password`,
dan `/reset-password`, plus tautan "Lupa kata sandi?" di halaman masuk. Halaman daftar kini langsung membuat
sesi setelah mendaftar, karena tanpa itu tujuan yang sudah dipilih pendaftar dipantulkan kembali ke `/login`.

Diverifikasi di browser terhadap API dan SMTP lokal: daftar -> masuk otomatis -> mendarat di `/order?package=`,
tautan verifikasi dari `.eml` -> terverifikasi, lupa kata sandi -> email -> reset -> seluruh sesi dicabut.
Callback Google sungguhan belum diuji (butuh consent Google); yang diuji adalah cookie tujuan pada `start`
dan penolakan `next` bermusuhan. Axe nol violation di `/login`, `/verify-email`, `/forgot-password`,
`/reset-password`.

---

## 2026-09-14: akses operator untuk akun pemilik

Diminta "super admin, semua akses tanpa bayar". Tidak ada peran baru yang dibuat — `OPERATOR`
sudah persis itu, dan CLI-nya (`pnpm --filter @aruna/api operator <email>`) sudah ada sejak
fase identitas. Yang bertambah hanya `OPERATOR-RUNBOOK.md`: apa yang sebenarnya dibuka peran
ini, cara memberi dan mencabutnya, dan kenapa passwordnya tidak boleh ditulis langsung ke
basis data.

Dua hal yang ditemukan saat mengerjakan, bukan saat merencanakan:

**Akunnya ternyata sudah ada** sejak 2026-09-11 — akun Google tanpa `passwordHash`, pemilik dua
undangan `Haryo & Dea` (`dan`, `danta`). Jadi tidak ada akun baru yang dibuat; yang terjadi
adalah pemberian peran pada akun yang sudah berjalan. `POST /register` menolaknya dengan
"Email sudah terdaftar" karena `decideRegistration` memeriksa `emailVerifiedAt` lebih dulu —
pesan "terhubung ke akun Google" hanya muncul untuk akun yang belum terverifikasi.

**Password yang diminta 9 karakter**, sementara `register` dan `resetPassword` sama-sama
menuntut 10. Diselesaikan dengan menambah satu karakter, bukan dengan melonggarkan aturan atau
menulis hash argon2 langsung ke tabel — `login` tidak mengecek panjang, jadi jalan pintas itu
akan "berhasil" sambil meninggalkan akun yang melanggar aturan aplikasinya sendiri dan tidak
bisa di-reset lewat Lupa password.

Passwordnya disetel lewat alur resmi: `forgot-password` → token dari `.eml` di `.data/mail/`
(quoted-printable, perlu didekode) → `reset-password`. Terverifikasi: login mengembalikan
`role: OPERATOR`, daftar undangan berisi **15 baris** (bukan 2 miliknya), dan password lama
9 karakter ditolak 401.

Kredensialnya tidak ditulis di mana pun dalam `docs/`.

---

## 2026-09-15: rotasi bertenggang, satu sesi per akun, footer sadar-sesi

Dilaporkan: rotasi refresh token tidak punya masa tenggang, jadi dua tab yang di-reload
bersamaan lewat menit ke-15 bisa saling menendang keluar — `refresh` mencabut **seluruh** sesi
pengguna begitu satu token dipakai dua kali. Diminta sekalian: tidak boleh dual login, dan
umur sesi ditinjau ulang.

**Yang ternyata jadi akar persoalan, dan tidak ada di laporan.** Rotasi membuat **baris
`Session` baru** tiap penyegaran lalu mencabut yang lama, jadi `sid` berganti tiap 15 menit dan
access token yang beredar langsung mati di `JwtAuthGuard`. Itu juga yang membuat "satu sesi per
akun" mustahil dipasang apa adanya: mencabut-sesi-lain saat login akan ikut mencabut hasil
rotasinya sendiri. Jadi `Session` direstrukturisasi lebih dulu menjadi **keluarga ber-id tetap**
— rotasi menulis ulang barisnya di tempat — dan itu prasyarat, bukan tambahan.

`session-rotation.ts` sebelumnya **kode mati**: satu-satunya pemakainya spec-nya sendiri, dan
nama fieldnya (`tokenHash`) sudah melenceng dari skema (`refreshTokenHash`). Spec-nya lulus
sambil tidak menguji satu baris pun yang dikirim. Sekarang ia berisi keputusan murni yang
benar-benar diimpor `AuthService`: `decideRefresh`, `matchableHashes`, `graceSlotAfter`,
`nextWindow`.

**Tenggang.** Token yang baru digantikan tetap dilayani 30 detik (rentang yang direkomendasikan
Ory dan diskusi better-auth), dan tiap pemakaian dalam jendela itu menerima token **baru** —
bukan menyajikan ulang token lama. Kuota 5 pemakaian per rentetan menjaga daftar tetap pendek,
karena tiap entri berarti satu verifikasi argon2 di jalur penyegaran.

**Umur.** Idle 30 hari yang digeser tiap rotasi, plus batas absolut 90 hari yang terkunci sejak
login — batas absolut sebelumnya tidak ada sama sekali, `expiresAt` digeser terus tanpa atap.

**Dua cacat yang ketahuan saat menguji, bukan saat merencanakan.**

Pertama, slot tenggang semula satu token, dan itu salah persis di skenario yang mau diperbaiki:
tab A menyegarkan dengan `T0` dan menerima `T1`, tab B yang masih memegang `T0` menerima `T2`,
lalu `T1` tidak cocok dengan apa pun dan pemegangnya tertendang satu penyegaran kemudian. Slotnya
jadi **daftar**: token yang digantikan selalu ikut masuk, termasuk di jalur tenggang.

Kedua, kehabisan percobaan membalas 401 — yang di web berarti logout — padahal itu cuma rebutan
sepersekian detik. Sekarang 503 `SESSION_BUSY`, dan `useApi` hanya mengakhiri sesi pada 401.

**Satu sesi per akun.** `createSession` mencabut semua sesi hidup pemilik akun (`REPLACED`).
Konsekuensinya disadari dan diterima pemilik produk: HP dan laptop tidak bisa hidup bersamaan.
Yang ditambahkan supaya itu tidak terbaca sebagai bug: `Session.revokedReason` merekam sebabnya,
`refresh` memulangkannya sebagai `code`, dan perangkat yang tertendang mendarat di
`/login?reason=SESSION_REPLACED` dengan kalimatnya — bukan pantulan senyap ke form login.
Sesi yang **sudah** dicabut tidak pernah memicu pencabutan lanjutan; kalau ia memicunya,
perangkat lama akan menjatuhkan login baru setiap kali ia mencoba.

`Session.userAgent`/`ip` akhirnya diisi — kolomnya ada sejak awal tapi tak pernah ditulis.

**Footer** (`AppFooter.vue`) berhenti menawarkan "Masuk"/"Daftar" kepada orang yang sudah masuk;
saat sesi hidup keduanya jadi "Dashboard" dan "Keluar", seperti `AppHeader.vue` sejak dulu.

Diverifikasi terhadap API dan web lokal: dua penyegaran benar-benar bersamaan dengan token yang
sama → dua-duanya 201, sesi hidup, kedua token hasilnya masih bisa dipakai lanjut; lima
bersamaan → tiga 201 dan dua 503, tidak ada yang tercabut; token lama dipakai setelah jendela
tenggang habis → 401 `SESSION_REUSE` dan seluruh sesi dicabut; `sid` tetap sama melewati rotasi
dan jumlah barisnya tidak bertambah; login kedua → perangkat lama dialihkan ke
`/login?next=/dashboard/&reason=SESSION_REPLACED` dengan kalimatnya ter-render; footer benar di
kedua keadaan; `reason` bermusuhan (`<script>`) tidak menghasilkan pesan apa pun. 97 unit test
dan 93 e2e hijau, lint bersih.

Migrasi `20260915000000_session_grace_rotation` me-rename `expiresAt` → `idleExpiresAt` dan
mengisi `absoluteExpiresAt` dari nilai yang sama, jadi sesi yang sedang hidup tidak ikut
tertendang oleh migrasinya sendiri.

## 2026-09-15: pengerasan API (fase 13)

Hasil audit 54 berkas `apps/api`. Empat belas temuan ditutup; tiga di antaranya membuat pekerjaan
rotasi sesi kemarin sia-sia kalau dibiarkan, dan satu adalah kehilangan data yang sudah aktif.

**Kehilangan data yang sudah berjalan.** `where: { draftRevision: revision }` dengan `revision`
`undefined` membuat Prisma **membuang filternya**, bukan mencocokkan null. `PUT /draft` tanpa kunci
`revision` karena itu berhasil menimpa revisi apa pun: cabang konflik tak pernah tercapai dan dua
editor saling menindih tanpa peringatan. Persis sama di `PUT /guests/:id`. Akarnya satu — nol
validasi runtime — jadi yang ditutup akarnya: **semua 18 endpoint ber-body** kini divalidasi zod di
batas controller lewat `ZodValidationPipe`, dengan skema yang hidup di `@aruna/contracts/api`
sehingga web memakai definisi yang sama persis. Kegagalan membalas `VALIDATION_FAILED` beserta
`fieldErrors` — field yang sudah lama ada di tipe `ApiError` web tapi tak pernah ada yang mengisinya.
`INVALID_DOCUMENT` hilang, digantikan `VALIDATION_FAILED` dengan bentuk galat yang sama untuk semua.

**Rahasia.** `JWT_SECRET` punya nilai cadangan yang tertulis di repo di **dua** modul tanpa satu pun
pemeriksaan saat menyala. `assertRuntimeEnv()` sekarang berjalan paling awal di `bootstrap()` dan
menolak boot kalau rahasianya kosong atau masih nilai contoh; di `NODE_ENV=production` ia juga
menuntut `DATABASE_URL`, `WEB_ORIGIN`, `API_ORIGIN`, dan `TRUST_PROXY`. Registrasi `JwtModule` ganda
dihapus — `IdentityModule` mengimpor `CommonModule`, satu sumber rahasia. `compose.yaml` menyetel
`NODE_ENV: production` (tanpanya `cookieOptions()` mengirim cookie sesi lewat plaintext) dan
`/openapi` tidak lagi dipasang di produksi.

**Otorisasi.** `JwtAuthGuard` dulu hanya memastikan **barisnya ada**, bukan klaimnya: siapa pun
pemegang `sid` hidup bisa menempa `role: 'OPERATOR'`, dan operator yang dicabut tetap berkuasa
sampai 15 menit. `role` kini dibaca dari kueri sesi yang memang sudah berjalan — nol kueri
tambahan. Tujuh perbandingan `role === 'OPERATOR'` inline di lima berkas disatukan ke `isOperator()`.
`ImportsService` memeriksa izin di **baris pertama** kedua metodenya; sebelumnya
`previewGoogleSheet` memanggil Google lebih dulu, jadi user login mana pun bisa membuat server ini
mengirim permintaan keluar memakai bearer token pilihannya, dan `previewFile` mem-parse XLSX 10 MB
sebelum bertanya siapa pengirimnya.

**Batas laju.** `@nestjs/throttler` menjaga default per-IP, `/auth/google/start`, webhook Midtrans,
dan tiga jalur tulis publik (`opened` sebelumnya sama sekali tanpa batas). Jalur identitas punya
pembatasnya sendiri di `common/rate-limit.ts` dengan **dua ember**: per (IP, email) dan per IP.
Percobaan pertama memakai dua `ThrottlerGuard` bertumpuk ternyata salah dan ketahuan lewat probe —
keduanya membaca metadata `@Throttle` yang sama, jadi penjaga per-IP ikut memakai ambang ketat milik
penjaga per-email dan login terkunci pada percobaan **kedua**. Satu ember selalu salah di salah satu
arah: per-IP saja mengunci satu kantor ber-NAT dari halaman login, per-email saja membiarkan satu
mesin menyisir sepuluh ribu alamat. `trust proxy` disetel di `bootstrap()` sebelum apa pun membaca
`request.ip`; tanpa itu tiap limiter dan kolom `Session.ip` hanya melihat alamat load balancer.
Enumerasi lewat timing ditutup: email tak dikenal dulu dijawab ~1 ms karena `!user?.passwordHash`
memotong sebelum argon2, sekarang kedua jalur memverifikasi hash umpan dengan parameter yang sama.

**Pembayaran.** Signature Midtrans dibandingkan `timingSafeEqual` setelah panjangnya dicocokkan;
`===` pada digest hex berhenti di byte pertama yang berbeda dan lamanya bisa diukur dari luar.
`REFUNDED` akhirnya menulis `AuditEvent` — ia mencabut entitlement sementara aktivasi tepat di
bawahnya sudah mencatat sejak dulu.

**Observabilitas.** Filter galat `@Catch()` menangkap semuanya, jadi logging bawaan Nest tidak
pernah kebagian dan **tiap 500 hilang tanpa jejak** — satu `Logger` di sana adalah nilai tertinggi
di seluruh audit. `x-request-id` dari luar hanya diterima kalau cocok pola ketat dan pendek;
sebelumnya ia dipantulkan apa adanya, dan nilai bermuatan CRLF membuat `setHeader` melempar di dalam
filter, tempat tak ada lagi yang menangkap. Filter juga berhenti membuang `current` — kedua service
membayar kueri ekstra untuk membangunnya dan filternya membuangnya, jadi UX konflik revisi tidak
mungkin bekerja. Pesan 4xx berhenti membocorkan nama bucket, path, galat kredensial S3, status
provider, dan nama variabel env yang hilang; semuanya pindah ke log. Deteksi pemakaian ulang refresh
token dan rentetan login gagal atas akun yang benar-benar ada kini tercatat sebagai `AuditEvent`
(`SESSION_REUSE_DETECTED`, `AUTH_LOGIN_FAILED`, `AUTH_LOGIN_FAILED_STREAK`).

**Daur hidup data.** Tidak ada satu pun pembersihan sebelumnya. `MaintenanceService` menyapu sekali
sehari: `OneTimeToken` lewat sehari dari kedaluwarsa atau pemakaiannya (baris `OAUTH_STATE` ditulis
endpoint tanpa autentikasi dan tak pernah dihapus siapa pun), `Session` mati lewat 30 hari —
isinya `userAgent`/`ip`, yaitu PII basi — dan `ImportJob` lewat 90 hari kalau dikomit, 7 hari kalau
tidak pernah jadi apa-apa.

Diverifikasi terhadap API lokal, tujuh probe: boot tanpa `JWT_SECRET` menolak menyala; `PUT /draft`
tanpa kunci `revision` → 400 dan draft **tetap di revisi 32** (sebelum ini ia berhasil menimpa);
`login {}`, `orders` tanpa `addonIds`, dan webhook berfield non-string → 400, bukan 500;
`google-sheets-preview` atas undangan orang lain → 403 dan `invitationId` karangan → 404, keduanya
**tanpa satu pun permintaan keluar** ke Google; 10 login salah lolos lalu yang ke-11 → 429, sementara
email lain dari IP yang sama masih boleh mencoba; email dikenal dan tak dikenal sama-sama dijawab
~30 ms; operator yang dicabut lewat Prisma langsung kehilangan kuasa pada permintaan berikutnya
dengan cookie yang sama (16 undangan terlihat → 1, dan jalur operator → 403); 500 yang disengaja
muncul di log dengan `requestId` yang sama seperti yang diterima klien, dan `x-request-id`
bermuatan kontrol, kepanjangan, atau markup tidak membuat filter melempar. 127 tes unit hijau,
typecheck API dan web bersih, lint bersih.

## 2026-09-15: composable domain & tipe bersama (fase 14)

41 pemanggilan HTTP tersebar inline di halaman, dan `useApi` — yang cuma transport — adalah
**satu-satunya** abstraksi di atasnya. Sekarang ada satu composable per domain
(`useInvitations`, `useGuests`, `useOrders`, `useCatalog`, `useRsvp`, `usePublicInvitation`,
ditambah `useAuthApi` supaya tujuh pemanggilan `/auth/*` tidak tertinggal sebagai string path
di lima halaman dan satu store). Halaman berhenti mengenal path sama sekali: `useApi()` kini
hanya dipanggil dari dalam composable.

**Satu `$fetch` mentah lolos dari `useApi`** di `pages/i/[slug].vue` — dan itu bug, bukan
ketidakrapian. Ia melewati `apiBaseForPage()` (yang mencocokkan ejaan host loopback supaya
cookie sesi tidak hilang tanpa suara), melewati penerusan cookie saat render server, dan
melewati jalur 401 → refresh → ulang.

**`useLoader()`** menampung kerangka `pending`/`error`/`try-catch` yang disalin empat kali,
dan `apiErrorMessage()` menggantikan **26** salinan `(cause as { message: string }).message`.

**`useAsyncData` berkunci** untuk `/catalog`, yang tadinya diambil tiga berkas.
`useInvitationDetail()` menyediakan kunci `invitation:<id>` untuk `/invitations/:id` — yang
sebelumnya diambil lima berkas tanpa kunci bersama.

**Tipe berasal dari `@aruna/contracts/api`,** bukan dari definisi kedua per halaman.
`types/aruna.ts` menyusut jadi re-export. Menyatukannya membongkar **enam kolom yang tidak
pernah dikirim API** dan karena itu selamanya menampilkan teks cadangan atau angka nol:

- `wish.name` dan `rsvp.guestName` di halaman RSVP — API mengirim `authorName` dan relasi
  `guest`, jadi setiap nama di daftar konfirmasi dan antrean moderasi berbunyi "Tamu undangan".
- `order.packageName` di halaman pesanan — namanya sudah tersimpan di `priceSnapshot` sejak
  pesanan dibuat, cuma tidak pernah ikut dikirim. Sekarang dikirim.
- **Ejaan kehadiran.** Prisma menyimpan `YES`/`NO`; `POST /public/:slug/rsvp` sudah lama
  memulangkannya huruf kecil, tiga jalur lain memulangkan baris mentah, dan **setiap**
  pembacanya di web membandingkan dengan `'yes'`. Akibatnya penghitung "hadir" di dasbor
  selalu 0, tiap lencana RSVP berbunyi "Berhalangan", kolom RSVP di tabel tamu selalu "Belum
  merespons", dan panel RSVP di undangan salah membaca jawaban tamu yang kembali. Satu
  `serializeRsvp()` di `rsvp/attendance.ts` menetapkan bentuk yang keluar; empat tempat ikut.
- `GuestLookup` kini union `{ personal: false } | ({ personal: true } & GuestProfile)`. Tipe
  lama mengaku `quota: number` selalu ada, padahal tautan tak dikenal dijawab
  `{ personal: false }` — jadi `Math.min(undefined, …)` di panel RSVP diam-diam NaN.

Wizard `/order` berhenti mengarang seluruh penolakan sendiri: validasi per-tahap tetap ada
(server tidak bisa menjaga perpindahan tahap), tapi `fieldErrors` dari API sekarang dipetakan
ke kolomnya dan wizard melompat balik ke tahap tempat kolom itu diisi — sebelumnya slug yang
sudah dipakai hanya muncul sebagai banner di tahap paket, jauh dari kolom yang salah.

Dependensi mati dibuang: `passport`, `passport-google-oauth20`, `jose`, dan
`@types/passport-google-oauth20` — nol impor di seluruh `apps/api/src`.

Diverifikasi di browser terhadap API dan web lokal (web 3200, API 3001): landing memuat katalog
dari API lewat kunci `useAsyncData` bersama (`payload.data.catalog.sandbox === true`, bukan
cadangan contracts); login → dasbor memuat daftar undangan; halaman RSVP menampilkan
"dr. Yosi Susanti, Sp.OG" di kedua daftar dan **HADIR 2** alih-alih 0; tabel tamu menampilkan
"HADIR"; undangan publik dengan token tamu membaca jawaban lama dengan benar
("Kehadiran dikonfirmasi · 2 kursi disiapkan"); editor memuat dan menyimpan draft (r32 → r36)
lewat endpoint yang kini menuntut `revision`. Nol galat console dari aplikasi. 129 tes unit,
typecheck API dan web, serta lint bersih.

## 2026-09-15: id pada elemen klik (fase 15)

149 elemen klik, nol punya `id`. Sekarang 193 tempat di sumber memasangnya, dengan awalan
per-area kebab-case yang melanjutkan `iv-` yang sudah mapan: `auth-` (26), `dash-` (19),
`editor-` (65), `guest-` (14), `order-` (18), `nav-` (9), `landing-` (10), `iv-` (32).
Sebagian bertemplat, jadi jumlah yang benar-benar dirender lebih besar — halaman editor saja
menghasilkan 87.

**`UiButton` tidak diubah, dan memang tidak perlu:** ia tanpa `inheritAttrs: false` dan
root-nya `<Primitive>` reka-ui yang meneruskan attr ke elemen yang dirender, jadi
`<UiButton id="x">` sudah mendarat sebagai `<button id="x">`. Dikonfirmasi di browser, bukan
dari membaca kode: `editor-save`, `editor-publish`, dan 85 id editor lain benar-benar ada di DOM.
Sama untuk `UiGoogleButton`, `UiInput`, `UiSelect`, dan `UiTextarea`.

**Tiga komponen memang perlu diubah sumbernya.** `ui/RadioCard.vue` root-nya `<label>`, jadi
`id` dari luar mendarat di label — bukan di `<input type="radio">` yang sebenarnya diklik;
sekarang `inheritAttrs: false` + `v-bind="$attrs"` pada inputnya, mengikuti pola `Input.vue`.
`ui/Carousel.vue` dapat prop `controlId`, karena tombol titik/prev/next internalnya tak
terjangkau dari luar. `ui/Field.vue` dapat prop `id` opsional yang menimpa `useId()` — `useId()`
hanya menjamin label dan kontrolnya berpasangan, nilainya berubah tiap render — dan satu prop
per `<UiField>` membuat 52 `:id="id"` yang sudah ada jadi stabil.

**Jebakan yang dihormati.** Banyak id berada di dalam `v-for`, jadi bertemplat
(`:id="`guest-row-delete-${row.id}`"`, mengikuti preseden yang sudah ada di `guests.vue`).
`DashboardNav` merender rel desktop **dan** bilah bawah ponsel sekaligus — disembunyikan CSS,
bukan `v-if` — jadi keduanya berawalan berbeda (`dash-nav-*` dan `dash-tab-*`); `duplicate-id`
di axe tidak peduli sebuah elemen terlihat atau tidak.

**`public.spec.ts` ikut disesuaikan.** Tesnya menegaskan urutan section lewat `[id^="iv-"]`,
dan sejak tiap elemen klik di undangan berawalan sama, pemilih itu ikut menangkap kontrol.
Selektornya jadi `[data-iv-section][id^="iv-"]` — maksud tesnya tidak berubah.

**Satu cacat rancangan batas laju ketahuan justru oleh suite e2e,** bukan oleh gerbang tipe:
tujuh tes `dashboard.spec.ts` merah karena login yang **berhasil** ikut menghabiskan ember
brute-force. Yang dibatasi seharusnya menebak, bukan memakai, jadi `login` yang lolos kini
mengembalikan jatahnya (`forgiveIdentityAttempt`). Diverifikasi: 15 login benar berturut-turut
semuanya 201, lalu 10 percobaan salah lolos dan yang ke-11 → 429.

Diverifikasi: nol id kembar di landing, wizard `/order`, dasbor, editor (138 elemen ber-id di
satu halaman), dan undangan publik; `[data-iv-section][id^="iv-"]` tetap memulangkan tepat 12
section berurutan. **93 tes e2e hijau di 360/768/1440** dengan axe `wcag2a/wcag2aa/wcag21aa`
nol pelanggaran, 131 tes unit, typecheck API dan web, lint bersih.
