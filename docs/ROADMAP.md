# Peta fase

Satu-satunya daftar fase yang mengikat. Ditulis 2026-09-13 setelah sebuah sesi kehilangan
jejak urutannya: rencana Fase 0–4 hanya pernah hidup di dalam percakapan dan di satu
Artifact, jadi sesi berikutnya tidak punya tempat untuk membacanya. **Fase baru ditulis di
sini lebih dulu, bukan setelah dikerjakan.**

Status fitur per-domain tetap di `docs/features/*/CHANGELOG.md`; berkas ini hanya urutan dan
alasannya.

---

## Selesai

| # | Fase | Hasil |
|---|---|---|
| 00 | Katalog & handoff | Audit terukur 53 ornamen: dirender pada 0,11–0,60px tinta. [Artifact](https://claude.ai/code/artifact/37832f05-582b-4b52-89ed-408d6b1db071) |
| 01 | Fondasi ornamen | 102 komponen (53 digambar ulang bermassa, 30 layer, 6 segel, 13 venue/attire), `OrnamentField`, amplop kayon, 4 primitif motion |
| 02 | Section undangan | Renderer 800 → 402 baris jadi 13 komponen; urutan ikut dokumen. Menemukan `once: true` yang diam-diam mematikan seluruh motion undangan |
| 03 | Landing | "Momen bahagia" dihapus; koleksi tema 4-up berladang ornamen |
| 04 | Dasbor & tes | 6 kontrol editor baru, `pnpm capture:dashboard`, case-study dasbor ter-pin, 72 tes e2e |
| 05 | Ladang ornamen proporsional | `OrnamentField` mengukur wadahnya (`container-type: inline-size`). 375px: `bloom` 100% → 54%, `cascade` 62% → 29%. 1440px tidak berubah. `:scale` hardcoded di kartu tema dilepas |
| 06 | Berat potret dasbor | `capture-dashboard.ts` meng-encode WebP sendiri lewat `sharp`. 1,38 MB → **471 KB (−65%)**. `vite` dipaku `^7.3.6` setelah install menarik pohon kedua |
| 07 | Judul hero tidak berkedip | Gerakan masuk seketika dilewati kalau modul motion telat >200ms; reveal bergerbang scroll tidak disentuh |
| 08 | Jejak artefak | Rombak 0–07 masuk `docs/features/{invitation-builder,landing-order}/CHANGELOG.md`; DESIGN.md dapat aturan ladang ornamen dan aturan motion ke-9 |
| 09 | Gerbang penuh | `typecheck` · `lint` · 65 tes unit · **72 tes e2e di 360/768/1440** hijau, axe 0 violation di keenam tema |
| 10 | Audit dasbor & editor | 4 halaman tanpa `<title>` dan `<dl>` ringkasan yang tidak sah — keduanya `serious` di axe, lolos karena **axe tidak pernah menyapu dasbor**. Pratinjau editor lepas dari 576px, ikut tinggi layar. 75 tes e2e |
| 11 | Lebar kerja editor | `DashboardShell` dapat dua tingkat lebar (baca 1024 / kerja 1536); kolom pengaturan editor **312px → 528px** di 1440. Panel pengaturan pindah ke container query — `sm:` di dalam kolom selebar 312px selalu benar dan selalu salah. Tahap dua kolom baru untuk 1024–1280. Label bagian membungkus, bukan dipotong — tiga dari empat belas nama dulu berakhir elipsis. Potret landing diambil ulang. 84 tes e2e |
| 12 | Pratinjau perangkat | Rel pratinjau dapat pemilih **Ponsel / Tablet / Laptop** (390/834/1280px), dirender sungguhan lalu diperkecil, dengan lebar dan persen skala tertulis. Undangan jadi 100% container query — lima `md:`/`sm:` terakhir dikonversi, ambang 640/768px tidak bergeser. Selokan kolom 20 → 32px. 87 tes e2e |
| 13 | Pengerasan API | 14 temuan keamanan & korektnes. `PUT /draft` tanpa kunci `revision` dulu **berhasil menimpa** revisi apa pun — Prisma membuang filter `undefined`, bukan mencocokkan null. 18 endpoint kini divalidasi zod di batas controller; `assertRuntimeEnv()` menolak boot tanpa `JWT_SECRET` sah; `role` dibaca ulang dari DB tiap permintaan; 500 akhirnya tercatat di log |
| 14 | Composable domain | 41 pemanggilan HTTP inline → tujuh composable; `useApi` hanya dipanggil dari dalamnya. Menyatukan tipe ke `@aruna/contracts/api` membongkar **enam kolom yang tidak pernah dikirim API** — termasuk ejaan kehadiran `YES`/`NO` yang membuat penghitung "hadir" selalu 0 di tiga layar |
| 15 | Id pada elemen klik | 193 tempat memasang id berawalan area; `UiButton` tidak perlu diubah, tiga primitif lain perlu. Suite e2e menemukan login yang **berhasil** ikut menghabiskan ember brute-force fase 13 |
| 16 | Foto & musik di dasbor | Area jatuh foto dengan validasi di klien (JPG/JPEG/PNG/WebP, 10 MB) di galeri, cover, mempelai, dan langkah Cerita; foto dinormalkan ke WebP 2000px sebelum naik (PNG 3,3 MB → 11 KB). Aset ikut terhapus, dan yatim disapu saat terbit ulang. Section `music` akhirnya punya panel: 7 lagu CC0/PD, unggah MP3, tempel URL; gerbang mengumumkan musiknya lebih dulu dan `play()` dipanggil sinkron di dalam klik gerbang. **Dua bug lama ikut ketahuan**: penjaga hapus memakai dokumen tersaring sehingga galeri yang sedang dimatikan boleh kehilangan fotonya, dan undangan ternyata belum 100% container query — 6 `@media`, 4 lebar foto cover, dan 6 skala huruf masih membaca lebar layar. 158 tes unit, 105 e2e |
| 17 | Musik yang tahu kapan harus diam | Musik latar berhenti saat tamu menekan "Buka siaran" dan saat tabnya tersembunyi — sebelum ini `<audio loop>` terus berbunyi menimpa siaran akad, karena browser tidak menjeda audio tab tersembunyi. Lima aturannya pindah ke `utils/music-state.ts`, reducer murni tanpa DOM, dan `MusicPlayer.vue` tinggal jadi adaptornya; `InvitationContext` dapat `pauseMusic`. **Ditemukan lewat trace enam demo Katsudoto** yang awalnya hanya untuk menjawab "musik latar mereka YouTube atau bukan" (bukan — MP3 sendiri; YouTube cuma untuk seksi video). Trace yang sama membongkar **endpoint media kita mengabaikan `Range`** — `res.send(buffer)` menjawab `200` berisi seluruh badan, sementara WebKit meminta `bytes=0-1` lebih dulu; aset bawaan lolos karena disajikan Nitro, lagu unggahan pasangan tidak. Sekarang `206`/`416`/`Accept-Ranges` dengan pembacaan header di `media-range.ts`. Tombol musik pindah ke kiri bawah, dan kreditnya berhenti bersembunyi di bawah 384px. 175 tes unit, 108 e2e |
| 18 | Autosave dicabut & WebKit 390 | Autosave menyimpan ulang sendiri tiap ±900ms selamanya — satu suntingan jadi 13 revisi dalam 12 detik, karena jawaban server yang cuma menggemakan permintaan ditugaskan kembali ke state lokal. Dicabut; simpan jadi sadar, keadaannya tertulis, dan halaman yang ditinggalkan memunculkan popup global baru (`usePopupStore` + `AtomicPopup` + `usePopup`). Pelepasan aset ikut mengikuti simpan: aset QA **7 sebelum, 7 sesudah** satu putaran suite penuh, dari yang dulu merangkak ke 15. `device preview` WebKit 390 ternyata bukan klik yang menggantung melainkan `document.fonts.ready` yang **tidak pernah resolve** di sana — 12 `@font-face` per weight Cormorant membuat WebKit membatalkan duplikat dan satu face `error` membekukan `FontFaceSet`; 30s timeout → 2,3s. **Dan project `safari` membayar dirinya sendiri lagi**: `canvas.toBlob` boleh mengembalikan PNG untuk permintaan WebP, jadi tiap unggahan foto dari browser tanpa encoder WebP ditolak server. 189 unit, 148 e2e |
| 19 | Rilis pertama ke produksi | VPS IDCloudHost berdiri (2 vCPU / 3,8 GiB, swap 2 GB, ufw 22/80/443), image dibangun di CI bukan di server, `/srv/aruna` dengan empat env mode 600. Dua kegagalan diam ditangkap sebelum rilis: `HOST=0.0.0.0` wajib (bawaan `127.0.0.1` = loopback container, Caddy menjawab 502 dengan log API bersih), dan media lokal tanpa volume hilang tiap rilis. **Aturan urutan dilanggar** — ditulis setelah dikerjakan |
| 20 | Konfigurasi di berkas yang salah | Tiga syarat hidup-matinya situs yang lolos `typecheck`, `lint`, dan 189 tes karena tak satu pun hidup di kode yang diuji. `HOST` pindah dari `api.env` server yang tidak terlacak git ke `compose.prod.yaml`. `MEDIA_LOCAL_DIR` relatif ternyata menulis ke `/app/apps/api/.data/media` — **bukan** volume; dibuat absolut dan di-resolve sekali saat `LocalMediaStorage` dibangun. Log boot berhenti mencetak alamat yang belum tentu di-bind |
| 21 | Kesehatan yang membuktikan | `/ready` tidak lagi hanya `SELECT 1`: `probeMediaStorage()` tulis-baca-hapus di penyimpanan sungguhan, batas 2 detik, dan pesannya menyebut mana yang gagal — bentuk yang menangkap persis bug fase 20, yang lolos gerbang lama tanpa satu galat. Worker dapat endpoint `:3002`: ia satu-satunya service yang bisa hidup-tapi-mati, karena `boss.on('error')` cuma mencetak dan `restart: unless-stopped` karena itu tidak pernah memutar ulang. `web` dapat healthcheck; `depends_on` sengaja tetap `service_started` supaya galeri rusak tidak berubah jadi situs mati |
| 22 | CI yang menjaga rilisnya | **148 eksekusi Playwright tidak pernah jalan di CI** — investasi terbesar repo ini tidak menjaga jalur rilisnya. Job `e2e` sejajar `verify`, tanpa `needs:`/`if:`/`continue-on-error:`: ketiganya cara job merah tetap jadi `workflow_run.conclusion: success` yang menggerbangi deploy. Fixture hilang di CI kini melempar, bukan `test.skip` yang menghapus 44 eksekusi tanpa suara. **Caddyfile ternyata tidak punya satu pun jalur ke server** — tiap perubahannya diam-diam tidak pernah berlaku; sekarang dikirim ke staging, divalidasi di container sekali pakai, baru menimpa, lalu `caddy reload` tanpa memutus koneksi. Plus pemangkasan image yang menyisakan jalur rollback, dan `ops/rollback.sh` menggantikan tiga baris yang diketik ulang jam 2 pagi |
| 23 | SMTP yang gagal saat boot | `mail.service.ts` baru memeriksanya saat email pertama dikirim: API tanpa SMTP menyala bersih, `/ready` hijau, dan yang menemukan masalahnya adalah pelanggan pertama yang mendaftar. Keempat `SMTP_*` masuk `PRODUCTION_REQUIRED` — `USER` dan `PASS` ikut, karena separuh terisi gagal persis seperti kosong tapi terlihat sudah dikonfigurasi. `ops/README.md` jadi runbook produksi; `apps/web` dan `apps/worker` akhirnya punya `.env.example`. 215 tes unit |

---

## Sisa

**Fase 53 — tema `aruna-sekar`, dan slot yang akhirnya diisi.** Ditulis 2026-09-18, **sebelum satu
berkas pun disentuh**. Fase 47 menyisakan barisnya sebagai "menunggu pemilik"; yang datang adalah
sembilan ekspor Canva dan satu ubin damask seamless 864×864, dengan permintaan tema khusus yang
dibangun dari sana.

**Kesembilannya jadi referensi, bukan barang kirim.** Itu keputusan pemilik, dan ia sejalan dengan
hukum yang sudah berlaku: `imported/` di docs sudah menampung 58 aset Canva yang **tidak satu pun**
pernah dikirim ke tamu, sementara melati, kayon, dan sunda yang tayang semuanya original. Yang
diambil dari referensi adalah palet, rasio, ketebalan, dan arah gradasinya — bukan path-nya.

**Dua temuan dari membedah berkasnya menentukan bentuk pack ini.** `Ungu Bunga Frame` memakai
**516 KB untuk dua poligon emas**: 774 serpih terklip yang meniru gradient satu per satu, karena
ekspor Canva tidak punya `<linearGradient>`. Dan dua berkas terberat (1,9 MB dan 8 MB) isinya
**PNG cat air tertanam**, bukan vektor sama sekali. Keduanya digambar ulang; gradasinya lewat ramp
`--iv-orn-*` yang sudah ada sejak fase 42, bukan lewat serpih.

**Syarat mutu pemilik: jangan datar.** `ornament-palette.ts` lahir persis dari keluhan yang sama —
128 dari 133 glyph cuma punya dua tingkat. Tiap glyph pack ini wajib memakai tiga dari empat stop
ramp dan minimal satu `<linearGradient>` pada bidang bermassa besar.

**Yang punya sisi kiri dan kanan dipecah jadi dua glyph**, digambar terpisah dan bukan
`scaleX(-1)`: sudut sulur, rangkaian bunga, dan karangan daun.

**Fase 57 — artefak berhenti di-gitignore.** Ditulis 2026-09-18, atas permintaan pemilik yang
mengerjakan repo ini dari lebih dari satu mesin. `docs/` di-ignore sejak baris pertama
`.gitignore`, `.claude/skills/` menyusul, dan `packs/` — 90 glyph yang sudah dipakai produksi —
belum pernah sekali pun di-commit. Akibatnya progres hanya hidup di satu laptop.

Alasan yang tertulis untuk mengabaikan skill **sudah tidak berlaku**: ia menyebut `core.test.mjs`
yang dijaring glob vitest, dan `vitest.config.ts` sekarang sudah mengecualikan `.claude` dan
`.codex`. Yang tetap di luar git hanya bahan berat — 321 MB berisi font, potret, dan video
referensi; yang masuk ≈1,2 MB teks.

**Fase 56 — media pindah ke object storage.** Ditulis 2026-09-18, **sebelum satu berkas pun
disentuh**. Lahir dari permintaan pemilik agar foto disimpan di cloud, bukan dari temuan gerbang.
Providernya IDCloudHost IS3 (`https://is3.cloudhost.id`), satu vendor dengan VPS.

**Fase 56 selesai 2026-09-18, dan menyala di produksi.** PR #4 (`0412617f3`) di-merge pukul 08:37
UTC; Verify dan Deploy sama-sama hijau, dan gerbang `Tunggu /ready` di `deploy.yml` — yang di mode
S3 berarti `HeadBucket` ke bucket sungguhan — lolos. `https://api.arunadewa.id/ready` menjawab
`{"database":"ok","media":"ok"}`, container `api` membawa `MEDIA_PROVIDER=s3` dengan endpoint dan
bucket yang benar, dan volume `media` tetap terpasang.

**Produksi ternyata tidak punya satu pun media, dan itu layak ditulis apa adanya.** Tabel
`MediaAsset` kosong; volume hanya berisi `.ketahanan` sisa fase 24 dan satu berkas `.probe/` yatim
dari probe lokal yang container-nya mati di tengah — keduanya bukan media pelanggan. Artinya
seluruh mesin migrasi yang dibangun fase ini (`--copy`, `--flip`, dan dual-read itu sendiri) **tidak
memigrasikan apa pun di produksi**: ia dibangun untuk keadaan yang di sana tidak ada. Dua pengguna
terdaftar, nol undangan terbit.

Itu tidak membuatnya sia-sia — dual-read tetap perilaku yang benar, ia menahan kelas kegagalan
nyata di mesin pengembang (24 aset `LOCAL`), dan ia yang membuat rollback `MEDIA_PROVIDER: local`
aman kapan pun. Tapi klaim "nol downtime, nol foto hilang" di produksi tidak pernah diuji oleh
kenyataan, karena tidak ada foto untuk dihilangkan. Aturan "jangan `--flip` sebelum backup" juga
kosong isinya di sana sampai ada pelanggan pertama.

**Yang belum dibuktikan di produksi:** satu unggahan sungguhan lewat dasbor yang mendarat di bucket
dan tersaji di tautan tamu. `/ready` hijau membuktikan bucket bisa dihubungi, bukan bahwa foto
pelanggan sampai ke sana.

**Urutan rilisnya yang menahan seluruh risiko, bukan kodenya.** Bucket dibuktikan lebih dulu
(`ops/media-bucket-check.sh`: path-style, put/get/delete, HeadBucket, `If-None-Match`, dan **anonim
harus 403**). Lalu kode masuk dengan produksi masih `local` — rilis yang wajib membosankan. Lalu
objek lama disalin dan **diverifikasi ada** (`ops/media-migrate.sh --copy`), baris DB belum
disentuh. Lalu backup dibuat mencakup bucket, **sebelum** ada unggahan yang hanya hidup di sana.
Baru flip, dan itupun `S3_*` diisi di `/srv/aruna/api.env` lebih dulu, baru `compose.prod.yaml`
menyetel `MEDIA_PROVIDER: s3` — urutan terbalik membuat API menolak boot dan gerbang `/ready` di
`deploy.yml` menggagalkan rilisnya, yang memang perilaku yang diinginkan. `--flip` baris `LOCAL`
menyusul berhari-hari kemudian, karena ia titik rollback terakhir yang hilang.

**`MEDIA_PROVIDER` ditulis di `compose.prod.yaml`, bukan di `api.env`.** Doktrin berkas itu sudah
menyatakannya untuk `HOST` dan `MEDIA_LOCAL_DIR` sejak fase 20: nilai yang menentukan apakah
unggahan bertahan tempatnya di berkas yang ikut git, bukan di satu server yang ditulis tangan
sekali. Rahasianya (`S3_*`) tetap di `api.env`. Volume `media:` **tetap dipasang** dan berhenti
jadi jalur tulis — ia sekarang satu-satunya sumber baca aset `LOCAL` warisan.

**Keputusan yang ditunda, dengan sengaja:**

- **CDN dan URL bucket langsung.** Tiap foto tamu tetap lewat proxy API dan tetap dibaca utuh ke
  memori — sama seperti sekarang, jadi bukan regresi, tapi juga bukan yang bertahan di trafik
  nyata. Memindahkannya membatalkan `servesAsset()` (kontrol akses draf vs publik) **dan** seluruh
  dokumen tersimpan yang URL-nya dicocokkan terhadap `API_ORIGIN` di `asset-usage.ts`. Itu fase
  tersendiri, dengan migrasi dokumen, bukan sisipan di sini.
- **Menghapus volume `media:`.** Baru setelah `--flip` dan setelah hitungan baris `LOCAL` nol.
- **Versioning / object lock di bucket media.** Salinan kedua sudah dijamin backup terenkripsi;
  menambah ini butuh verifikasi dukungan IS3 dan tidak boleh menahan rilis.

**Bukti yang sudah ada.** `s3-roundtrip.spec.ts` menjalankan putaran penuh lewat HTTP sungguhan —
`S3Client` asli, penandatanganan asli, hanya penyimpanannya yang ditiru — dan menangkap tiga hal
yang tidak bisa dilihat tes ber-mock: bentuk alamat path-style, kunci bergaris miring yang harus
tetap utuh sebagai path, dan `GetObject` gagal yang harus melempar alih-alih mengembalikan body
kosong yang lolos sampai ke `<img>` tamu sebagai berkas rusak. Tiruan pertamanya sendiri sempat
salah dengan cara yang instruktif: SDK menempelkan `?x-id=PutObject` ke tiap operasi, jadi tiruan
yang tidak membuang query menyimpan objek dengan kunci yang tidak akan pernah bisa dibaca kembali.

Di luar itu, seluruh daur hidup media diverifikasi terhadap stack lokal yang hidup: unggah foto
sungguhan lewat editor, simpan, muat ulang, baca kembali 200, hapus, dan berkasnya benar-benar
dilepas — semuanya melewati `storageForAsset()` yang baru.

**Satu keputusan digantung sampai ada buktinya, lalu diambil.** `If-None-Match: *` pada
`PutObject` — padanan `flag: 'wx'` milik jalur lokal — tidak seragam ditegakkan di implementasi
S3-compatible, jadi `put` sengaja dibiarkan polos sampai bucket sungguhan menjawab. IS3 menjawab
**412**, dan `put` sekarang mengirimkannya: kedua backend memberi jaminan yang sama, dan komentar
"copy, bukan sync" di `backup.sh` boleh menyandarkan diri pada storage lagi.

Pemeriksaannya sendiri sempat salah dengan cara yang layak dicatat: versi pertama menyimpulkan
"ditegakkan" dari *permintaannya melempar*. Tapi header yang **ditolak karena tidak didukung** juga
melempar — dua kesimpulan berlawanan dari bukti yang sama, dan yang salah akan menuliskan jaminan
palsu ke dalam runbook backup. Sekarang hanya kode 412 yang dihitung; 400/501 dilaporkan sebagai
tidak didukung, sisanya sebagai **tidak bisa disimpulkan**.

Dua kegagalan menyiapkan bucket juga meninggalkan pelajaran yang sama bentuknya: `pnpm media:check`
dua kali menjawab `UnknownError` padahal server mengirim `NoSuchBucket · 404` dan
`SignatureDoesNotMatch · 403`. SDK menelan detailnya dan `HeadBucket` memang tidak punya badan
jawaban, jadi skripnya kini membaca kode HTTP langsung — 404 berarti bucketnya belum dibuat, 403
berarti kuncinya, 400 hampir selalu region. Ditambah gerbang salah-tempel, karena nilai yang masuk
ke `S3_SECRET_ACCESS_KEY` dua kali berturut-turut bukan kunci melainkan baris env dan potongan
perintah shell — dan tidak ada satu pun pesan yang menyebutnya.

---

**Fase 33–47 — undangan berhenti terbaca sebagai loop.** Ditulis 2026-09-18, **sebelum satu
berkas pun disentuh**. Lahir dari keluhan pemilik bahwa tema yang ada terasa kaku, dan dari
temuan bahwa penyebabnya bukan kekurangan ornamen.

**Sembilan tema berbagi satu koreografi.** `Renderer.vue:164-197` menyiram hal yang sama
persis ke setiap section: `orchestrate(s, { stagger: .16, duration: 1.4 })` tiga belas kali,
ditambah `revealUp` dan `parallax` global. Ornamennya berbeda antar tema, **iramanya
identik**. Yang dibaca tamu karena itu bukan narasi melainkan sebuah loop, dan tidak ada
jumlah ornamen baru yang bisa memperbaikinya. Template mendapat sumbu ketiga — palet,
ornamen, lalu **partitur scroll** — dan babaknya diturunkan dari peran tiap tipe section,
bukan dari urutannya, supaya kontrak dokumen tidak disentuh sama sekali.

**Template dibedakan gayanya, bukan sukunya.** Rencana pertama mengunci satu template ke satu
pack budaya, dan itu memaksa dua hal yang dua-duanya buruk: pack `sunda` cuma punya enam SVG
sehingga ia butuh satu segel dan lima layer digambar dari nol hanya untuk memenuhi sebelas
slot `OrnamentSet`, dan produknya mulai mengklaim keaslian yang tidak bisa
dipertanggungjawabkan. Disusun per gaya, keduanya terbalik: `aruna-wastra` (etnik modern,
motif diabstraksi jadi bidang besar), `aruna-hening` (editorial minimal, tipografi yang jadi
ornamennya), `aruna-pelita` (mewah gelap). Set ornamennya dirakit dari seluruh kosakata 225
keping. Nama template menyebut gaya, jadi tidak ada klaim keaslian yang dibuat; catatan asal
tiap ornamen tetap ikut di katalognya dan tidak dihapus.

**Tiga temuan dari pembacaan kode yang mengubah rencananya, bukan asumsi:**

**Seluruh bank ornamen ikut bundle untuk setiap tamu.** `Glyph.vue:14` memakai
`import.meta.glob('./*.vue', { eager: true })`, dan komentarnya jujur: *"seluruh isi bank
masuk bundle"*. Hari ini 133 komponen / 532 KB sumber, masing-masing ≤4 KB. Pack kurasi
berbobot **948 KB** dengan berkas individual sampai **44 KB** — sebelas kali ornamen produksi
terberat. Mempromosikan 92 aset apa adanya berarti tiap tamu mengunduh ornamen dua belas tema
untuk melihat satu. Karena itu plafon byte jadi **gerbang sebelum promosi**, bukan catatan
sesudahnya, dan yang dipromosikan hanya ~50 aset yang benar-benar terpakai.

**Satu entry section bisa menghasilkan nol elemen DOM.** `Video.vue` (`v-if="url"`) dan
`Rundown.vue` (`v-if="items.length"`). Pemetaan section → babak karena itu tidak boleh memakai
indeks daftar; ia di-stamp lewat atribut lalu dibaca ulang dari DOM, sehingga section hantu
hilang sendiri termasuk dari perhitungan kurva kepadatan.

**Pratinjau editor memakai `transform: scale()`, bukan lebar sungguhan**
(`editor.vue:1576-1578`). `getBoundingClientRect().width` pada `.iv-root` mengembalikan 97px
untuk pratinjau Ponsel 390px sementara container query melihat 390px. Deteksi lebar di JS
wajib `clientWidth`, dan `gsap.matchMedia()` tidak bisa dipakai sama sekali — ia melihat
viewport editor 1440px. Ini persis kebohongan yang dilarang fase 16, cuma di sisi JS.

**Dua pelanggaran aturan yang sudah tayang, ditemukan sambil jalan dan diperbaiki lebih
dulu.** `useArunaMotion.ts:270` memakai `iris.scale = 1.12` padahal DESIGN.md mematok skala
masuk foto maksimum 1.06, dan `Couple.vue` memilih `iris` untuk `seed % 4 === 3` — jadi ini
benar-benar tayang. Dan **tidak ada satu pun `ScrollTrigger.refresh()` di repo**, padahal
undangan penuh `clamp()` dan font display yang datang belakangan membuat setiap
`start: 'top 78%'` meleset sepanjang halaman. Keduanya masuk fase 33, sebelum apa pun
ditumpuk di atasnya.

**Transisi antar-babak penuh tanpa melanggar aturan pin.** Pemilik meminta transisi bertopeng
di setiap pergantian babak. DESIGN.md melarang lebih dari 1–2 `pin` per halaman — dan itu
tidak bertabrakan, karena transisi yang dirancang **tidak memaku sama sekali**: `veil`
men-`scaleY` pita pemisah, `wipe` men-`clip-path` section berikutnya, keduanya murni
ber-scrub. Satu-satunya pemilik `pin` tetap `Gallery.vue`. Pita transisinya adalah elemen yang
sudah ada di markup dan terbaca sebagai pembatas bab tanpa JS — `opacity: .8`, bukan `0`.

**Warna: varian suasana terkurasi.** Pemilik meminta warna "bisa di-combine, bisa diubah, bisa
tetap". Pemilih palet bebas penuh menghapus identitas template — dua belas template berubah
jadi satu template dengan dua belas nilai awal, dan `repairPalette()` hanya menjamin
kontrasnya lolos, bukan bahwa hasilnya indah. Varian terkurasi menjawab ketiganya: tetap
(preset), combine (pilih suasana, gratis), ubah (geser sendiri, tetap add-on). Sambungannya
dua: `themeStyle()` membaca accent dari varian yang cocok sehingga accent berhenti terkunci,
dan `hasDesignChange()` belajar mengenali palet terkurasi sehingga memilih suasana tidak
memicu gerbang add-on. Nol perubahan pada `invitationDocumentSchema`.

| # | Isi |
|---|---|
| 33 | Higiene motion, nol fitur: `iris` 1.12→1.06; `document.fonts.ready` → `refresh()`; refresh gambar ter-debounce; `api.container` (`clientWidth`); `triggerBudget`; `ResizeObserver` bucket lebar. **Selesai 2026-09-18** |
| 34 | Tipe + fungsi murni partitur + tesnya. Belum ada pemakai. **Selesai 2026-09-18** |
| 35 | Pindahkan callback Renderer apa adanya ke `playLegacyScore`. Diff wajib murni pemindahan. **Selesai 2026-09-18** |
| 36 | Primitif baru: `drift` (satu trigger untuk seluruh halaman), `silhouette`, `orchestrate` yang menerima partitur. **Selesai 2026-09-18** |
| 37 | `Segue.vue` + primitif `segue`. Pita dalam keadaan istirahat dulu, dipastikan terbaca, baru animasinya. **Selesai 2026-09-18** |
| 38 | `playScore` + stamp `data-iv-act` + render pita. **Selesai 2026-09-18** |
| 39 | Mesin geometri ornamen + isen + gerbang mutu. Dijalankan pada bank sekarang, kegagalannya dicatat sebagai garis dasar. **Selesai 2026-09-18** |
| 40 | Riset bersumber 8 keluarga motif; `CULTURE-BANK.md`; klaim tak bersumber dibersihkan. **Selesai 2026-09-18** |
| 41 | Gubah ulang 6 kategori inti (frame/divider/corner/motif/symbol/seal = 59). **Bingkai 13/13 selesai 2026-09-18; 46 sisanya berjalan** |
| 42 | Gubah ulang layer 45 + floral 11 + monogram 4 = 60 |
| 43 | Gubah ulang venue 8 + attire 5 = 13. Bangunan tetap rigid |
| 44 | ~~Barel ornamen per tema~~ **dimajukan dan selesai di fase 41**: `Glyph.vue` jadi glob malas |
| 45 | Turunkan tinta tombol `#FFFDF7` jadi `--iv-on-primary`. Membuka tema gelap. **Selesai 2026-09-18** |
| 46 | `paletteVariants` + resolusi accent + gerbang `hasDesignChange` + kartu varian di editor |
| 47 | Pisahkan id yang **diterima schema** dari id yang **bisa dipilih**. Nol perubahan visual. **Selesai 2026-09-18** |
| 48 | Hapus delapan tema dari pemilih; bloom sendirian. Selamatkan gerbang forge. **Selesai 2026-09-18** |
| 49 | Varian ornamen terkurasi + menu edit ornamen di dasbor. **Selesai 2026-09-18** |
| 50 | Template `aruna-wastra` — etnik modern; partitur pertama yang hidup. **Selesai 2026-09-18** |
| 51 | Template `aruna-hening` — editorial minimal. **Selesai 2026-09-18** |
| 52 | Template `aruna-pelita` — mewah gelap, sekaligus bukti fase 45. **Selesai 2026-09-18** |
| 53 | Tema `aruna-sekar` — permintaan pemilik, dibangun dari sembilan referensi Canva miliknya sendiri plus satu ubin damask. Pack `sekar` 22 glyph bergradasi, dan backdrop pertama yang benar-benar menyala. **Selesai 2026-09-18** |
| 54 | Migrasi `draftDocument` + pembebasan gerbang `design`. **Skrip selesai 2026-09-18; belum dijalankan di produksi** |
| 55 | `DESIGN.md` diperbarui 2026-09-18. **`playLegacyScore` belum bisa dihapus** — bloom sengaja belum diberi partitur |
| 57 | Artefak berhenti di-gitignore: skill, `packs/`, dan docs teks ikut terlacak supaya progres terbaca dari mesin lain. **Selesai 2026-09-18** — 134 berkas docs (1,15 MB), 126 berkas packs (1,40 MB), 23 berkas skill (0,09 MB) |

**Fase 47–55 menggantikan fase 47–50 yang lama.** Ditulis 2026-09-18, **sebelum satu berkas pun
disentuh**. Pemilik meminta seluruh tema dihapus kecuali `aruna-bloom`, lalu tema dibangun ulang
dengan aturan dan ornamen baru, dengan satu tema terakhir yang ia tentukan sendiri — plus menu edit
ornamen di dasbor. Rencana lama "retrofit sembilan tema lama, satu commit per tema" karena itu
batal: yang diretrofit tinggal satu.

**Tiga temuan dari pembacaan kode yang mengubah urutannya, bukan asumsi.**

**`aruna-pelita` terkunci di belakang fase 45, dan itu terukur.** Keempat pasangan kontras dihitung
dengan formula `checkPalette` yang sebenarnya: primary emas terang `#D8B26A` memberi body 15,02 ·
accent 8,76 · accentOnTint 7,42 · **button 1,97**; primary yang cukup gelap untuk tombol membalik
kegagalannya jadi **accent 3,08**. Tidak ada palet gelap yang lolos selama tinta tombol dipanggang
`#FFFDF7`. Palet yang sama dengan tinta turunan `#1A1508` memberi **button 9,09**. Fase 45 jadi
prasyarat keras, bukan urutan yang enak.

**Menghapus delapan tema membuat gerbang keunikan berhenti mengukur 48 dari 54 glyph — sambil
melaporkan "0 pelanggaran".** `verify.mjs` membangun kepemilikan dari `bacaTema()` lalu melewati
glyph tanpa pemilik diam-diam (`if (!ta || !tb) continue`). Hari ini 9 tema × 6 kategori unik = 54
slot terjaga; setelah penghapusan hanya 6. Gerbangnya akan hijau dan tidak berarti apa-apa — persis
kelas kegagalan yang sudah dibayar mahal di fase 41. Karena itu tema yang dihapus **tidak hilang
dari forge**, ia pindah ke registri pensiun yang tetap ikut diukur. `paramUntuk()` juga melempar
untuk id tanpa parameter, jadi tanpa registri itu `pnpm ornament:forge` mati di glyph orphan
pertama.

**Pasangan tanpa add-on `design` akan terkunci di tema yang sudah tidak ada.** Mengganti tema
mengubah `tokens`, dan `hasDesignChange()` menggerbangi tiap perubahan `tokens`. Pasangan yang
temanya dihapus karena itu tidak bisa keluar dari sana. Gerbangnya belajar satu kasus di fase 54:
pindah **dari** id usang selalu boleh.

**Penghapusan dikerjakan sebelum fase 41–43 selesai.** Fase 41 masih menyisakan 46 glyph inti dan
fase 42–43 menyisakan 73 lagi — sebagian besar milik tema yang sebentar lagi dihapus. Menggubah
ulang dulu lalu menghapus berarti membayar dua kali.

**Id lama tidak pernah dihapus dari schema.** `templateIds` tetap berisi kesembilan id dan tetap
jadi sumber `z.enum(templateIds)`; yang dipisahkan adalah `liveTemplateIds` — id yang benar-benar
punya wajah dan yang diiterasi seluruh pemilih. Bentuknya menyalin preseden repo ini sendiri:
`fontChoices` (12, termasuk `dm-sans` yang pensiun) versus `selectableFonts` (11). Undangan yang
sudah terbit tidak pernah putus, dan `PublishedRevision.document` tidak pernah ditulisi — itu yang
sedang dibaca tamu detik ini.

**Menu ornamen terkurasi, bukan bank penuh.** Alasannya sama persis dengan yang dipakai fase 46
untuk menolak color picker bebas: pemilih bebas penuh menghapus identitas template. Varian
menjawab ketiga permintaan pemilik sekaligus — tetap (preset), pilih (varian seresep), sesuaikan
(kepekatan yang sudah ada) — dan karena ia hidup di `section.data`, ia lolos `hasDesignChange()`
apa adanya dan tidak menyentuh `invitationDocumentSchema` sama sekali.

**Fase 50 selesai 2026-09-18, dan tiga temuannya datang dari melihat, bukan dari gerbang.**
Keenam glyph wastra lolos kedua belas gerbang sejak percobaan pertama. Lembar kontak menemukan
tiga hal yang tidak satu pun gerbang bisa lihat: mahkota berdataran terbaca sebagai **kubah**
karena bahunya terlalu tinggi; `symbol-wastra` terbaca sebagai **tas jinjing** — dan pelakunya
kartus, bukan anyamannya, karena kartus tiap simbol berbentuk unit temanya dan milik wastra adalah
trapesium, sebuah wadah, sehingga apa pun yang berhenti di dalamnya jadi isi wadah dan cincin
kartusnya jadi tali jinjing; dan `corner-wastra` terbaca sebagai **tangga compang-camping** karena
`jejerProfil` menjejerkan profil tema di tepi diagonalnya, dan bahu yang nyaris nol membuat tiap
ulangan jatuh tegak lurus ke tetangganya.

Perbaikan ketiganya juga bukan detail. Simbol butuh figur yang **melengkung** supaya ia beradu
dengan kartus bersudutnya alih-alih meleburinya — delapan simbol lain tidak mengalami ini karena
kartus mereka memang melengkung. Sudut butuh bahu profil dinaikkan ke −0,33, dan karena mahkota
bingkai punya definisinya sendiri di `bingkai.mjs`, dataran tegasnya tidak ikut dilunakkan. Satu
percobaan cekungan ditangkap `potong-diri` — gerbang memang perlu, ia hanya tidak pernah cukup.

**Yang masih lemah dan tidak disembunyikan:** tunas di siku `corner-wastra` terbaca sebagai
serpihan lepas di bidang putih, bukan sebagai pertumbuhan. Itu perilaku bersama kesepuluh sudut;
milik wastra paling terlihat karena unit temanya bersudut keras dan dicat pucat.

**Partitur akhirnya hidup.** Bukti yang dipakai bukan `[data-iv-act]` — atribut itu dipasang tanpa
syarat di template, dan bloom yang jelas tanpa partitur tetap menstempel dua belas. Yang hanya ada
saat partitur terbaca adalah pita `.iv-segue`. Terukur di `/i/demo`: wastra **7**, bloom **0**.

**Fase 45, 51, dan 52 selesai 2026-09-18, dan tema gelap menagih lebih banyak daripada satu token.**
`onPrimary()` cukup untuk membuat paletnya lolos keempat pasangan — terukur, button 1,97 → 9,09.
Yang tidak terduga: **enam tempat lain memanggang `#fffdf7` dengan asumsi bahwa bidang bertone
selalu bidang gelap**, dan pada `aruna-pelita` `data-tone="ink"` justru bidang paling terang di
halaman karena `--iv-fg`-nya krem. Hanya satu dari keenamnya tertangkap gerbang
(`ornamentRampOnDark` runtuh dari empat langkah jadi satu, accent 1,03); lima sisanya — rel dan
titik cerita, ladang ornamen, motif `::before`, penanda timeline — terlihat di layar dan tidak
oleh satu tes pun.

**Hening menabrak ambang yang benar, dan ambangnya menang.** Bobot garis 2 dipilih karena tema
ini editorial minimal, dan keenam glyphnya langsung gagal gerbang `stroke` yang berambang 2,5.
Ambang itu terukur — ia lahir dari `corner-flourish` yang stroke 1,1-nya jadi 0,31px tinta di
titik pakainya. Yang naik hening, bukan yang turun ambangnya. Dan `rapport` 10 yang dipilih
dengan alasan "paling jarang" ternyata menghasilkan lobus TERBANYAK, karena `sudut.mjs` membaca
`round(rapport/2)+1`: tepi diagonal paling ramai di repo, pada tema bernama hening.

**Pelita menabrak plafon bobot, dan plafonnya menang juga.** Tiga glyph lewat; kerapatan sampel
dipotong 12 → 8 mengikuti `ogee` yang kelengkungannya sebanding, dan ketiganya masuk tanpa
plafonnya disentuh — urutan yang memang diminta aturan fase 39.

**Kolam varian dua tema seketebalan wajib dibagi, bukan dipakai bersama.** Wastra dan pelita
sama-sama 3,5 dan sama-sama menarik dari senja/sogan/gonjong. Kalau keduanya menawarkan glyph
yang sama, dua undangan bertema berbeda bisa berakhir identik pada slot itu — aturan "tidak
pernah berulang antar tema" runtuh lewat pintu yang tidak dijaga gerbang forge. Ditegakkan tes.

**Yang belum selesai dan tidak disembunyikan.** `playLegacyScore` masih ada: keempat tema baru
punya partitur, `aruna-bloom` tidak. Memberinya partitur berarti mengubah irama satu-satunya
tema yang pemilik minta dipertahankan, dan itu keputusannya, bukan keputusan pembersihan. Skrip
migrasi sudah terbukti pada bentuk yang jawabannya diketahui (`aruna-sogan` → `aruna-wastra`,
tokens ikut) dan idempoten, tapi **belum dijalankan di produksi**.

**Fase 33 selesai 2026-09-18, dan satu angkanya membatalkan rencananya sendiri.** Anggaran
trigger ditulis 110 karena undangan penuh diperkirakan memasang 60–90. Diukur di
`/i/demo?tema=aruna-sogan`: **105 trigger** untuk dokumen yang baru 12 section — 41 di
antaranya `[data-iv-reveal]`, 34 ornamen, 12 `orchestrate` section, sisanya rel cerita dan
kelopak RSVP. Nol trigger ber-`end` sama dengan `start`, nol pin.

Angka itu berarti anggaran 110 **bukan jaring pengaman melainkan pembatas yang menggigit
hari ini**: dinding ucapan tiga puluh pesan dan galeri tiga puluh foto menambah puluhan
`[data-iv-reveal]` lagi, dan yang mati diam-diam adalah gerakan di bagian bawah halaman —
tempat yang paling jarang diperiksa orang. Diubah jadi 240, murni penahan agar daftarnya
tidak tumbuh tanpa batas, dan **baru akan diperketat di fase 36** setelah `orchestrate`
bisa melipat `[data-iv-reveal]` ke timeline section-nya. Memperketat sebelum permintaannya
turun hanya memindahkan masalahnya jadi gerakan yang hilang.

Verifikasi: 288 tes unit hijau, lint bersih, typecheck lolos. Di browser, `.iv-root`
dibangun ulang dua arah (1024 → 375 → 1440): **105 trigger di ketiga lebar**, bukan 210 —
context lama benar-benar dilepas. **0 pembungkus `.split-line-wrap` bersarang** setelah dua
kali bangun ulang; itu yang dijaga pencatatan `splits`, karena SplitText menyisipkan
pembungkusnya lewat DOM biasa dan `ctx.revert()` tidak pernah menyentuhnya. Setelah gerbang
dibuka dan halaman digulir sampai dasar, **0 dari 124** elemen ber-`data-iv-*` tersangkut
tak terlihat.

Satu jebakan metodologi dicatat supaya tidak terulang: pengukuran pertama melaporkan 124 dari
128 elemen "tersangkut" — padahal gerbang amplopnya masih tertutup dan `body` masih
`overflow: hidden`. Pengukuran motion undangan **wajib menekan "Buka Undangan" lebih dulu**;
tanpa itu yang diukur adalah halaman yang memang belum pernah diperlihatkan.

**Fase 34 selesai 2026-09-18.** `utils/motion-score.ts`: tipe partitur, peta peran section,
kurva kepadatan, dan pengelompokan babak — semuanya fungsi murni, 18 tes tanpa satu pun DOM.
Dua keputusan bentuk yang layak dicatat. Kurva kepadatan ditulis sebagai **fungsi atas posisi
babak**, bukan larik berpanjang tetap, karena jumlah babak berubah begitu pasangan mematikan
section dan larik akan salah pasang persis ketika itu terjadi. Dan `groupActs()` menerima
**daftar peran**, bukan daftar section: pemanggil di DOM membacanya dari atribut, pemanggil di
tes menuliskannya langsung, dan fungsinya tidak perlu tahu bedanya — itu yang membuat seluruh
partitur bisa diuji tanpa merender apa pun.

Batas ditegakkan di `resolveAct`, bukan dipercayakan ke penulis tema: `weight` dipatok 0,6–1,4
dan `drift` ≤18, jadi data tema **tidak bisa** melanggar aturan DESIGN.md sekalipun penulisnya
mau. Satu tes menjaga hal yang paling mudah terlewat: tiap tipe section di kontrak wajib punya
peran, karena tipe baru yang lupa diberi peran akan diam-diam jatuh ke babak tetangganya tanpa
satu pun galat.

**Fase 35 selesai 2026-09-18.** Koreografi lama pindah apa adanya ke
`utils/motion-play.ts:playLegacyScore()`; blok motion `Renderer.vue` menyusut dari 36 baris
jadi satu. Dibuktikan netral, bukan diasumsikan: **105 trigger, 0 pin, 0 degenerate** —
angka yang sama persis dengan pengukuran fase 33 sebelum pemindahan.

Satu artefak pengukuran dicatat supaya tidak salah dibaca lain kali: potret pertama setelah
pemindahan melaporkan 4 elemen "tersangkut", dan pemeriksaan ulang 2 detik kemudian
melaporkan 0. Keempatnya sedang di tengah timeline section terakhir saat potret diambil.
Jeda 1,5 detik setelah gulir sampai dasar **tidak cukup** untuk ekor koreografi section
terakhir; yang dipakai sekarang 2 detik.

**Fase 36 selesai 2026-09-18.** Tiga primitif, dan ketiganya menolak satu godaan yang sama:
memakai `opacity`.

`drift` memakai **satu** ScrollTrigger untuk seluruh halaman — satu timeline ber-scrub yang
dibuat malas pada panggilan pertama dan dipakai bersama semua keping berikutnya. Seratus
ornamen yang melayang tetap satu entri di daftar trigger global; memberi tiap keping trigger
sendiri adalah cara tercepat menabrak kembali bug `_triggers[i].end`. Arahnya berselang, karena
kalau semua keping bergeser searah halaman terbaca seperti satu lembar yang melorot, bukan
seperti kedalaman.

`silhouette` memakai `filter`, **tidak pernah `opacity`**: targetnya foto cover, yang biasanya
elemen LCP, dan elemen LCP tidak boleh pernah bening. Ia juga mewarisi penjaga `revealBudget` —
foto yang sudah tercat dan sedang terlihat tidak digelapkan lagi kalau modul motion telat,
karena yang berkedip di sana adalah LCP halaman.

`orchestrate` menerima `grammar`, `ornament`, `weight`, dan `reveal`. `grammar: 'silhouette'`
sengaja jatuh ke `rise` di dalamnya: penggelapannya dikerjakan primitif `silhouette()` yang
ber-scrub sendiri, dan menumpuk keduanya pada foto yang sama membuat gerakan masuk bertabrakan
dengan scrub. `reveal: true` hanya melipat `[data-iv-reveal]` yang berada di satu tinggi layar
pertama section — melipat node yang 2000px di bawah trigger membuat dinding ucapan tiga puluh
pesan menyala sekaligus, yang justru lebih buruk daripada trigger per node.

**Dua tes penjaga ditambahkan, dan dibuktikan benar-benar menangkap** — bukan sekadar hijau.
Pelanggaran disuntikkan sementara (`once: true` di `motion-play.ts`, `opacity: 0` di
`Countdown.vue`), keduanya merah, lalu dipulihkan. Pemindai `opacity` sengaja mengecualikan
`@keyframes`: `from { opacity: 0 }` adalah keadaan awal animasi, bukan keadaan istirahat
elemennya. Tiga `@keyframes` yang ada di repo (AppHeader, Popup, AccountMenu) karena itu tetap
sah, dan tidak satu pun ada di komponen undangan.

Verifikasi: 332 tes unit hijau. Di browser, **105 trigger, 0 pin, 0 degenerate** — sama persis
dengan fase 33 dan 35, jadi perluasan `orchestrate` terbukti netral untuk tema tanpa partitur.

Satu jebakan pengukuran kedua dicatat: gerbang amplop **tidak bisa dibuka lewat klik sintetis
saat panel browser tidak ditampilkan**. `document.hidden` bernilai true, `requestAnimationFrame`
dibekukan, dan ticker GSAP tidak pernah maju sehingga `onComplete` → `finish()` tidak pernah
jalan. Yang membuktikan ini bukan regresi: `[data-gate-seal]._gsap` sudah terpasang, jadi
kliknya sampai dan timeline-nya memang dibuat — yang berhenti hanya jamnya.

**Fase 37–38 selesai 2026-09-18, dan pengukurannya mengubah angka fase 33.**

Pita transisi tidak memaku apa pun: `veil` men-`scaleY` pita, `wipe` men-`clip-path` section
berikutnya, `dissolve` melebarkan garis rambutnya — ketiganya murni ber-scrub. Jadi permintaan
pemilik "transisi penuh di setiap pergantian babak" bisa dipenuhi **tanpa menyentuh batas 1–2
`pin` per halaman** di DESIGN.md. Satu-satunya pemilik pin tetap galeri.

**Section hantu ditangani di CSS, bukan di penghitungan.** `Video` tanpa URL dan `Rundown`
tanpa acara merender nol elemen, jadi sebuah pita bisa berdiri tepat sebelum section yang tidak
ada. Pita itu tetap menandai babak yang benar-benar berakhir, dan dua pita yang jadi
bertetangga disembunyikan `.iv-segue + .iv-segue { display: none }` — jauh lebih jujur daripada
membuat Renderer menebak isi tiap section sebelum merendernya. Pemain partiturnya sendiri
membaca babak dari DOM (`[data-iv-act]`), bukan dari daftar section, jadi section hantu hilang
sendiri dari perhitungan posisi babak.

Verifikasi tanpa partitur (harus identik): **105 trigger, 0 pin, 0 degenerate**, 0 pita,
0 reveal terlipat — sama persis dengan fase 33, 35, dan 36. Stempel `[data-iv-act]` mendarat di
**12 dari 12** section, termasuk dua yang root-nya `<div>` pembungkus (`Story`, `Rsvp`) dan
karena itu paling berisiko gagal fallthrough.

**Verifikasi dengan partitur uji yang dipasang sementara ke `aruna-sogan` lalu dicabut lagi** —
karena membuktikan tidak adanya regresi belum membuktikan jalur barunya jalan:

| | tanpa partitur | dengan partitur |
|---|---|---|
| ScrollTrigger | 105 | **51** |
| reveal terlipat | 0 | 39 dari 43 |
| pita transisi | 0 | 7 (5 veil, 1 wipe, 1 dissolve) |
| pin | 0 | 0 |

**Trigger turun 51%.** Pelipatan `[data-iv-reveal]` ke timeline section membayar jauh lebih
banyak daripada yang dipinjam `drift` dan `segue` — dan itu berarti anggaran yang dilonggarkan
ke 240 di fase 33 memang bisa diperketat di fase 39, sekarang dengan angka, bukan perkiraan.
Ketujuh pita `clientHeight > 0` di keadaan istirahat, jadi tanpa JS ia tetap terbaca sebagai
pembatas bab.

Risiko "`wipe` menelan section yang sudah tercat" diuji langsung dan tertutup: satu-satunya
section yang terpotong saat diam ada di y=3413, jauh di bawah lipatan, sementara `overture`
yang sudah tercat tidak tersentuh sama sekali. Digulir ke dalam jangkauannya, potongannya
terbuka jadi `inset(0%)`.

Jebakan pengukuran ketiga, dan yang paling halus: **`document.hidden` membekukan ticker GSAP**,
jadi scrub tidak pernah maju dan pengukuran `clip-path` pertama melaporkan potongan yang tidak
pernah terbuka. Itu bukan kegagalan melainkan jam yang berhenti. Jalan keluarnya
`ScrollTrigger.update()` lalu memaksa `gsap.ticker.tick()` beberapa ratus kali.

`motion` di `InvitationContext` dikeluarkan dari fase ini: satu-satunya pemakainya adalah izin
pin galeri, dan partitur fase ini tidak pernah memasang pin. Ia menyusul bersama template yang
benar-benar memintanya.

---

**Fase 39–51 — ornamennya sendiri yang kaku, dan bingkai tidak cocok dengan ornamennya.**
Ditulis 2026-09-18, **sebelum satu berkas pun disentuh**. Lahir dari keluhan kedua pemilik,
setelah fase 33–38 membereskan keluhan pertama.

**Audit geometri 132 ornamen, dan angkanya membenarkan keluhannya:**

| Temuan | Angka |
|---|---|
| Tanpa satu pun kurva Bézier (murni `M/L/H/V/Z` + `rect`/`circle`) | **41 (31%)** |
| Tanpa `data-draw` — tidak bisa dianimasi DrawSVG sama sekali | **85 (64%)** |
| Kategori `motif`: rata-rata perintah path | **14,6** |
| Kategori `motif`: tanpa `<path>` sama sekali | 3 dari 9 |
| Pelanggaran aturan keunikan DESIGN.md:295 | **4 terkonfirmasi** |

`motif-geometric` secara harfiah 13 `<rect>` bertinggi selang-seling — itu bar chart, bukan
motif. `motif-poleng` nol path. `seal-ring` satu lingkaran, satu ketupat, satu strip; komentar
sumbernya sendiri sudah mengakuinya: *"Tema ini memang tidak menambah apa-apa."*

**Penyebab "bingkai tidak cocok dengan ornamen" ternyata struktural, bukan selera.** Ketupat
empat titik `M…L…L…L…Z` yang sama muncul di **13 komponen lintas 7 kategori**. Satu bentuk
empat titik yang muncul di 13 tempat bukan bahasa visual — itu nilai bawaan. Dan seluruh bank
dibangun dari satu resep yang sama: satu grup massa opacity 1, satu di 0,45, selesai. Tidak
ada isian di dalam bentuk, padahal ornamen tradisional justru hidup dari isiannya.

Pelanggaran terparah: **`divider-row` (tema Kenanga) meminjam 100% geometrinya dari
`divider-lung-lungan` (tema Sogan)** — kuncup yang sama digeser 2px, dan `divider-row` hanya
punya dua path sehingga **keduanya pinjaman**. DESIGN.md:295 sudah menuliskan diagnosisnya
sendiri: *"salah satunya belum benar-benar punya wajah."* Tiga lainnya: `divider-diamond` ↔
`divider-songket`, `frame-gonjong` ↔ `frame-tumpal`, `frame-tumpal` ↔ `seal-tumpal`.

**Gagasan inti: tema adalah satu tata bahasa, bukan sebelas gambar.** Hari ini sebuah tema
adalah sebelas SVG yang digambar terpisah lalu diletakkan berdampingan — itu sebabnya bingkai
dan ornamennya tidak pernah cocok. Setelah rombak ini sebuah tema adalah satu himpunan
parameter yang diinstansiasi sebelas kali: siluet, keluarga isen, ketebalan garis, dan periode
pengulangan yang sama. Kecocokan dijamin konstruksi, bukan ketelitian penggambar.

**Tata bahasanya diangkat dari `originals/kayon/geometry.mjs`, bukan ditulis ulang.** Ia sudah
membangun 39 glyph, dan empat aturannya masing-masing lahir dari kegagalan yang sudah terjadi:
band berongga lewat offset bisektor sudut (menskalakan bentuk terhadap pusatnya selalu
menebalkan ujung yang jauh); tiap sulur wajib berbatang (*"curl telanjang terbaca sebagai
spiral teknis, bukan ornamen"*); isen dipasang lewat uji titik-dalam-poligon, bukan
`clipPath`, supaya menipis sendiri mengikuti siluet; dan detail di dalam bidang penuh harus
jadi rongga `evenodd`, karena *"massa berwarna sama di atas massa tidak pernah terlihat."*

Konsekuensi yang menguntungkan: karena yang diambil **tata bahasanya**, bukan berkasnya,
92 SVG pack kurasi tidak perlu dipindahkan — dan masalah bundel 948 KB dengan berkas
individual 44 KB hilang di sumbernya.

**Kejujuran budaya.** Delapan keluarga dipakai aplikasi tanpa dasar dokumentasi apa pun:
kawung, mega mendung/wadasan, songket, poleng, gonjong, pucuak rabuang, candi bentar, dan
parang. Beberapa komentarnya membuat klaim tanpa sumber (*"motif batik tertua"*, *"dasar dari
hampir semua tepi kain Nusantara"*, *"lambang tumbuh yang berguna sejak muda"*), dan **dua
bertentangan dengan satu-satunya sumber yang ada di repo**: `symbol-payung` diklaim payung
upacara Bali padahal `melati/CULTURE.md` mengaitkan payung ke janur Jawa, dan `motif-kenanga`
digambar berkelopak enam padahal sumbernya menyebut pembeda kenanga adalah kelopak pita yang
meluruh. Skill melarang mengarang makna budaya, jadi klaim tanpa sumber **dihapus**, bukan
diwariskan. Poleng dan gunungan diperlakukan khusus — repo sendiri menandai keduanya punya
konteks yang lebih dari hiasan.

**Gerbang mutu menjadikan "kaku" sebagai angka**, karena tanpa itu "jangan kaku lagi" hanya
selera yang akan luntur di ornamen ke-40: kurva minimum, kepadatan isen, dua bidang nilai,
wajib punya `data-draw`, ketebalan garis 2,5–4, plafon bobot, **keunikan lintas tema** (yang
akan menangkap keempat pelanggaran yang sekarang lolos), dan **kohesi tema**.

**Fase 39 selesai 2026-09-18, dan gerbangnya sempat salah dengan cara yang mahal.**

Mesin geometri di `scripts/ornament-forge/`: `geometry.mjs` (primitif, diangkat dari
`originals/kayon/geometry.mjs`), `isen.mjs` (cecek, sawut, ukel — baru), `verify.mjs`
(gerbang), plus `pnpm ornament:verify`.

**Bobot isen turun 4× lewat kerapatan sampel, bukan lewat optimasi setelahnya.** Pack kayon
menyampel spiral dengan langkah sudut tetap (`total / 0.07`), jadi curl isen sekecil r0 = 30
disampel serapat sulur utama r0 = 120 — dan karena isen dipasang belasan kali per glyph, di
situlah berkas 44 KB itu lahir. Diganti dengan kerapatan mengikuti **panjang busur**, tiap
segmen selalu ±9 satuan viewBox berapa pun ukuran curl-nya. Ditambah presisi 2 → 1 desimal
(0,03% lebar pada viewBox 300–600; tidak terlihat mata). Terukur pada bidang uji berisi 18
keping: **39.011 → 9.383 karakter**, dari 2.166 jadi 521 karakter per keping.

**Metrik kelengkungan versi pertama salah, dan kesalahannya mendasar.** Ia menghitung huruf
`C`/`S`/`Q` — mengikuti angka audit "31% tanpa kurva Bézier". Diperiksa pada sumbernya:
`bingkai-kayon.svg`, ornamen **paling kaya di seluruh repo**, punya **nol perintah kurva dan
3.341 perintah garis**, karena ia poligon hasil sampling rantai kubik. Gerbang yang
menghitung huruf akan menghukumnya sebagai primitif — dan memblokir seluruh keluaran mesin
yang baru saja dibangun, yang memakai teknik yang sama.

Diganti dengan **bukti kelengkungan bentuk**: banyak titik dengan belokan kecil. Kotak 4
titik belok 90° ditolak; kurva tersampel puluhan titik belok di bawah 25° diterima; gigi
gergaji 40 titik tetap ditolak, karena penjaga belokan berlaku berapa pun banyak titiknya.

Cacat kedua ketahuan hanya karena metriknya **diuji pada bentuk yang sudah diketahui
jawabannya**, bukan sekadar dijalankan pada bank: `ukelBertangkai` — primitif terpenting di
seluruh kosakata — dinilai **nol**. Ia memancarkan dua sub-path dalam satu `d` (pita batang
lalu spiralnya), dan dibaca sebagai satu deret titik, lompatan antar sub-path merusak rata-rata
belokannya. Sekarang tiap sub-path dinilai sendiri. Sembilan kasus uji jadi tes tetap.

**Garis dasar: 119 dari 132 glyph (90%) gagal gerbang.**

| Gerbang | Gagal |
|---|---|
| `data-draw` — tidak ada lapisan garis sama sekali | 85 |
| `kurva` — bentuknya bersudut, bukan digambar | 69 |
| `isen` — elemen di bawah minimum kategorinya | 62 |
| `stroke` — ketebalan di luar 2,5–4 | 4 |
| `bidang-nilai` — hanya satu tingkat opacity | 1 |

Angka `data-draw` **persis sama** dengan audit (85), dan gerbang keunikan menemukan sendiri
**`divider-row` ↔ `divider-lung-lungan` pada frac 1,0** — pelanggaran terparah yang ditemukan
audit lewat metode yang sama sekali berbeda. Dua metode independen sepakat. Kesembilan tema
gagal gerbang kohesi.

**Gerbangnya ratchet, bukan merah-hari-ini.** Menjadikannya merah sekarang berarti suite
selalu merah sampai seluruh 132 ornamen digubah — dan berhenti menjaga apa pun di antaranya.
`ornament-quality.baseline.json` mencatat kegagalan yang ada; tes gagal kalau muncul kegagalan
**baru**, dan juga gagal kalau ada entri garis dasar yang **ternyata sudah lulus tapi masih
tercantum**. Syarat kedua yang membuat berkas itu tidak pernah berbohong: tiap ornamen yang
diperbaiki memaksa garis dasarnya ikut mengecil di commit yang sama.

Kedua arah dibuktikan, bukan diasumsikan: membuang lapisan garis `divider-leaf` (salah satu
dari 13 yang lulus) → merah di "kegagalan baru"; menambahkan lapisan garis ke `frame-gonjong`
(yang tercatat gagal) → merah di "garis dasar menyimpan yang sudah lulus". Keduanya dipulihkan
dan pohon kerja bersih.

Verifikasi: 346 tes unit hijau, lint bersih, typecheck lolos.

**Fase 40 selesai 2026-09-18.** Delapan keluarga motif ditelusuri ke sumbernya,
`CULTURE-BANK.md` ditulis (URL + tanggal periksa + klaim yang ditopang + ketidakpastiannya),
dan sembilan komponen dibersihkan. Empat temuan mengubah pekerjaan menggambarnya.

**Kawung dan parang adalah motif larangan Keraton Yogyakarta** — dan sumbernya primer:
situs resmi keraton. Dasarnya *Pranatan Dalem Bab Jenenge Panganggo Keprabon* (1927); parang
dicanangkan lebih dulu, **1785 oleh Sri Sultan Hamengku Buwono I**, motif larangan pertama.
Kawung untuk Sentana Dalem. Tapi kalimat penentunya ada di sumber yang sama: aturan itu
*"masih berlaku hingga sekarang, namun hanya diterapkan secara terbatas di lingkungan Keraton
Yogyakarta, tidak untuk masyarakat umum di luar keraton."* Jadi kawung **boleh dipakai sebagai
bentuk**; yang tidak boleh adalah mengaitkannya ke keraton atau kebangsawanan di salinan
pemasaran — justru karena kaitan itu nyata. Parang tetap tidak dipakai dan memang belum pernah
ada di bank.

**Jumlah gonjong menandai kedudukan, dan yang digambar salah.** Rumah bergonjong
terdokumentasi berjumlah **empat atau enam**: dua untuk warga biasa, empat untuk seorang
Datuak, enam untuk koordinator para datuak. `FrameGonjong.vue` menggambar **tiga** — tidak ada
dalam himpunan itu. Karena jumlahnya bermakna, tiga bukan sekadar tidak akurat; ia menyatakan
sesuatu yang tidak ada. Digubah jadi empat di fase 41.

**Pucuak rabuang dipakai di luar perannya.** Pada rumah gadang motif ini mengisi bidang-bidang
**kecil di atas ukiran besar**, pada les plank dan bingkai ukiran. Kita memakainya sebagai
sudut tunggal berukuran besar. Dipindahkan jadi isen tepi.

**Poleng perlu keputusan pemilik, dan usulannya konservatif.** Saput poleng punya tiga varian
(rwa bhineda hitam-putih, sudhamala, tridatu) dan dililitkan pada pelinggih, pohon tertentu,
serta arca dwarapala — menandai tempat yang dianggap berenergi besar. Komentar lama
`MotifPoleng.vue` menyebut kaitan itu, dan kaitannya **benar**; justru itu masalahnya, karena
ornamen hias undangan bukan kain itu. Usulan: papan caturnya tetap dipakai sebagai bidang
geometris, **namanya dilepas**, dan tidak ada klaim rwa bhineda atau pelindung di mana pun.

Yang ikut terverifikasi **benar**: komentar `FrameBentar.vue` (*"celah di puncak itu bukan
kekurangan bentuk"*) ternyata tepat — sumber menyatakan kedua sisi terpisah sempurna tanpa
atap penghubung, hanya bertemu di bawah lewat anak tangga, dan itu yang membedakannya dari
kori agung. Konsekuensinya jadi mengikat: tidak boleh ada apa pun yang menyeberangi celah
puncak. Asalnya Majapahit abad 14–15, **bukan tradisi Sunda**.

**Penjaga klaim ditambahkan, dan ia langsung menemukan pelanggaran yang terlewat.** Tes
memindai komentar tiap komponen: kalimat yang memakai kata pengklaim (*tertua, hampir semua,
melambangkan, lambang, bermakna, dipercaya, sakral, upacara, ritual*) wajib membawa penanda
sumber di komentar yang sama. Saat dibuktikan dengan menyuntik klaim palsu ke `SymbolLotus`,
ia ikut memerahkan **`LayerBloomBentar.vue`** — *"diapit dua payung upacara"*, pelanggaran asli
yang tidak ada di daftar manual saya. Delapan komponen yang saya identifikasi sendiri jadi
sembilan.

Catatan tentang jejaknya: `docs/` di-gitignore, jadi `CULTURE-BANK.md` hanya hidup di mesin
ini. Tapi fakta bersumber yang paling menentukan — tanggal periksa, jumlah gonjong, status
larangan, aturan celah bentar — ikut ditulis ke **komentar komponennya**, yang terlacak git.
Yang hilang kalau mesin ini hilang adalah rujukan lengkapnya, bukan aturan bentuknya.

Verifikasi: 480 tes unit hijau, lint bersih, typecheck lolos. Garis dasar mutu tidak bergeser —
fase ini memang tidak menyentuh satu koordinat pun.

**Fase 41 berjalan — 13 bingkai selesai 2026-09-18, dan empat bug ditemukan dengan melihat,
bukan dengan mengukur.**

Hasil terukur pada 13 bingkai:

| | lama | baru |
|---|---|---|
| Kelengkungan rata-rata | 9 dari 13 di bawah ambang | **162** |
| Kepadatan isen (sub-path) | ~4 | **35** |
| Punya lapisan garis | 3 dari 13 | **13 dari 13** |
| Lolos gerbang | 0 dari 13 | **13 dari 13** |

Total kegagalan bank 119 → 107, dan pelanggaran keunikan 2 → 1: `frame-mendung` ↔
`frame-kenanga` terselesaikan sendiri oleh penggubahan, tanpa diincar.

**Empat kesalahan saya, dan tiga di antaranya lolos dari seluruh delapan gerbang.**

*Pertama, dan yang paling memalukan:* isen ditimpakan di atas band, bukan dilubangi darinya.
Delapan belas keping ada di berkas, di koordinat yang benar, dan **tidak satu pun terlihat**.
Aturannya sudah tercatat di pack melati jauh sebelumnya — *"massa berwarna sama di atas massa
tidak pernah terlihat"* — dan saya sendiri baru saja menyalinnya ke komentar mesin ini.

*Kedua:* `offsetInward` meledak karena rantai kubik boleh punya titik kontrol berimpit;
`sampleCubics` menyalinnya jadi rusuk nol-panjang, normalnya tak terdefinisi, dan titik
hasilnya melompat.

*Ketiga:* `translateD` hanya menggeser perintah `M` dan `L`. `cakram()` seluruhnya perintah
`C`, jadi titik awalnya pindah sementara semua titik kontrol kurvanya tertinggal di titik
asal — tiap "titik cecek" jadi sapuan raksasa dari pojok. Yang membuatnya sulit dilihat:
`ukel` memakai `poly()` yang hanya `M`/`L`, jadi bingkai ber-ukel tampak baik-baik saja dan
masalahnya terbaca seperti cacat siluet, bukan cacat penggeser. Ditemukan dengan mematikan
grup satu per satu di layar.

*Keempat, dan ini soal gerbangnya sendiri:* metrik `isen` menghitung elemen, padahal isen
yang dilubangi hidup sebagai sub-path di dalam satu `<path>` ber-`evenodd`. Dihitung per
elemen, bingkai yang paling padat terbaca paling kosong — gerbangnya akan menghukum persis
pekerjaan yang ia ada untuk mendorong. Ini kesalahan sekeluarga dengan metrik huruf kurva di
fase 39: **dua kali mengukur bentuk lewat cara penulisannya, bukan lewat bentuknya.**

**Pelajaran yang layak dicatat: delapan gerbang meloloskan tujuh bingkai yang jelas rusak di
layar.** Gerbang mengukur kepadatan, kelengkungan, bobot, dan keunikan; tidak satu pun bisa
melihat poligon yang memotong dirinya sendiri. Gerbang itu perlu, tapi tidak pernah cukup —
tiap kategori tetap wajib dilihat sebelum dinyatakan selesai.

**Barel per-tema dimajukan dari fase 44 ke sini**, karena plafon bobot 10240 byte ternyata
angka yang dikarang di fase 39 sebelum ada ornamen terisi untuk diukur; ornamen berukir
sungguhan berharga 9–13 KB. Menekan ornamennya agar muat adalah membuatnya miskin demi angka
tanpa dasar — yaitu keluhan yang sedang diperbaiki.

`Glyph.vue` diubah dari `import.meta.glob` eager jadi malas. Kekhawatiran yang tertulis di
komentar lamanya — "ikut ter-render di server" — diuji dan **tidak terbukti**: Nuxt membungkus
halaman dengan `<Suspense>`, jadi komponen async tetap diselesaikan saat SSR. Diukur pada dua
build produksi, halaman undangan yang sama, render identik 168 path ornamen, nol peringatan
hidrasi:

| | chunk | JS diunduh satu tamu |
|---|---|---|
| eager | 43 | **956 KB** |
| malas | 61 | **758 KB** |

Selisih 198 KB (−21%) hari ini, dan akan melebar tiap ornamen digubah — yang eager membengkak
untuk semua orang, yang malas hanya untuk yang memakainya. Plafon dinaikkan ke 16 KB dengan
alasan terukur itu.

**Poleng dilepas namanya** sesuai keputusan di fase 40: `motif-poleng` → `motif-catur`,
`corner-poleng` → `corner-catur`, tekstur `poleng.svg` → `catur.svg`. Aman karena tidak satu
pun `venue`/`attire` bernama poleng, jadi tidak ada dokumen undangan yang menyimpan id itu —
diperiksa sebelum diganti. Ratchet menolak penggantian itu sebagai "kegagalan baru" sekaligus
"entri usang", persis seperti seharusnya; kuncinya diganti nama di garis dasar, bukan
dibangkitkan ulang seluruhnya.

Verifikasi: 480 tes unit hijau, lint bersih, typecheck lolos.

Fase 39–40 tidak mengubah satu piksel pun. Perubahan yang dilihat tamu dimulai fase 41.

---

**Fase 42–47 selesai 2026-09-18. Empat puluh enam ornamen digubah, dan gerbang pertama yang
bisa melihat langsung membatalkan klaim "selesai" fase 41.**

Hasil terukur pada seluruh bank:

| | sebelum | sesudah |
|---|---|---|
| Glyph gagal gerbang | 119 | **66** |
| Pelanggaran keunikan | 4 | **0** |
| Tema tidak kohesif | 9 | **0** |
| frame · divider · corner · motif · symbol · seal | gagal hampir semua | **0 dari 59** |

Enam puluh enam yang tersisa seluruhnya di kategori yang memang di luar cakupan: `layer` (43),
`venue` (8), `floral` (7), `attire` (5), `monogram` (3).

**Gerbang `potong-diri` menemukan sepuluh dari tiga belas bingkai yang fase 41 nyatakan selesai
masih memotong dirinya sendiri** — 24 sub-path, semuanya keluaran `offsetInward`, yang komentarnya
sendiri sudah mengakui *"offset poligon yang benar-benar tahan perlu kliping self-intersection."*
Sekarang ada (`buangLoop`), dan angkanya 24 → 0. Gerbang kedua menemukan `frame-rounded` dengan
rusuk terpanjang **418,9×** rusuk tengahnya: ruas lurusnya ditulis sebagai kubik berdegenerasi
`[a, b, b, b]`, yang benar bentuknya tapi sampelnya menumpuk di ujung. Di layar tidak ada yang
salah — yang rusak adalah apa yang dibangun di atasnya. Maksimum bank sekarang 6,7.

**Ramp warna, dan keluhan pemiliknya terbukti pada angkanya sendiri:** 283 `fill="currentColor"`,
60 `stroke`, nol hex di 133 komponen, dan 128 dari 133 glyph hanya punya dua tingkat opacity.
Yang meratakannya bisa ditunjuk barisnya — `imported/lib/convert.mjs:139-163` memetakan tiap warna
sumber ke satu tinta lewat luminance WCAG, dan menyatakannya sebagai tujuan. Empat stop sekarang
diturunkan dari token tema, dipancarkan sebagai hex supaya bisa diperiksa di Node, dan diuji pada
**27 ramp** (9 terang + 18 gelap): terburuk 1,54:1 terhadap latar dan 1,16:1 antar stop bertetangga.

Yang membuat warnanya berarti bukan variabelnya melainkan susunannya: **plat aksen di bawah, badan
diperkecil sedikit supaya platnya menyembul sebagai tepi, rongga isen `evenodd` menembus badan.**
Emas terbaca lewat tiap ukiran tanpa satu bentuk baru digambar — mekanismenya sudah ada sejak fase
41, yang kurang cuma platnya.

**Dua perbaikan bentuk yang diminta, dan keduanya punya sebab yang bisa ditunjuk:**

*Siluet bentar* terbaca sebagai dua lempeng miring karena tepi luarnya memang satu sapuan kubik
mulus dari x≈115 di puncak ke x=0 di alas. Sapuan mulus dari sempit ke lebar **adalah** lempeng
miring. Diganti profil berundak sungguhan (kaki–badan–kepala, enam belas sudut), difilet supaya
lolos `buktiLengkung` dengan jujur alih-alih didaftarkan sebagai pengecualian `rectilinear`.

*Titik cecek* tersebar acak karena `cecekTepi` melangkah dengan **indeks titik**, bukan panjang
busur — dan poligon sumbernya disampel dengan cacah tetap per segmen kubik, jadi indeks tidak ada
hubungannya dengan jarak. Terukur pada siluet yang sama, 24 butir: sebaran jarak **CV 61% → 4%**,
rentang 12,5–69,4 → 29,4–34,7. Iramanya sekarang datang dari `rapport`, yang sudah ada di tiap tema
sejak fase 39 dan **tidak pernah dibaca satu pun keluarga isen**.

**Keunikan hampir hilang karena saya sendiri, dan gerbangnya yang menahan.** Sudut dan pemisah versi
pertama dibangun dari persegi panjang dan cakram generik dengan satu unit khas tema di tengahnya —
pelanggaran melonjak **1 → 144**. Sebabnya mendasar: sidik jarinya tahan geser **dan tahan skala**,
jadi persegi panjang selalu cocok dengan persegi panjang berapa pun ukurannya. Membuat band lebih
tebal per tema tidak akan pernah menolong; yang harus berbeda bentuknya. Setelah siluet, band, rel,
dan isen semuanya diturunkan dari `profilTema`, dan tiap pertumbuhan diberi kuncup `unitTema` di
pangkalnya: **0**.

**Pelajaran fase 41 terbukti lagi, dua kali, dan sekarang jadi aturan tetap di `DESIGN.md`.**
Sembilan gerbang meloloskan dua hal yang jelas salah di layar: pemisah yang bandnya terjepit jadi
deretan oval saling tindih (band selebar 6 yang bergelombang pada pita setinggi 40 tidak muat), dan
`symbol-candle` yang kartusnya memikul lebih banyak luas daripada lilinnya sendiri — lilin yang
berdiri di atas kerucut emas raksasa. Keduanya ditemukan dengan membuka lembar kontak.

Dan gerbangnya sendiri salah sekali, dengan cara yang sudah dikenal: `massa-tertimbun` versi pertama
memutuskan lewat kotak pembatas, lalu menuduh empat ornamen yang baik-baik saja — manik yang duduk
di SAMPING tangkai punya kotak yang masih di dalam kotak tangkainya. Ini kesalahan ketiga dari
keluarga yang sama (huruf kurva fase 39, hitung elemen fase 41): **mengukur dengan besaran yang
mudah dihitung, bukan dengan besaran yang ditanyakan.** Sekarang kotak hanya saringan; yang
memutuskan uji titik-dalam-poligon. Ia tetap berguna — ia menemukan kuncup yang tenggelam di dalam
batangnya sendiri di sembilan segel.

Plafon bobot dinaikkan tiga kali, tiap kali dengan angka lebih dulu: `frame` 20 KB (bingkai berundak
punya band di kedua paruhnya; kerapatan cecek dipotong 28 → 20 butir lebih dulu), `divider`/`corner`/
`motif`/`seal` 10 KB (plafon `lain` 8192 ditetapkan fase 39 ketika sebuah pemisah benar-benar dua
path dan empat elemen — yaitu keadaan yang jadi keluhan).

Kartu tema di landing dan `/order` ikut diperbaiki: keduanya memasang `--iv-primary` dengan tangan,
jadi tanpa `rampStyle()` pratinjaunya tetap satu warna — pasangan akan memilih tema dari kartu yang
tidak menunjukkan warnanya.

Verifikasi: **556 tes unit hijau** (480 → 556; 59 tes ramp warna, 17 tes gerbang geometris), lint
bersih, typecheck lolos, `pnpm ornament:verify` 0 keunikan dan 0 kohesi. Lembar kontak dibuka pada
1440px, dua bidang, tiap kategori dilihat. Ramp terbukti sampai ke DOM aplikasi sungguhan
(`#79321e / #A93F23 / #7A8B6F / #b4bba8` pada `aruna-bloom`).

**Yang belum dikerjakan dan sengaja dicatat:** halaman undangan `/i/[slug]` tidak ikut dibuka karena
ia butuh pasangan API+DB yang hidup; yang diperiksa di browser adalah lembar kontak (komponen
ter-commit yang sungguhan, ramp yang sungguhan) dan kartu tema landing. Kategori `layer` (45 keping,
yang paling sering dilihat tamu saat menggulir), `venue`, `floral`, `attire`, dan `monogram` masih
satu tinta — mereka tetap bekerja lewat cadangan `currentColor`, tapi belum ikut ramp.

---

**Fase 42–47 — ornamen berwarna, gerbang yang bisa melihat, dan 46 sisanya.**
Ditulis 2026-09-18, **sebelum satu berkas pun disentuh**. Lahir dari dua keluhan pemilik
setelah melihat hasil fase 41.

**Keluhan pertama: bank ini satu warna, dan pemiliknya benar.** Diukur pada 133 komponen:
283 `fill="currentColor"`, 60 `stroke="currentColor"`, **nol** hex, nol gradient, nol pattern,
nol filter. Kedalaman dipalsukan sepenuhnya dengan `opacity` — 128 dari 133 glyph hanya punya
dua tingkat (1 dan 0,45). Sementara pack Canva yang diimpor pemilik sendiri punya ramp warna
sungguhan: `canva-emas-hitam` `#423d35 → #8c8153 → #ccb554 → #dbcd93`,
`canva-putih-cokelat` lima warna, `canva-rumah-jawa-barat` enam belas.

Yang meratakannya bisa ditunjuk barisnya: `imported/lib/convert.mjs:139-163` memetakan tiap
warna sumber ke satu tinta lewat luminance WCAG, dan header modulnya menyatakannya sebagai
tujuan — *"`fill` berwarna → `currentColor` dengan `opacity` per bidang nilai (ornamen
monokrom)"*. Jadi ini bukan kelalaian; ini keputusan yang ternyata salah, diambil sebelum ada
yang melihat hasilnya berdampingan.

`--iv-accent` (emas di lima tema: `#BE9440` gonjong, `#B08A3C` bentar, `#B8842B` mendung)
sudah dipancarkan `themeStyle()` sejak lama, dan **tidak satu pun ornamen pernah membacanya.**
Hanya dua tempat memakainya: topeng backdrop `Section.vue:95` dan pita `Segue.vue:58`.

**Keluhan kedua: dua cacat bentuk yang masih terlihat.** Siluet `FrameBentar` terbaca sebagai
dua lempeng miring alih-alih menara cermin bertingkat, dan titik cecek terasa tersebar acak
alih-alih berirama. Keduanya punya penyebab yang bisa ditunjuk, bukan selera — lihat fase 44.

**Dan satu hal yang tidak dikeluhkan siapa pun tapi harus lebih dulu: gerbangnya buta.**
Pelajaran fase 41 dicatat apa adanya — delapan gerbang meloloskan tujuh bingkai yang jelas
rusak di layar. Tiga dari empat bug itu punya tanda geometris yang **bisa** diukur; tidak ada
yang mengukurnya. Menulis 46 resep lebih dulu berarti mengulang kesalahan yang sama 46 kali
alih-alih 13, jadi urutannya gerbang dulu.

Tiga keputusan pemilik yang mengunci rencana ini: ramp empat tingkat **diturunkan** dari token
tema (bukan hex tulisan tangan per tema, yang akan membuat ornamen berhenti mengikuti warna
pilihan pasangan); aset Canva **tetap di luar bank** — yang diambil paletnya dan cara
berlapisnya, bukan berkasnya, jadi pertanyaan lisensi 34 SVG impor tidak ikut dibuka; dan
gerbang penglihat dibangun sebelum ornamennya, bukan sesudah.

**Fase 42 — gerbang yang bisa melihat.** Empat bug fase 41 dipakai sebagai spesifikasi:
`potong-diri` (poligon memotong dirinya sendiri — yang merusak tujuh bingkai lewat
`offsetInward` di lembah gonjong), `luar-kotak` (titik jauh di luar viewBox — yang dibuat bug
`translateD`), `subpath-degenerate`, dan `massa-tertimbun` (massa sewarna di atas massa, yang
membuat delapan belas keping ada di berkas tanpa satu pun terlihat). Tiap gerbang diuji pada
bentuk yang **sudah diketahui jawabannya**, bukan sekadar dijalankan pada bank — metrik yang
dipercaya karena angkanya terlihat masuk akal sudah salah dua kali.

Plus **lembar kontak** `pnpm ornament:sheet`: satu HTML berisi seluruh bank, tiap glyph pada
tiga ukuran, dua latar, dikelompokkan per tema sehingga sebelas glyph satu tema akhirnya
terlihat bersebelahan. Dan aturannya ditulis ke `DESIGN.md`, bukan cuma ke sini: **tidak ada
kategori yang boleh dinyatakan selesai sebelum lembar kontaknya dibuka dan dilihat.** Gerbang
mengukur apa yang sudah diketahui cara mengukurnya; ia tidak pernah tahu bentuk rusak yang
belum pernah terjadi.

**Fase 43 — ramp warna.** Empat stop diturunkan dari token yang sudah ada:
`deep` = campur(primary 64%, foreground 36%), `body` = primary, `accent` = accent tema,
`glow` = campur(accent 55%, background 45%). Bentuk rampnya mengikuti `canva-emas-hitam`
(gelap netral → medium → aksen terang → pucat), bukan dikarang. Dihitung di TypeScript dan
dipancarkan sebagai hex, bukan sebagai string `color-mix()` — supaya gerbang kontras bisa
memeriksa nilai yang sebenarnya, karena Node tidak bisa mengevaluasi `color-mix`.

Aturan bentuk yang menyertainya, dan ini yang membuat warnanya berarti: rongga isen `evenodd`
menembus band, jadi plat aksen **di bawah** band membuat emasnya muncul lewat tiap ukiran.
Itu persis cara gunungan Canva bekerja, dan mesinnya sudah punya seluruh mekanismenya sejak
fase 41. Fallback `currentColor` wajib di tiap `var()`, supaya 133 glyph lama dan tiap
penempatan yang sudah ada terus bekerja tanpa disentuh.

**Fase 44 — 13 bingkai digubah ulang**, karena merekalah satu-satunya kategori yang sudah
pernah lolos gerbang, jadi merekalah bukti bahwa ramp dan gerbang baru bekerja sebelum 46
ornamen menumpang di atasnya. Termasuk dua perbaikan yang diminta: siluet bentar jadi profil
bertingkat sungguhan (kaki–badan–kepala dengan pelipit menjorok), dan cecek berjalan dengan
**panjang busur** alih-alih indeks titik, dengan irama dari `rapport` yang selama ini ada di
`resep/tema.mjs` dan tidak pernah dibaca isen mana pun.

**Fase 45–47 — 46 sisanya**: divider 9 + corner 10, motif 9 + symbol 9, seal 9. Satu resep per
kategori, semuanya membaca `paramUntuk(id)` yang sama. Motif mendapat satu perubahan
struktural: ia adalah **rapport kain**, jadi unitnya berulang persis `rapport` kali dan tepi
kirinya wajib sama dengan tepi kanannya. Itu yang membedakan motif dari deretan bentuk — dan
itu jawaban untuk `motif-geometric` yang secara harfiah 13 `<rect>` bertinggi selang-seling.


---

Fase 33–38 mendarat tanpa mengubah apa pun yang dilihat tamu.

**Di luar cakupan, dan alasannya:** aset raster (2 Sunda, 24 Canva) butuh perluasan renderer
eksplisit; 34 SVG impor Canva lisensinya belum diputuskan; ~42 aset kurasi yang tidak terpilih
tetap jadi cadangan template keempat; `Observer` untuk galeri berhentak **ditolak, bukan
ditunda** — membajak scroll tamu yang membuka undangan di ponsel adalah cara tercepat membuat
orang menutup tab.

---

**Fase 32 — membaca satu desain Canva dari dalam, dan menggambar packnya.**
**Ditulis setelah dikerjakan, dan itu melanggar aturan urutan di bawah.** Dicatat apa adanya,
bukan dirapikan: pemilik mengirim tautan desain dan meminta ornamennya dianalisis dan dibuat
dalam satu permintaan, dan entri ini menyusul. Preseden yang sama sudah ada di fase 12.

**Apa yang baru mungkin.** Fase 30 berhenti karena Canva MCP belum terpasang; seluruh
pengukurannya berasal dari preview publik dan `get-design-content`/`export-design` tidak
pernah dipanggil. Sekarang MCP terpasang dan desainnya milik akun, jadi tiga pintu yang dulu
tertutup dicoba: teks, struktur elemen, dan ekspor resolusi penuh.

**Dua terbuka, satu tetap tertutup.** `get-design-content` mengembalikan teksnya.
`export-design` mengembalikan MP4 1080×1920 32,23 detik tanpa watermark. Tapi
`start-editing-transaction` melaporkan `richtexts: []`, `fills: []`, dan halaman satu-satunya
`is_empty: true` — struktur elemen **tidak terbaca**, jadi **font tetap tidak teridentifikasi**
dan warna tetap warna piksel, bukan nilai isian. Rinciannya di
`sources/canva-cokelat-krem/LIMITS.md`.

**Yang terukur, dan yang berbeda dari fase 31.** Klipnya **87,3% diam**: sembilan letupan
gerak, lima potongan adegan, jarak antar-gestur 3,2–5,3 detik. Delapan dari sembilan segmen
berkurva **lonceng** (`sine.inOut`/`power1.inOut`, centroid 0,48–0,56), bukan kurva *out*
seperti lima dari sembilan klip fase 31 — dan perbedaannya bisa dijelaskan: di sana yang
diukur reveal ornamen ke bingkai diam, di sini perpindahan seluruh adegan. Peta zonanya
memberi angka yang langsung dipakai: densitas baris bawah 1,09–1,29 vs baris atas 0,70–0,92,
jadi keping bermassa bertumpu di tepi bawah.

**Yang dikerjakan:** arsip riset `sources/canva-cokelat-krem/` (MOTION/WARNA/BENTUK/LIMITS,
`motion/analyze.mjs` versi kisi-gray-langsung), dan pack original `originals/kayon/` — 39 glyph
SVG dan 3 ubin tekstur, seluruhnya parametrik lewat `geometry.mjs`, kesembilan keluarga glyph
`DESIGN.md` terisi. Plus `THEME.md`: usulan tema `aruna-kayon` dengan palet yang keempat
pasangan kontrasnya sudah diverifikasi (14,00 · 6,23 · 5,45 · 6,14).

**Yang sengaja tidak dikerjakan:** pemasangan ke aplikasi. Tidak ada berkas di `apps/` yang
disentuh; enam prasyaratnya didaftar di `originals/kayon/THEME.md`, dan yang pertama —
pasangan font — diblokir oleh struktur elemen yang tidak terbaca.

**Fase 31 — mengukur bentuk gerak, lalu menggambar sebanyak mungkin ornamen yang menirunya.**
Ditulis 2026-09-17, **sebelum satu berkas pun disentuh**, melanjutkan fase 30 yang berhenti tepat
sebelum bagian menggambarnya. Lahir dari permintaan pemilik: analisis motion diperdalam, lalu
ornamen dibuat sebanyak mungkin dengan kemiripan setinggi mungkin.

**Apa yang belum dijawab fase 30, dan kenapa itu yang dikerjakan lebih dulu.** `MOTION.md` mengukur
*kapan* tiap klip bergerak — jendela gerak, rasio diam, periode loop. Ia menolak menyebut nama
easing, dengan alasan yang benar: luma `tblend=difference` mengukur laju perubahan piksel, bukan
kurva perpindahan. Tapi laju adalah **turunan** dari kemajuan. Integral kumulatifnya, dinormalkan,
adalah kurva kemajuan 0→1 — dan kurva itu bisa dicocokkan ke kandidat easing dengan residual yang
bisa dilaporkan. Yang dijanjikan di sini bukan "Canva memakai `power2.out`", melainkan "kurva
kemajuan terukurnya paling dekat ke `power2.out`, residual RMS sekian, kandidat kedua sekian" —
sebuah pernyataan yang bisa dibantah karena angkanya ada.

Yang kedua yang tidak dimiliki fase 30: **di mana** gerak itu terjadi. Diff satu-angka-per-frame
meratakan seluruh bingkai. Membaginya jadi kisi dan mengukur tiap sel memberi peta ruang-waktu:
apakah sudut bergerak lebih dulu dari tengah, apakah teks bergerak sama sekali, berapa jeda antara
keduanya. Itu persis angka yang dibutuhkan `orchestrate()` untuk stagger, dan selama ini ditebak.

**Yang dikerjakan:** `motion/analyze.mjs` di dalam arsip riset (fitting easing + peta kisi + deteksi
adegan), hasilnya ke `MOTION-DALAM.md`, lalu satu pack original baru — **sebesar yang bisa
dipertanggungjawabkan**, bukan sebanyak yang bisa ditempel — yang memakai angka itu sebagai resep
motionnya. Target: tiap keluarga glyph `DESIGN.md` (`frame`, `divider`, `corner`, `floral`,
`monogram`, `motif`, `symbol`, `layer`, `seal`) terisi, dengan `catalog.json` v1, `CULTURE.md`,
demo offline, dan verifikasi 360/768/1440 + reduced-motion + tanpa-JS.

**"Semirip mungkin" diterjemahkan, bukan dituruti apa adanya.** Referensinya milik orang lain dan
lisensinya tidak mengizinkan bentuknya dipanen; `AGENTS.md` sudah mengunci itu dan fase 30
mengulanginya. Yang ditiru karena itu adalah hal yang memang bisa diukur dan memang bukan milik
siapa-siapa: **rasio tinta**, **kerapatan komposisi**, **berat garis relatif terhadap bidang**, dan
**bentuk kurva gerak**. Yang tidak ditiru: bentuk bunga tertentu, susunan sulur tertentu, dan
tipografi. Tiap glyph digambar dari nol dengan geometri sendiri, dan itu yang diperiksa
`validate.mjs`.

**Yang sengaja tidak dikerjakan.** Pack ini tetap tidak dipasang sebagai tema aplikasi — alasannya
sama dengan fase 30, dan tidak berubah hanya karena packnya sekarang lebih besar. `useArunaMotion.ts`
tidak disentuh; resep motion hasil pengukuran hidup di demo pack dulu.

**Hasilnya, 2026-09-17.** Sembilan klip diukur ulang dengan `sources/canva/motion/analyze.mjs`;
laporannya `MOTION-DALAM.md`, angka mentahnya `motion/measurements.json`.

**Yang pertama ketahuan adalah kesalahan fase 30 sendiri.** Jendela gerak di sana dicari sebagai
rentang di atas ambang *di sekitar puncak* — dan puncak sebuah klip beradegan banyak selalu berada
tepat di potongan adegannya, karena cut mengubah hampir seluruh piksel dalam satu frame. Klip ungu
karena itu tercatat "jendela 1% durasi", dan yang terukur di sana sebenarnya pergantian gambar,
bukan gerakan. Dengan frame-cut ditandai dan dibuang, klip yang sama terbaca punya **tujuh segmen
gerak dan lima belas cut**.

**Lima dari sembilan paling dekat ke `power1.out`**, dan tidak satu pun ke `power2.out`/`power3.out`/
`expo.out`/`circ.out` — pada klip paling tajam di set ini residual `power2.out` hampir dua kali
`power1.out` (0,0703 vs 0,0379). Resep reveal di skill menyebut `power2.out`; angkanya mengusulkan
yang lebih landai. Tiga sisanya berkurva lonceng (`power1.inOut`/`sine.inOut`, tak terbedakan oleh
metode ini), dan ketiganya gestur tunggal panjang.

**"Ornamen bergerak, teks diam" akhirnya punya angka — setelah pembacaan pertamanya dibatalkan.**
Empat zona sudut memegang 51,8% energi gerak, yang terdengar seperti bukti; tapi keempatnya juga
53,6% luas bingkai, jadi itu bukan apa-apa. Setelah dinormalkan terhadap luas, densitas sudut 0,97
dan **densitas pusat 1,18** — rata-rata, pusat bingkai justru sedikit lebih bergerak. Yang benar-benar
ada di data adalah dua keluarga: klip berlayout tetap (botanical **0,00**, whatsapp 0,55) dan klip
beradegan ganti (ungu 2,21, floral 2,06). Aturan Aruna ada di keluarga pertama, dan ada klip yang
mencatat **nol** di zona teksnya.

**Stagger terukur 0,50 detik**, dua selang berturut-turut pada klip botanical (0,23 → 0,73 → 1,23s),
dan 0,57s pada klip red-gold. Dua klip lain menjalankan seluruh zonanya dalam selisih 0,03 detik.
Tidak ada satu pun yang memakai 0,1–0,2 detik yang lazim dipakai orang. Konsekuensinya mengikat:
dengan stagger 0,5s dan durasi 0,9s, **empat keping sudah memakan 2,4 detik** — tepat di bawah
anggaran 2,5 detik. Demo pack memaksakan batas itu di kodenya (`REVEAL_BUDGET`), bukan
menyerahkannya ke kedisiplinan penulis markup.

**Pack `originals/melati/` — 45 glyph**, digambar parametrik oleh `build.mjs` dari satu kosakata
bentuk (kuncup, kelopak, pita, daun, sulur, anyaman): frame 5 · divider 6 · corner 6 · floral 6 ·
layer 6 · monogram 3 · motif 5 · symbol 4 · seal 3 · venue 1. Temanya ditentukan **setelah**
pengukuran: dua keluarga bentuk yang mendominasi referensi (untaian menjuntai dari tepi atas, daun
garis-tunggal di sudut) punya padanan Indonesia yang bukan tiruan — ronce melati dan tangkai
melati/kantil. Satuan dasarnya **kuncup**, bukan bunga mekar, karena ronce memang dirangkai dari
kuncup; sebuah untaian yang digambar dengan bunga mekar salah sejak satuannya.

**Tiga bug bentuk ditemukan hanya karena hasilnya dirender dan dilihat, bukan dibaca dari kode.**
Lingkaran yang digambar sebagai satu busur dengan titik awal dan akhir hampir berimpit itu
ill-conditioned — `monogram-cincin` keluar sebagai dua gumpalan terisi penuh, dan sekarang semua
lingkaran dibangun dari dua busur 180°. Kelopak kantil selebar 0,46 jari-jari saling menutup
sempurna sampai bunganya jadi satu massa bersudut. Dan massa berwarna sama di atas massa tidak
pernah terlihat: detail di dalam sebuah bentuk harus jadi rongga `evenodd`, bukan ditumpuk.

**Verifikasi:** `validate.mjs` 45 aset/45 varian 0 error; browser 360/768/1440 nol violation axe
(wcag2a/2aa/21aa), nol overflow, nol galat, **nol id DOM ganda dari 59 penyisipan SVG**, dan nol
SVG yang runtuh jadi tinggi nol; reduced-motion melumpuhkan tombol dan mengumumkannya; tanpa
JavaScript halaman tetap memuat 59 SVG dan 4.502 karakter teks; tween ambient **2 berjalan saat
terlihat, 0 saat tidak**. Bukti mesin di `verification/melati-browser.json`.

**Yang tidak berubah:** pack belum dipasang sebagai tema, `useArunaMotion.ts` belum disentuh, dan
`FONTS.md` masih kosong dengan alasan yang sama seperti fase 30.

**Tambahan hari yang sama: enam ekspor SVG Canva dari pemilik, diimpor apa adanya.** Pemilik
menilai hasil gambar-ulang di atas belum cukup mirip dan mengirim berkas vektor aslinya. Itu
memang mengubah pertanyaannya: yang selama fase 30–31 hanya ada sebagai frame MP4 gepeng dari
template *lain* sekarang ada sebagai path, jadi kemiripan persis berhenti jadi hal yang mustahil.

Hasilnya di `docs/features/ornament-builder/imported/canva-cokelat-krem/`, **sengaja di luar pack
melati**: seluruh klaim pack itu adalah "digambar dari nol", dan satu aset impor yang menyelinap
ke dalamnya membuat provenance 45 glyph lainnya ikut tidak bisa dipercaya. Aturan aset pihak
ketiga di `AGENTS.md` **belum dicabut**; yang berubah hanya bahwa pemilik memberikan berkasnya
sendiri. Status lisensinya — konten Canva di dalam produk yang dijual, dan elemen kontributor
pihak ketiga di dalam template — ditulis sebagai keputusan yang masih terbuka di `PROVENANCE.md`,
bukan diputuskan di sini. Tidak ada satu pun yang masuk `apps/web/public` atau `ornamentBank`.

Konverternya tidak menggambar ulang apa pun, dan itu diukur bukan diklaim: **0 piksel beda** untuk
kayon dan pita ceplok, **21–26 piksel dari ~570.000** (0,004%) untuk dua daun sulur — seluruhnya
antialias setebal satu piksel di keliling rongga — ditambah pemeriksaan yang tidak bergantung
renderer mana pun: tiap `d` yang ditulis harus muncul **apa adanya** di berkas sumbernya.

Tiga hal ketahuan hanya karena hasilnya dirender dan diperiksa:

- **`clipPath` ekspor Canva bukan sekadar kotak pembatas.** Versi pertama konverter membuangnya
  dengan alasan itu; peta beda menunjukkan ujung tangkai daun memang dipotong olehnya.
- **Daun sulur disusun sebagai siluet gelap dengan badan krem yang lebih kecil di atasnya** — yang
  terbaca sebagai garis tepi sebenarnya sisa siluet di sekelilingnya. Dalam monokrom trik itu
  runtuh jadi gumpalan pekat. Sekarang kedua `d` digabung dengan `fill-rule="evenodd"`.
- **Bunga mawarnya bukan vektor.** Tiap berkas rangkaian berisi ~9.100 path — itu daun dan
  rantingnya — plus enam `<image>` PNG base64, dan seluruh bunganya ada di dalam `<image>`.
  Dibuktikan dengan merender ulang setelah semua `<image>` dihapus: yang tersisa cuma dedaunan.
  Keduanya karena itu jadi potongan PNG/WebP ber-alpha, bukan SVG.

Demo mendapat seksi "Impor dari Canva" berbingkai putus-putus dengan peringatannya sendiri.
Verifikasi ulang setelah seksi itu masuk: 63 SVG di halaman, **0 violation axe**, 0 overflow,
0 id DOM ganda, jeda offscreen tetap 2→0.

**Lanjutan 2026-09-18: sembilan ekspor lagi, dua template baru, dan pemecahan kiri–kanan.**
Total impor jadi **16 aset dari tiga template**, dan konverternya pindah ke `imported/lib/` supaya
ketiganya memakai aturan yang sama.

**Sepasang ukiran sudut dalam satu berkas akhirnya bisa dipasang sendiri-sendiri.** Permintaan
pemilik, dan alasannya benar: satu berkas berisi keduanya memaksa keduanya ikut terpasang,
padahal di lebar ponsel sering hanya satu sudut yang muat. Yang **tidak** bisa dipakai memecahnya
adalah posisi path — kedua salinan memakai rentang koordinat yang sama persis (x 2,6–237,4), dan
yang membedakan hanya geseran grupnya. Pemecahan karena itu berbasis transform grup; konverter
menolak memecah kalau transform yang ditemuinya bukan geseran murni, supaya tidak ada `viewBox`
yang diam-diam salah. Koordinatnya tidak digeser sedikit pun — hanya jendelanya yang dirapatkan.
Hasil: 226 path per bagian, **0 piksel beda**, dua glyph rasio 1:1.

**Dua asumsi konverter yang lolos di template pertama gugur di template kedua, dan keduanya
ketahuan dari peta beda — bukan dari membaca kode.**

- **Rongga bertumpuk membatalkan dirinya sendiri di `evenodd`.** Sembilan sulur putih kayon
  bersentuhan di batang tengahnya; digabung jadi satu path evenodd, irisannya disilangi dua kali
  dan kembali terisi — batang tengah keluar sebagai garis pekat yang tidak ada di aslinya. 1,79%
  piksel meleset. Sekarang rongga yang kotak pembatasnya beririsan memakai `<mask>`; yang terpisah
  tetap `evenodd` yang lebih ringan.
- **`mask` di ekspor Canva tidak selalu no-op.** Alasan lama untuk membuangnya kebetulan benar di
  template pertama dan terbukti lewat beda 0 piksel. Di kayon wayang ia salah: mask itulah yang
  membuat sapuan lembut di tepi kanan, dan membuangnya menelan sulur di bawahnya. Sekarang seluruh
  `<defs>` disalin apa adanya. Pack cokelat-krem dibangun ulang dengan aturan itu — daunnya naik
  tipis 26→33 dan 21→23 piksel, karena sapuannya membawa mask aslinya: **lebih setia, bukan kurang**.

**Ilustrasi 15 warna diturunkan ke satu tinta lewat luminance.** Versi pertamanya keluar sebagai
siluet pekat: rumah kayu berpelitur warnanya rata-rata gelap dan semuanya jatuh di 0,6–1,0. Dengan
`gamma` 1,9 yang melebarkan paruh terang, bidang nilai yang terpakai jadi
1 · 0,875 · 0,75 · 0,5 · 0,375 · 0,25, dan atap bertingkatnya terbaca lagi.

**Satu tes yang selama ini lolos karena kebetulan.** Pemeriksa jeda-offscreen menunggu "ada anak di
`globalTimeline`" — syarat yang resolve pada tween reveal, sebelum `IntersectionObserver` sempat
melepas jeda sway. Begitu halaman jadi lebih berat ia melaporkan **0 tween berjalan** untuk halaman
yang di browser sungguhan menjalankan 2. Diperiksa langsung di panel browser sebelum dipercaya,
lalu syaratnya diperketat jadi "tween berulang yang tidak terjeda".

Verifikasi ulang: tiga pack 0 error di `validate.mjs` (6 + 7 + 3 aset); demo 69 SVG, **0 violation
axe** di 360/768/1440, 0 overflow, 0 id DOM ganda, jeda offscreen 2→0.

**Lanjutan 2026-09-18, batch ketiga: 26 ekspor lagi dari lima template.** Total impor **58 aset dari
sembilan template**. Konverter bersama tumbuh empat kemampuan — matriks affine penuh, potong raster,
renderer cadangan Chromium, dan pemisahan vektor dari bitmap dalam satu berkas — dan tiga di
antaranya lahir dari kegagalan yang terlihat di layar, bukan dari rencana.

**Pengantin Jawa dipecah, dan potongannya tidak bersih.** Permintaan pemilik menyebut karakter
pengantin ikut dipecah; dikerjakan, dan batasnya ditulis alih-alih disembunyikan. Profil alpha
sumbernya menerus dari x 134 sampai 1034 **tanpa satu pun celah** — mempelai pria merangkul lengan
mempelai wanita, ujung kain mempelai wanita lewat di belakang kaki mempelai pria. Dipotong di
x = 582, `pengantin-pria` kehilangan ujung tangan kanannya dan `pengantin-wanita` membawa serta
tangan itu. Tidak ada titik potong yang menghindari keduanya; yang ada hanya memilih di mana
irisannya jatuh. Pasangan utuhnya tetap disediakan berdampingan.

**Tiga berkas sengaja tidak dipecah, dan tiap alasannya ditulis:** kayon merah (kayon dan sulur
batiknya bertumpuk tanpa celah), bingkai ukir (kedua separuhnya menyusun satu bingkai tertutup),
wayang sepasang (tongkat dan busurnya menyilang di tengah). Memecah berguna ketika bagiannya berdiri
sendiri, bukan ketika ia separuh benda.

**Empat kegagalan alat ukur, dan tiga di antaranya sempat memberi angka yang terlihat meyakinkan.**
Glyph vektor dari berkas campuran tercatat meleset **21,5%** — yang meleset bukan path-nya melainkan
bitmap di jendela yang sama. Tiga bagian `gunungan-sayap` tercatat meleset **25%** karena jendelanya
saling beririsan; itu tidak diperbaiki dengan angka lain melainkan dengan **menolak memberi angka**.
`<g …/>` swa-tutup membuat keluaran kelebihan satu `<g>` tanpa penutup. Dan `<defs>` yang disalin
utuh menyeret **1,1 MB** base64 ke dalam glyph satu path sekaligus menyelundupkan `<image>` yang
seharusnya ditolak validator.

**Validator skill belajar satu kategori.** Dua latar gagal dengan alpha maksimum 107 dan 128: ia
**wash** semi-transparan, bukan cutout, dan memang tidak pernah pekat. Ambang "ada piksel pekat"
tetap berlaku untuk cutout; untuk aset yang menyatakan dirinya wash yang diuji hanya "ada daerah
tembus dan ada yang tergambar". Ketatnya tidak dikurangi untuk yang lain.

**Dua keputusan yang berlawanan, dan keduanya benar.** Ornamen `canva-emas-hitam` bergaris satu
warna, jadi `currentColor` justru bentuk aslinya. Ukiran `canva-putih-cokelat` adalah relief
berwarna — 1.070 dari 1.082 path memakai satu warna badan dan sisanya bayangan — jadi diturunkan ke
satu warna ia runtuh jadi siluet. Yang pertama jadi glyph, yang kedua tetap raster.

Verifikasi: sembilan pack **0 error**; 19 dari 22 glyph vektor batch ini **0 piksel beda**,
32 dari 32 lolos "koordinat utuh"; demo 93 SVG, **0 violation axe** di 360/768/1440, 0 overflow,
0 id DOM ganda, jeda offscreen 2→0.

**Fase 30 — apa yang bisa dipelajari dari Canva, dan apa yang tidak boleh diambil darinya.**
Ditulis 2026-09-17, **sebelum satu berkas pun disentuh**. Lahir dari permintaan pemilik: ia
punya Canva Pro, dan ingin motion serta template terbaik dari pencarian "Undangan Digital"
dipakai sebagai bahan belajar.

**Yang ditemukan sebelum rencananya ditulis: Canva MCP tidak bisa melakukan yang diminta.**
Daftar tool resminya di `canva.dev/docs/mcp/tools` hanya memuat `search-designs` — desain milik
akun sendiri — dan `search-brand-templates`, yang terbatas pada brand kit tim. **Tidak ada satu
pun tool yang menelusuri galeri template publik** yang muncul saat mengetik "Undangan Digital"
di canva.com. Jadi memasang MCP saja tidak akan pernah cukup, dan fase ini memakai dua jalur:
panel browser untuk menemukan dan mengkurasi, MCP untuk mengambil setelah template disalin ke
akun pemilik lewat "Use this template". Yang membuat MCP tetap berharga adalah `export-design`
ke MP4 — timing motion bisa diukur per-frame, bukan dikira-kira dari menonton.

**Batas yang tidak dinegosiasikan.** Template Canva adalah referensi, bukan sumber aset.
`AGENTS.md` sudah mengunci ini untuk aset kompetitor ("tidak pernah masuk `apps/web/public`"),
lisensi konten Canva tidak mengizinkan elemen template dicabut jadi aset berdiri sendiri di dalam
produk, dan skill ornamen menambahkan pengingatnya sendiri: tampilan mirip-Canva tidak
membuktikan provenance Canva. Setiap aset yang lahir dari fase ini digambar ulang dari nol.
Canva dipakai untuk membaca komposisi, tipografi, dan ritme motion — bukan untuk memanen bentuk.

**Yang dikerjakan:** arsip riset di `docs/features/ornament-builder/sources/canva/` dengan blob
ber-SHA-256, `FONTS.md` yang memisahkan font yang *dideklarasikan* dari yang benar-benar
*terbaca*, `MOTION.md` berisi durasi/easing/amplitudo terukur beserta yang tidak bisa dipastikan,
dan `LIMITS.md` sebagai inventaris kegagalan. Lalu satu pack original baru di `originals/<pack>/`
— temanya **ditentukan setelah riset**, dari bukti, bukan dari tebakan di muka — lengkap dengan
SVG bermassa, `catalog.json` v1, `CULTURE.md`, dan demo offline yang diverifikasi di 360/768/1440
plus reduced-motion dan no-JS.

`collect.mjs` **tidak dipakai** di fase ini. Ia menjalankan Playwright dengan sesi terpisah
sementara Canva terkunci login — persis kasus "login-protected" yang menurut skill harus
dilaporkan, bukan diakali.

**Yang sengaja tidak dikerjakan, dan alasannya.** Pack ini tidak dipasang sebagai tema ke-10.
Aturan di `DESIGN.md` melarang `frame`/`divider`/`corner`/`motif`/`symbol`/`seal` dipakai ulang
antar tema, jadi tema baru berharga enam keluarga glyph baru, bukan satu pack — itu fase sendiri.
Motion juga tetap tinggal di demo pack; `useArunaMotion.ts` tidak disentuh. Resep `sway` dari
riset belum punya padanan di aplikasi, dan memasukkannya berarti membangun mesin jeda-offscreen
(`IntersectionObserver` + `document.hidden`) yang sekarang **belum ada sama sekali** di sana —
sebuah tween berulang pertama tidak pantas menumpang di fase riset.

**Utang yang terlihat, bukan ditambal di sini: Fase 29 tidak punya entri.** Commit-nya sudah
mendarat (cookie refresh yang bentuknya kacau, cookie lama-dan-baru datang bersama, satu kalimat
menuduh cookie diblokir untuk tiga kegagalan berbeda), tapi berkas ini melompat dari 28 ke 30.
Menulisnya sekarang berarti mengarang ulang diagnosis dari pesan commit; ia ditulis di fasenya
sendiri, oleh sesi yang masih memegang buktinya.

**Yang belum terbukti:** saat baris ini ditulis, Canva MCP belum terpasang dan belum ada satu
template pun yang dibuka. Dua hal itu ada di tangan pemilik — `claude mcp add` menuntut
persetujuan OAuth di sesi interaktif, dan login Canva di panel browser diketik olehnya sendiri.
Kalau salah satunya gagal, kegagalannya dilaporkan apa adanya dan fase ini berhenti di situ.

**Fase 28 — sesi yang hidup di API tapi tidak pernah terlihat oleh halaman web.** Ditulis
2026-09-17, **setelah diagnosisnya selesai dan sebelum perbaikannya ditulis**. Lahir dari
laporan pemilik: login Google di produksi memilih akun lalu kembali ke `/login`.

**Yang sebenarnya gagal bukan OAuth-nya.** Callback berhasil tuntas — sesi dibuat, baris DB
ditulis, cookie diterbitkan. `cookieOptions()` menerbitkannya tanpa atribut `Domain`, jadi
cookie itu *host-only* di `api.arunadewa.id` dan tidak pernah terkirim ke `arunadewa.id`.
Render server Nuxt membaca sesi dari header cookie yang sampai ke host **web**
(`plugins/auth.server.ts`), jadi ia menandai pengunjung sebagai tamu, `middleware/auth`
memantulkannya ke `/login`, dan karena store sudah `loaded` browser tidak pernah bertanya lagi.

Cakupannya lebih luas dari yang dilaporkan: **setiap navigasi penuh** ke halaman ber-middleware
`auth` memantul, termasuk reload biasa di `/dashboard` setelah login kata sandi. Jalur Google
hanya korban yang paling kelihatan karena ia selalu berakhir dengan navigasi penuh; login kata
sandi lolos karena `navigateTo` berpindah di sisi klien dengan store masih di memori.

**Kenapa tidak ada satu pun tes yang bisa menangkapnya.** Di lokal web `127.0.0.1:3000` dan API
`127.0.0.1:3001` adalah host yang sama — cookie tidak peduli port. `playwright.config.ts`
mengarah ke sana juga. Dua host berbeda hanya ada di produksi, jadi aturannya ditegakkan saat
boot (`common/cookie-domain.ts`), bukan lewat e2e yang seolah membuktikannya.

**Yang dikerjakan:** `COOKIE_DOMAIN` dipakai `cookieOptions()` (penerbitan *dan* penghapusan —
cookie ber-`Domain` hanya bisa dihapus dengan atribut yang sama persis) dan ditaruh di
`compose.prod.yaml`, bukan `api.env`: nilainya bukan rahasia, dan berkas yang ikut git sampai ke
server dalam rilis yang sama dengan kode yang menuntutnya — jadi penjaga boot ini tidak bisa
mendahului nilainya seperti `GOOGLE_CLIENT_ID` di Fase 27. Callback Google dapat `try/catch`:
kesebelas cabang gagalnya dulu mendarat sebagai JSON mentah di domain API, termasuk cabang yang
paling sering dan paling tidak salah — tombol "Batal" di layar consent. Kodenya dibawa
exception-nya sendiri, bukan dicocokkan dari kalimat pesan. Tombol Google di `login.vue` dan
`register.vue` berhenti melewatkan `apiBaseForPage()` — satu-satunya jalur yang melewatkannya.

**Keputusan yang ditunda, dengan sengaja: penautan akun yang asimetris.**
`auth.service.ts:307-312` menautkan identitas Google ke akun kata sandi yang sudah terverifikasi
**tanpa konfirmasi apa pun**, sementara arah sebaliknya ditolak tegas di `registration.ts:29`
("Email ini terhubung ke akun Google"). Pengamannya saat ini hanya `profile.email_verified` —
benar dan cukup untuk Google, tidak akan cukup untuk penyedia kedua. Yang lebih tajam: akun yang
terdaftar tapi **belum pernah** verifikasi email kehilangan `passwordHash`-nya begitu Google
dipakai atas email yang sama, dan seluruh sesinya dicabut sebagai `ACCOUNT_RECLAIMED`. Fase 27
sudah mencatat cabang ini sebagai risiko; fase ini menemukannya benar-benar terjadi.

Perilakunya **tidak** diubah di fase yang sama dengan perbaikan login, dan itu disengaja:
mengubah dua hal sekaligus mengaburkan bukti bahwa `COOKIE_DOMAIN` yang memulihkan login. Fase
sendiri, dan pertanyaannya satu — apakah penautan senyap memang diinginkan (praktik umum untuk
penyedia yang menjamin `email_verified`), atau harus menjadi langkah konfirmasi. Yang tidak bisa
dibiarkan apa adanya adalah penghapusan `passwordHash` tanpa satu pun pemberitahuan ke pemilik
akun.

**Yang belum terbukti:** perbaikannya belum dirilis saat baris ini ditulis. Buktinya nanti satu
kalimat — `aruna_access` tampil dengan `Domain = .arunadewa.id` di DevTools pada
`https://arunadewa.id`, dan reload `/dashboard` tidak memantul.

---

**Fase 27 — dua hal yang hanya produksi bisa membuktikannya.** Ditulis 2026-09-17, **setelah
verifikasinya dimulai** — pelanggaran aturan urutan yang sama bentuknya dengan Fase 12, dan
dicatat apa adanya. Fase ini lahir dari memeriksa rilis Fase 25/26 di produksi, bukan dari
rencana yang sudah ada.

Dua hal sengaja tidak terbukti sebelum rilis: email verifikasi & reset lewat SMTP produksi
(lokal hanya pernah lewat Mailpit, yang tidak menuntut AUTH dan tidak melewati jaringan
IDCloudHost), dan cabang "belum punya kata sandi" di `/account` (diuji dengan mengosongkan
`passwordHash` di DB lokal, bukan lewat login Google sungguhan).

**Yang ditemukan sebelum satu email pun dikirim:**

- **Login Google mati total di produksi.** `GET /auth/google/start` menjawab 400
  `GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum dikonfigurasi`; kedua baris ada di
  `/srv/aruna/api.env` tapi nilainya kosong, karena OAuth client-nya sampai sekarang hanya
  punya redirect URI `127.0.0.1`. Tombolnya tetap dirender tanpa syarat di `login.vue` dan
  `register.vue`, jadi selama ini ada dua tombol di halaman paling penting yang membawa
  pengunjung ke halaman JSON error. Keduanya **tidak** ada di `PRODUCTION_REQUIRED`, jadi
  boot hijau dan `/ready` hijau — bentuk kegagalan yang identik dengan yang ditutup Fase 23.
- **`SMTP_PORT` satu-satunya variabel SMTP yang tidak wajib saat boot**, padahal ia
  satu-satunya yang punya nilai bawaan di kode (1025, port Mailpit) dan satu-satunya yang
  tidak bisa ditebak di VPS ini (2587, karena 25/465/587 di-drop diam-diam). Fase 23 menjaga
  tiga dari empat; yang keempat, yang paling mudah salah, terlewat.
- **`MailService` membuang sebab kegagalan.** `catch {` tanpa binding, dan satu-satunya
  service jaringan eksternal tanpa `Logger`. Akibatnya port diblokir, API key salah, dan
  domain pengirim belum terverifikasi menghasilkan baris log yang **identik** — jadi butir
  verifikasi pertama tidak bisa dijawab dari log. Tambalannya karena itu dikerjakan lebih
  dulu, sebelum verifikasinya.
- **Login Google pertama tidak otomatis membuktikan cabangnya.** `completeGoogle` punya empat
  jalur dan hanya satu menghasilkan `hasPassword === false`. DB produksi berisi satu akun,
  terverifikasi, berpassword, nol identitas OAuth — kalau Gmail yang dipakai sama dengan email
  akun itu, Google menempel diam-diam dan `hasPassword` tetap `true`. Kalau akunnya belum
  terverifikasi, `passwordHash` justru dihapus dan seluruh sesi dicabut.

**Yang dikerjakan:** `SMTP_PORT` masuk `PRODUCTION_REQUIRED` (dipastikan lebih dulu nilainya
sudah ada di server, supaya penjaganya tidak menjadi crash-loop di deploy berikutnya);
`MailService` dapat `Logger` dan menangkap `cause`, dengan `describeFailure()` yang diuji
untuk ketiga mode kegagalan; `connectionTimeout`/`greetingTimeout` 10 detik menggantikan
bawaan nodemailer dua menit; salinan `/account` cabang Google memperingatkan bahwa membuat
kata sandi akan mengeluarkan semua perangkat — `reset-password.vue` sudah mengatakannya
sesudah kejadian, `/account` tidak mengatakannya sebelum; dan `scripts/setup-google-oauth.sh`
menuntun pemilik menambahkan redirect URI produksi lalu menulis kredensialnya ke server.

**Yang terbukti di produksi:** `SMTP_PORT=2587`, `SMTP_FROM=noreply@arunadewa.id`, entri
pertama `WEB_ORIGIN` adalah `https://arunadewa.id` (jadi tautan email menunjuk ke host yang
benar), `nodemailer.verify()` diterima relay, dan satu `POST /v1/auth/forgot-password` nyata
dijawab **201 dalam 3,9 detik** dengan token `RESET_PASSWORD` berlaku 59 menit di DB dan log
API bersih — artinya domain pengirim `arunadewa.id` **sudah terverifikasi di Resend**, mata
rantai terakhir yang tidak bisa dibuktikan dari luar.

**Login Google dihidupkan 2026-09-17.** Redirect URI produksi ditambahkan ke client yang sama
(yang lokal tidak dihapus), kredensialnya disalin ke `/srv/aruna/api.env` lewat stdin ssh —
`api.env` dicadangkan lebih dulu — dan container `api` dibuat ulang, bukan di-`restart`, karena
`compose restart` tidak membaca ulang `env_file`. Buktinya: `/auth/google/start` menjawab 302 ke
`accounts.google.com` dengan `redirect_uri=https://api.arunadewa.id/auth/google`, `/ready` hijau
lagi dalam 10 detik, log API nol baris error. Sesudah nilainya ada, `GOOGLE_CLIENT_ID` dan
`GOOGLE_CLIENT_SECRET` baru dimasukkan ke `PRODUCTION_REQUIRED` — urutan itu disengaja: memasang
penjaganya lebih dulu berarti deploy berikutnya menolak menyala.

**Yang belum:** tes yang menyentuh empat cabang `completeGoogle` — tidak ada satu pun sekarang —
dan `/account` yang dirender dengan `hasPassword === false`. Keduanya baru bisa ditulis jujur
setelah login Google pertama sungguhan dijalankan dengan Gmail yang belum terdaftar; DB produksi
berisi satu akun berpassword dan terverifikasi, jadi Gmail yang sama akan menempel diam-diam ke
akun itu alih-alih melewati cabang yang ingin dikunci. `Publishing status` consent screen juga
belum diperiksa: selama masih `Testing`, hanya test user yang bisa masuk.

---

**Fase 26 — menu akun & halaman profil.** Ditulis 2026-09-17, sebelum dikerjakan.

Permintaannya terdengar seperti empat hal; dua di antaranya ternyata sudah ada dan sudah teruji.
`POST /v1/auth/logout` lengkap sejak fase identitas, dan halaman lupa/reset kata sandi lengkap
end-to-end sampai emailnya. Yang tidak ada adalah **jalan menuju keduanya**: tombol keluar cuma
hidup di rail `DashboardNav` — yang baru muncul setelah sebuah undangan dibuka — dan di footer.
Header landing tidak punya, dan `pages/dashboard/index.vue`, yaitu layar pertama yang dilihat
orang setelah masuk, tidak punya satu pun jalan keluar. Fitur yang tidak bisa dijangkau tidak
bisa dibedakan dari fitur yang belum dibuat, dan itulah bentuk laporannya: "kita belum bisa
logout kan?"

Yang benar-benar hilang: **tidak ada satu pun endpoint untuk mengubah data akun sendiri.** Tidak
ada `PATCH` di seluruh modul `identity/`. Nama yang salah ketik saat mendaftar tidak bisa
diperbaiki dari mana pun; kata sandi tidak bisa diganti tanpa berpura-pura lupa dan menunggu
email; dan tidak ada satu permukaan pun yang memberitahu bahwa emailnya belum terverifikasi —
`emailVerifiedAt` sudah diisi sejak lama dan tidak pernah dibaca siapa pun di web.

Yang dibangun: `AccountMenu` (dropdown reka-ui) dipasang di tiga header, halaman `/account`, dan
empat endpoint — `PATCH /v1/auth/me`, `POST /v1/auth/change-password`, `GET /v1/auth/sessions`,
`POST /v1/auth/resend-verification`.

Tiga keputusan yang diambil sebelum kodenya ditulis:

**"Perangkat aktif" ditulis sebagai riwayat sesi, bukan daftar perangkat.** `createSession`
mencabut semua sesi lama tiap login baru (`revokedReason: 'REPLACED'`) — satu sesi per akun
adalah kebijakan yang disengaja. Jadi daftar "perangkat aktif" secara desain selalu berisi tepat
satu baris, dan "keluar dari semua perangkat lain" tidak pernah punya sesuatu untuk dilakukan.
Yang berguna justru riwayatnya: perangkat, IP, kapan masuk, dan **sebab** berakhirnya. Baris
`REPLACED` yang tidak dikenali pemiliknya adalah satu-satunya sinyal yang akan ia dapat bahwa
kata sandinya bocor. Datanya sudah lengkap di tabel `Session` sejak awal dan belum pernah
dibaca dari mana pun.

**Avatar tidak disimpan.** Lima avatar orang (kepala bulat + badan, beda baju) dipilih dari hash
id akun. Nol kolom Prisma, nol migrasi, nol endpoint, dan orang yang sama selalu dapat avatar
yang sama di perangkat mana pun. Alternatifnya — menyimpannya di browser — akan hilang saat
ganti browser, dan orang membaca itu sebagai bug.

**Kata sandi lama wajib, dan salahnya dijawab 400, bukan 401.** Wajib karena tanpa itu laptop
yang ditinggal terbuka lima menit cukup untuk mengunci pemiliknya keluar dari akunnya sendiri.
Dan 400 karena `useApi` memperlakukan 401 sebagai sesi kedaluwarsa: ia akan menyegarkan sesi
lalu **mengulang** permintaannya, jadi satu kata sandi lama yang salah terkirim dua kali dan
membakar dua jatah rate limit. Ganti kata sandi mencabut sesi lain tapi **tidak** mencabut sesi
yang sedang dipakai — mengeluarkan orang dari perangkat tempat ia baru saja mengamankan akunnya
adalah hukuman untuk melakukan hal yang benar.

Gerbang e2e naik 152 → 156 (satu tes × empat project), dengan alasannya ditulis di komentar —
konvensi yang ditetapkan fase 25.

**Yang tidak ada di rencananya**, ditemukan saat mengauditnya di browser:

- **`UiButton` tidak pernah bisa menerima kelas display dari pemanggilnya.** Fallthrough Vue
  *merangkai* dua daftar kelas, dan pemenangnya ditentukan urutan di stylesheet, bukan urutan di
  atribut — jadi `class="hidden sm:inline-flex"` pada CTA "Buat undangan" kalah oleh `inline-flex`
  milik `cva` dan tombol itu **selalu** tampil di ponsel, sejak hari pertama. Tidak terlihat karena
  header lama kebetulan pas 335/335px; menambahkan avatar 44px membuatnya meluber 31px dan
  menyembunyikan tombol hamburger. Diperbaiki di sumbernya: kelas pemanggil digabung lewat
  `cn`/`tailwind-merge`. Radius ledakannya satu pemanggil — `AppHeader` — karena sebelas pemanggil
  `UiButton` lain hanya mengirim `justify-self-*`.
- **`DropdownMenuTrigger` menimpa `id` yang dipasang padanya** dengan `reka-dropdown-menu-trigger-v-0-0`,
  id yang berubah mengikuti urutan render. Itu melanggar aturan fase 15 dan membuat tes e2e tidak
  punya pegangan. Diselesaikan dengan `as-child`, sehingga tombolnya milik kita.
- **Tes e2e pertama untuk fase ini merusak fixture-nya sendiri.** `toHaveURL` lulus begitu URL
  berganti — pada navigasi SPA itu **sebelum** DOM ikut berganti — jadi tes membaca `h1` halaman
  sebelumnya, "Undangan kalian", lalu menyimpannya sebagai nama akun QA dan "memulihkan" fixture
  ke nilai yang tidak pernah jadi namanya. Sekarang nama dibaca dari fieldnya, setelah field itu
  terbukti ada.
- **Toast `top-center` menutupi pemicu menu akun** di lebar ponsel; kliknya mendarat di toast,
  menu tidak terbuka, dan tesnya gagal di baris berikutnya — jauh dari sebabnya. Hanya safari yang
  menangkapnya. Penantiannya sekarang menunggu toast pergi, bukan menunggu angka tebakan.
- **Satu pelanggaran kontras**: keterangan waktu sesi memakai `text-ink-subtle` di atas
  `bg-sage-soft` — 4,36 dari 4,5 yang diminta. Baris itu justru yang paling perlu dibaca.

- **`pnpm --filter @aruna/api dev` tidak bisa jalan sama sekali di Node ≥ 22.18.** Ditemukan saat
  mencoba menyalakan stack untuk mengaudit halaman baru di browser: `nest start --watch`
  menjalankan `dist/main.js` dengan `node` polos, dan `node` melucuti tipe tapi **tidak**
  memetakan `./index.js` ke `index.ts` — jadi `packages/contracts/src/api.ts` yang mengimpor
  saudaranya sendiri melempar `ERR_MODULE_NOT_FOUND` sebelum API sempat mendengarkan satu port
  pun. Dipastikan pra-ada lewat `git stash`: pohon bersih gagal dengan galat yang sama persis.
  Diperbaiki jadi `nest start --watch --exec tsx` — `tsx` sudah ada di `dependencies` justru
  untuk alasan ini, dan kompilasinya tetap lewat `tsc` sehingga `emitDecoratorMetadata` selamat
  dan DI Nest tetap bekerja. Dibuktikan: `/ready` 200, watch benar-benar memuat ulang saat berkas
  disunting, dan keempat project e2e hijau terhadap server dev ini. Alasannya ditulis di
  `README.md` supaya tidak ada yang "menyederhanakannya" kembali.

---

**Fase 24 — gerbang live.** Ditulis 2026-09-16, sebelum dikerjakan. Ini satu-satunya fase yang
sebagian besarnya bukan kode, dan justru itu sebabnya ia tertinggal: tidak ada satu pun perintah
di repo ini yang bisa menjalankannya sendiri.

Yang memblokir, dan berdiri di satu rantai yang tidak boleh dibalik:

- **DNS masih menunjuk halaman parkir.** Per 2026-09-16 `@` dan `www` menjawab `103.214.112.181`
  dengan toggle "Proxied" IDCloudHost menyala — itu bukan CDN, itu halaman parkir mereka — dan
  `api` bahkan belum punya record sama sekali (NXDOMAIN). Artinya belum pernah ada satu byte pun
  trafik yang sampai ke VPS. Caddy karena itu tidak pernah melihat tantangan ACME dan tidak akan
  pernah punya sertifikat, dan gerbang `Tunggu /ready` di `deploy.yml` — yang menembak
  `https://api.arunadewa.id/ready` — merah di tiap rilis walaupun stack-nya sehat. Ketiganya
  harus A ke `103.181.143.128` dengan Proxied **OFF**. Prosedur dan verifikasinya di
  `ops/README.md`.
- **SMTP harus terisi sebelum rilis berikutnya, bukan sesudah.** Fase 23 menjadikannya syarat
  boot; `api.env` di server masih kosong. Urutan yang benar: isi dulu, baru push. Terbalik berarti
  API menolak menyala dan rilisnya gagal di boot. Keputusan: Resend — gratis 3.000/bulan dan boleh
  mengirim dari `@arunadewa.id` setelah domainnya diverifikasi, yang toh butuh panel DNS yang sama.
- **`rollback.sh` belum terpasang di server.** `deploy.yml` yang gagal mencetak
  `ssh aruna sudo /usr/local/lib/aruna/rollback.sh`, dan berkas itu belum ada. Pesan rollback yang
  menunjuk berkas yang tidak ada adalah pesan yang dibaca jam 2 pagi saat panik.
  `ops/backup/install.sh` memang memasangnya, tapi ia keluar lebih dulu tanpa `age`/`rclone` —
  keduanya bagian paket backup yang ditunda. Jadi dipasang langsung.
- **Job `e2e` belum pernah dieksekusi di CI.** Fase 22 menulisnya; rilis berikutnya adalah kali
  pertama ia benar-benar jalan. Kalau merah, deploy tidak pernah berangkat — dan itu memang
  gerbang yang diinginkan. Diperbaiki sampai hijau, bukan dilonggarkan.

Yang membuktikan fase ini selesai bukan deploy hijau — itu hanya membuktikan container sehat.
Yang membuktikannya: satu lintasan penuh di domain produksi (daftar → email verifikasi benar-benar
masuk → buat undangan → unggah foto → publish → tautan tamu → RSVP terbaca operator), lalu
`--force-recreate api` dan **foto dari langkah unggah masih ada sesudahnya**. Yang terakhir itu
satu-satunya bentuk yang membuktikan perbaikan fase 20 benar; tidak ada tes yang bisa mewakilinya.

Ditutup dengan dua monitor UptimeRobot — `api.arunadewa.id/ready` dan `arunadewa.id/`. Yang kedua
menangkap kegagalan paling sunyi di sistem ini: sertifikat kedaluwarsa datang 60 hari setelah
sebabnya, dan tidak ada satu pun log yang berubah di hari penyebabnya.

**Sesudah itu, dan tidak sebelumnya:**

- **S3 / object storage.** Keputusan pemilik: setelah situs live. `MEDIA_PROVIDER=local` + volume
  `media` sudah benar, dan fase 24 membuktikannya bertahan lewat restart.
- **Backup off-site** (`ops/backup/`) — butuh bucket, jadi satu paket dengan S3. Runbooknya sudah
  lengkap di `ops/backup/README.md`; yang paling mudah dilupakan adalah drill restore bulanan, dan
  check `aruna-restore-drill` di healthchecks.io ada justru untuk itu.
- **Midtrans dan Google OAuth** tetap kosong. Operator menandai lunas manual; itu posisi yang
  dipilih sejak fase UI/UX, bukan kelalaian.
- **Cloudflare/CDN dan `TRUST_PROXY=2`** — belum punya pembeli. Trafik nol, Caddy sudah
  `encode zstd gzip`, dan menaikkan `TRUST_PROXY` tanpa ufw yang mengunci 80/443 ke rentang IP CDN
  membuat tiap limiter per-IP jadi hiasan. Urutannya, kalau nanti ada alasan nyata, di
  `ops/README.md`.

---

**Fase 21–23 selesai 2026-09-16.** Ketiganya **dikerjakan sebelum ditulis** — pelanggaran aturan
urutan yang ketiga setelah fase 12 dan 19. Dicatat apa adanya, bukan dirapikan: tiga kali berarti
ini bukan kecelakaan, ini yang terjadi tiap kali pekerjaannya terasa seperti "operasi" dan bukan
seperti "fitur". Aturannya tidak dilonggarkan; fase 24 di atas ditulis lebih dulu.

Ketiganya menutup satu bentuk kegagalan yang sama: **hijau di tempat yang diperiksa, mati di
tempat yang tidak.**

`/ready` yang lama hanya `SELECT 1`. Ia tidak pernah menyentuh direktori media, jadi bug
`MEDIA_LOCAL_DIR` fase 20 — unggahan yang mendarat di lapisan container dan ikut terhapus tiap
rilis — lolos sepenuhnya: nol galat, gerbang hijau, foto pelanggan hilang. Yang menangkap kelas
itu hanya tulis-baca-hapus; memeriksa keberadaan direktori tidak, karena direktori yang salah pun
ada. Probe-nya dibatasi 2 detik, jauh di bawah `timeout: 5s` healthcheck, supaya berkas sistem
yang menggantung dilaporkan sebagai tidak siap alih-alih membuat healthchecknya sendiri kehabisan
waktu dan kehilangan sebabnya. Ia sengaja hanya untuk penyimpanan lokal: pada S3 ia akan menulis
dan menghapus objek tiap 15 detik — ~17 ribu permintaan per hari untuk pertanyaan yang tidak
sedang ditanyakan.

Worker adalah satu-satunya service yang bisa **hidup tapi mati**. `boss.on('error')` mencetak
galat lalu membiarkan proses berjalan, jadi `restart: unless-stopped` tidak pernah memutar ulang
dan antreannya menumpuk tanpa satu pun gejala. Endpoint `:3002` menjawab pertanyaan yang
sebelumnya tidak bisa ditanyakan siapa pun: apakah ia masih benar-benar bekerja, atau sekadar
masih berjalan. Ambang basinya tiga interval, bukan satu — satu putaran yang kebetulan lambat
bukan alasan menyatakan worker mati. Dan tanpa `MIDTRANS_SERVER_KEY` ia tetap sehat, karena
rekonsiliasi memang tidak berjalan: alarm yang selalu menyala adalah alarm yang dimatikan orang.

Temuan terbesar fase 22 bukan bug melainkan ketiadaan: **148 eksekusi Playwright tidak pernah
jalan di CI sama sekali.** Investasi terbesar repo ini tidak menjaga jalur rilisnya. Job `e2e`
dipasang sejajar `verify` dan sengaja tanpa `needs:`, `if:`, maupun `continue-on-error:` —
ketiganya adalah cara job merah tetap menghasilkan `workflow_run.conclusion: success`, dan
`deploy.yml` digerbangi tepat oleh nilai itu. Bentuk yang sama muncul sekali lagi di dalam
suite-nya: fixture yang hilang memicu `test.skip`, yang menandai eksekusi *skipped* dan bukan
*failed*, sehingga 44 eksekusi bisa hilang diam-diam sementara Playwright tetap keluar 0. Di CI
ia sekarang melempar.

Temuan kedua fase 22 sama diamnya: **Caddyfile tidak punya satu pun jalur ke server.** Ia
bind mount di `/srv/aruna` dan dikecualikan dari image, jadi tiap perubahan padanya tidak pernah
berlaku — termasuk perubahan fase ini sendiri. Sekarang dikirim ke `.staging`, divalidasi di
container `caddy:2-alpine` sekali pakai **sebelum** menimpa yang sedang dipakai (Caddyfile rusak
yang sudah mendarat tidak menjatuhkan Caddy yang sedang jalan — ia mematikan situs pada restart
berikutnya, jauh dari rilis yang menyebabkannya), lalu `caddy reload` berulang tanpa memutus
koneksi. Pemangkasan image dipasang **setelah** gerbang `/ready`, bukan di dalam langkah terapkan:
`up -d` kembali saat container dijadwalkan, belum tentu sehat, dan memangkas di baris berikutnya
berarti menghapus image yang kamu butuhkan untuk rollback justru ketika boot-nya gagal.
`docker volume prune` tidak ada di berkas itu dan tidak boleh ditambahkan — volume `postgres` dan
`media` tampak "tidak terpakai" bagi Docker setiap kali stack-nya turun.

SMTP menutup kelas yang sama dari arah lain. `mail.service.ts` baru memeriksanya saat email
pertama dikirim, jadi API produksi tanpa SMTP menyala bersih, `/ready` hijau, dan yang menemukan
masalahnya adalah pelanggan pertama yang mendaftar — lewat 503 tanpa satu pun alarm. Keempatnya
kini wajib saat boot, alasan yang sama dengan `JWT_SECRET` dulu: kegagalan saat deploy jauh lebih
murah. `SMTP_USER` dan `SMTP_PASS` ikut wajib, bukan hanya `SMTP_HOST`, karena
`smtpTransportOptions()` hanya menyertakan blok `auth` kalau keduanya terisi dan tiap relay
menuntut AUTH — separuh terisi gagal persis seperti kosong, tapi terlihat sudah dikonfigurasi. Ia
sengaja **tidak** masuk `/ready`: yang tersisa untuk diperiksa di sana hanyalah relay yang sedang
down, dan menghubunginya tiap 15 detik memancing rate limit mereka untuk pertanyaan yang jarang
berubah.

189 → **215 tes unit**. `ops/README.md` jadi runbook produksi, dan `apps/web` serta `apps/worker`
akhirnya punya `.env.example` — keduanya selama ini hanya hidup sebagai berkas mode 600 di satu
server, yang persis kesalahan yang dicatat fase 20.

---

**Fase 20 selesai 2026-09-16** (commit `02d444b`). Ditulis lebih dulu, lalu dikerjakan.

**Tiga konfigurasi yang benar di berkas yang salah.** Ketiganya lolos `typecheck`, `lint`, dan 189 tes unit: tidak satu pun dari ketiganya
hidup di kode yang diuji.

- **`HOST=0.0.0.0` cuma ada di `api.env` server, dan berkas itu tidak terlacak git.** Fase 19
  mencatatnya sebagai syarat lalu menuliskannya dengan tangan, sekali. Siapa pun yang menyusun
  ulang `/srv/aruna` — atau menulis ulang env-nya — mendapat bawaan `127.0.0.1`, yaitu loopback
  milik container itu sendiri, dan Caddy di container sebelah tidak akan pernah tersambung.
  Gejalanya 502 dengan log API bersih. Syarat yang menentukan hidup-matinya situs tidak boleh
  hanya hidup di satu berkas di satu server. Pindah ke `compose.prod.yaml` sebagai
  `environment:`, yang menang atas `env_file:`; `api.env` boleh tetap memuatnya, tidak lagi
  menentukannya.
- **Volume media dipasang di path yang tidak pernah ditulis.** `compose.prod.yaml` memasangnya
  di `/app/.data/media` dan `Dockerfile` men-chown path yang sama, tapi API menulis ke
  `MEDIA_LOCAL_DIR=./.data/media` — **relatif terhadap cwd**, dan `pnpm --filter @aruna/api start`
  menjalankannya dari `/app/apps/api`. Yang sesungguhnya ditulis: `/app/apps/api/.data/media`,
  di dalam lapisan container, bukan volume. Perbaikan fase 19 tidak salah niat, hanya salah
  alamat — foto pelanggan tetap hilang tiap rilis, dan diamnya sama persis. Path dibuat absolut
  (`MEDIA_LOCAL_DIR=/app/.data/media`) di kedua compose, dan `LocalMediaStorage` me-resolve
  direktorinya sekali saat dibangun supaya tempat tulisnya berhenti bergantung pada cwd.
- **Log boot mencetak alamat yang belum tentu dipakainya.** `API listening on
  http://127.0.0.1:${port}` ditulis sebagai literal, apa pun yang di-bind. Itu yang membuat
  kegagalan pertama terlihat sehat. Sekarang alamat bind sungguhan yang dicetak, dan boot
  produksi yang bind ke loopback mendapat satu peringatan yang menyebut sebabnya.

Dua perbaikan fase 19 yang lain tetap benar dan tidak disentuh: `set -eu` (bukan `set -euo
pipefail`) untuk dash di `ssh-action`, dan keempat skrip `db:*` yang memakai `run` eksplisit
supaya tabrakan nama dengan perintah bawaan pnpm tidak bisa terulang diam-diam.

---

**Fase 19 selesai 2026-09-16** (commit `b44ffd0`, `b5663a3`).

**Rilis pertama ke produksi.** Ditulis **setelah** `Dockerfile`,
`compose.prod.yaml`, `Caddyfile`, dan `deploy.yml` sudah ada di pohon kerja. Itu pelanggaran
aturan urutan yang kedua setelah fase 12, dan dicatat apa adanya, bukan dirapikan.

Yang sudah berdiri, terukur:

- **Server** IDCloudHost SouthJKT, Ubuntu 24.04.4, 2 vCPU / 3,8 GiB / 58 GB. swap 2 GB dengan
  `vm.swappiness=10` — RAM 4 GB memegang Postgres, api, web, worker, dan Caddy sekaligus.
  Docker 29.8.1. `ufw` menyala: 22, 80, 443/tcp, 443/udp, sisanya ditolak.
- **Image dibangun di CI, bukan di server.** `nuxt build` dengan `typeCheck` menyala tidak
  muat di 2 vCPU, dan build yang gagal di server berarti server yang sibuk, bukan pipeline merah.
- **Tiga secret** (`SSH_HOST`, `SSH_USER`, `SSH_KEY`) terpasang lewat `gh`. Izin workflow repo
  sudah `write`, jadi `GITHUB_TOKEN` boleh mendorong ke GHCR. Repo publik — paketnya ikut publik,
  dan kuota 500 MB paket privat tidak berlaku.
- **`/srv/aruna`** berisi `compose.prod.yaml`, `Caddyfile`, dan empat berkas env mode 600.
  `POSTGRES_PASSWORD` dan `JWT_SECRET` dibuat di server dengan `openssl rand`, tidak pernah lewat
  mesin lokal. Password Postgres hex, bukan base64: ia masuk ke `DATABASE_URL`, dan `+` atau `/`
  di sana harus di-percent-encode — satu sumber kegagalan diam yang tidak perlu dibuat.

Dua temuan yang akan jadi kegagalan diam kalau tidak ditangkap sebelum rilis:

- **`HOST=0.0.0.0` wajib di `api.env`.** `main.ts` memanggil `app.listen(port, process.env.HOST ??
  '127.0.0.1')`. Di dalam container nilai bawaan itu berarti loopback container, dan Caddy —
  container lain — tidak akan pernah tersambung. Gejalanya 502 dari proxy, bukan error saat boot,
  jadi lognya bersih dan situsnya mati.
- **Media lokal tanpa volume hilang tiap rilis.** `MEDIA_PROVIDER=local` menulis ke
  `.data/media` di dalam container, dan `compose.prod.yaml` tidak memasang apa pun di sana;
  komentar `Dockerfile` mengasumsikan S3 yang belum dikonfigurasi. Sekarang ada volume bernama
  `media`, dan `Dockerfile` membuat `/app/.data/media` milik `node` **sebelum** `USER node`:
  volume bernama yang menunjuk path yang belum ada di image lahir milik root, dan proses `node`
  tidak bisa menulis ke sana.

Yang memblokir rilis, dan bukan hal teknis: **`arunadewa.id` belum terdaftar.** whois PANDI
menjawab `DOMAIN NOT FOUND`, tidak ada NS. Tanpa itu Caddy tidak bisa menerbitkan sertifikat dan
gerbang `/ready` di `deploy.yml` — yang menunjuk `https://api.arunadewa.id` — tidak akan pernah
hijau. Keputusan pemilik: domain didaftarkan dulu, bukan dipakaikan host sementara.

Sengaja ditunda, dan tercatat supaya tidak lupa:

- **SMTP kosong.** Verifikasi email dan reset password akan gagal saat dikirim, bukan saat boot.
  Gmail gratis bisa, tapi From-nya `@gmail.com`; Resend gratis 3.000/bulan dan boleh kirim dari
  domain sendiri setelah domainnya ada.
- **`TRUST_PROXY=1`** — satu hop, Caddy. Naik ke 2 hanya setelah Cloudflare dipasang di depan
  *dan* `ufw` membatasi 80/443 ke rentang IP Cloudflare. Menaikkannya lebih dulu berarti siapa pun
  boleh mengarang `X-Forwarded-For`, dan tiap limiter per-IP jadi hiasan.
- Midtrans, Google OAuth, dan S3 dibiarkan kosong. Operator menandai lunas manual; itu memang
  posisi yang dipilih sejak fase UI/UX.
- **Rollback masih manual** dan disengaja: `.image.env.previous` disalin sebelum ditimpa, tiga
  baris untuk mundur. Aman selama migrasi maju-saja.

---

**Fase 18 selesai 2026-09-15.** Ditulis lebih dulu, lalu dikerjakan.

**Autosave dicabut, bukan diperbaiki.** Keputusan pemilik, dan pembacaan kodenya membenarkannya:
yang tercatat di fase 16 sebagai "jawaban simpan yang melayang menimpa dokumen lokal" ternyata
bukan penimpaan sesekali. `document.value = result.document` mengubah identitas ref, memicu
`watch(document, …, { deep: true })`, dan penjaganya `saving.value` **selalu** lolos karena
`finally` menyetel `saving = false` sebelum antrean watcher Vue di-flush. Terukur sebelum
disentuh: satu suntingan di satu kolom menghasilkan **13 revisi dalam 12 detik**, lalu **11
`PUT …/draft` tiap 10 detik diam**, selama editornya terbuka. Sesudah: **0 saat diam, 1 per
penekanan tombol.** `draftRevision` undangan QA sudah terlanjur di r1169 karenanya.

Jawaban servernya sendiri nol informasi — `saveDraft` mengembalikan `{ document, revision + 1 }`,
gema dari dokumen yang baru dikirim, yang sudah di-parse klien dengan skema yang sama.
Menugaskannya kembali bukan sinkronisasi, melainkan penimpaan.

Penggantinya: penanda kotor yang cuplikannya diambil **sebelum** permintaan berangkat dan baru
dipasang setelah berhasil (suntingan yang datang selagi terbang tetap terhitung belum
tersimpan), keadaan tersimpan yang **tertulis** di header, dan popup saat halaman ditinggalkan.

**Popup jadi fasilitas global, bukan milik editor.** `usePopupStore` (Pinia, antrean satu-dalam-
satu-waktu) + `AtomicPopup` di `app.vue` + composable `usePopup()`. Fondasinya primitif `Dialog*`
reka-ui yang sudah dipakai dua tempat lain — jebakan fokus, `aria-modal`, kunci gulir, dan
pengembalian fokus mahal kalau ditulis sendiri dan sunyi kalau salah, sementara axe menyapu
halaman dasbor. Fokus awal dipaksa ke aksi pertama, bukan ke tombol silang: bawaan reka-ui
memfokuskan elemen fokusabel pertama, dan itu membuat Enter membatalkan pertanyaannya. Pemakai
kedua yang membuktikan reusable-nya: `reset()` berhenti memakai `window.confirm`.

**Kuota foto berhenti bocor.** Pelepasan aset ikut berubah, dan itu konsekuensi langsung: dulu
berkas dihapus begitu URL-nya lepas dari dokumen di layar, dan draf di server menyusul 900ms
kemudian lewat autosave. Tanpa autosave urutan itu meninggalkan draf tersimpan yang menunjuk
aset mati. Sekarang URL yang dihapus mengantre dan dilepas **sesudah** simpan berhasil, diuji
terhadap dokumen yang benar-benar tersimpan (`utils/asset-release.ts`). Terukur: aset undangan QA
**7 sebelum, 7 sesudah satu putaran suite penuh** yang menjalankan siklus unggah–hapus empat
kali. Sebelumnya hitungannya merangkak naik sampai mentok 15 dan `Dropzone` memasang `blocked`.

---

**`device preview` di WebKit 390 — dan kenapa ia menyamar sebagai hal lain.**

Bukan klik yang menggantung, bukan pula tata letak yang tidak pernah reda. `await
page.evaluate(() => document.fonts.ready)` **tidak pernah resolve** di WebKit pada halaman
editor. Penantian itu memakan seluruh jatah 30 detik, jadi yang dilaporkan gagal adalah langkah
mana pun yang kebetulan berjalan saat tenggatnya lewat — dua kali berturut-turut dengan langkah
yang berbeda ("scrolling into view", lalu pemuatan foto). Trace-nya yang menunjukkannya: satu
`Evaluate` selama **27.543ms** tepat setelah klik tab Pratinjau, lalu semua langkah sisanya
selesai dalam 3–50ms setelah tenggatnya lewat.

Sebabnya: `@nuxt/fonts` mendeklarasikan tiap keluarga dua kali — satu set ber-`unicode-range`
dan satu rentang penuh, **12 blok `@font-face` per weight Cormorant**, di bundel produksi maupun
dev. Saat keduanya mulai memuat untuk glyph yang sama, WebKit membatalkan yang kalah dan
mencatatnya `error`, dan **satu face `error` membuat `FontFaceSet.status` mandek di `loading`
selamanya**. Terukur: 0–1ms di Chromium 390 dan WebKit 1440, tidak pernah selesai di WebKit 390.

Tidak ada yang rusak di layar, dan itu diperiksa, bukan diasumsikan: face rentang penuh tetap
menang, `document.fonts.check('600 24px "Cormorant Garamond"')` bernilai `true` di ketiga
kombinasi termasuk yang punya dua face `error`, dan halaman undangan tamu di WebKit 390 bersih
sama sekali (`status: loaded`, nol error). Jadi ini bukan bug yang dilihat tamu — ini penantian
yang tidak pernah bisa selesai di dalam tes.

Tesnya diganti, bukan dilemahkan: ia sekarang menyebut huruf yang dipakai elemen yang sedang
diukur dan memuatnya (`fontsUsedBy`), alih-alih menunggu himpunan 136 face. 43ms di WebKit 390.
Tes `device preview` di sana: **30s timeout → 2,3s hijau.**

**Yang tidak dicari tapi ketemu, dan ini bayaran sesungguhnya dari project `safari`:** tes galeri
merah di WebKit dengan pesan server "Isi berkas tidak cocok dengan jenis media yang diklaim".
`canvas.toBlob(…, 'image/webp')` boleh mengabaikan jenis yang diminta dan mengembalikan PNG —
spesifikasinya mengizinkan, dan WebKit memakainya — sementara `normalizePhoto` tetap menamainya
`.webp` dan melabelinya `image/webp`. Pemeriksaan magic-byte di server menolaknya. Artinya **di
browser tanpa encoder WebP, tidak satu pun foto bisa diunggah pasangan**, dan tidak ada tes yang
pernah menjalankan jalur itu di mesin selain Chromium. Sekarang nama dan MIME dibaca dari
`blob.type`; PNG yang sudah diperkecil tetap dikirim (yang hilang cuma penghematan formatnya),
dan yang jenisnya tidak dikenal jatuh ke berkas asli.

189 tes unit, **148 e2e (37 × 4 project)** — keempatnya hijau, termasuk WebKit 390 yang belum
pernah hijau sama sekali.

---

**Fase 17 selesai 2026-09-15.** Ditulis lebih dulu, lalu dikerjakan.

Lahir dari trace enam demo Katsudoto, yang awalnya cuma untuk menjawab satu pertanyaan: musik
latar mereka YouTube atau bukan. Jawabannya bukan — MP3 yang di-host sendiri, ditanam sebagai
`var MUSIC = { url, box }`, persis arsitektur kita. YouTube hanya untuk seksi video prewedding
dan live streaming. Yang tidak dicari tapi ketemu adalah satu handler mereka yang kita tidak
punya: `$(document).on('click', '.play-btn, …', () => pauseMusic())`.

**Seksi Video kita merender tautan keluar.** Tamu menekannya, tab siaran akad terbuka, tab
undangan jadi tersembunyi — dan `<audio loop>` kita terus berbunyi menimpa ijab kabul. Browser
tidak menjeda audio tab tersembunyi. Ini bug, bukan fitur yang kurang, dan belum ketahuan hanya
karena tidak ada tes yang membuka seksi video selagi musik berbunyi.

Katsudoto menyelesaikan separuhnya lalu merusaknya sendiri: `setupVisibilityHandling` mereka
memutar musik lagi begitu tab kembali terlihat, tanpa memeriksa apakah tamu tadi sengaja
menjeda — jeda di ruang rapat batal sendiri setelah pindah tab. Penanda `sessionStorage` kita
sudah ada persis untuk pertanyaan itu, jadi aturan `show` kita memeriksanya. Satu aturan lagi
berbeda dari mereka: membuka siaran menjeda musik **tanpa** menandainya untuk dilanjutkan.
Tamu yang kembali ke tab undangan tidak sedang meminta musiknya balik; siarannya masih jalan
di tab sebelah.

Di luar lingkup dan sengaja ditunda: crop `start`/`end` untuk MP3 unggahan (`CROPPED_SONG`
mereka — pustaka kita sudah dipotong di server, jadi ini hanya untuk jalur unggah), dan embed
pemutar video di halaman alih-alih tautan keluar.

Lima aturannya (`gate`, `toggle`, `leave`, `hide`, `show`) ditulis sebagai reducer murni
supaya bisa diuji tanpa browser; delapan tes unit mengunci kalimatnya, satu tes e2e baru
membuktikannya di Chromium sungguhan — termasuk popup siaran yang benar-benar terbuka.

**Yang tidak ada di rencananya:** pertanyaan "harus MP3 kah" berujung pada pemeriksaan syarat
lain agar audio berbunyi di iOS, dan di situ ketahuan `PublicMediaController` memakai
`response.send(asset.body)` — `Range` diabaikan sepenuhnya. `/audio/*.mp3` bawaan menjawab `206`
karena Nitro yang menyajikannya; MP3 yang **diunggah pasangan** lewat endpoint kita menjawab
`200` tanpa `Accept-Ranges`, dan itulah bentuk kegagalan media yang paling sering dilaporkan di
Safari. Diuji langsung dengan `curl` terhadap instance kedua dari `dist`: `bytes=0-1` → `206`
`bytes 0-1/5340`, sufiks `-100` → ekor yang benar, di luar jangkauan → `416` `bytes */5340`,
header rusak → utuh `200`. Sembilan tes unit mengunci pembacaan headernya.

**Suite e2e tidak pernah menyentuh WebKit.** Ketiga project Playwright semuanya Chromium dengan
lebar berbeda, jadi klaim "jalan di iOS" tidak pernah punya bukti di bagian mana pun. Project
keempat `safari` (WebKit 26.6, 390×844) ditambahkan, dan **langsung membayar dirinya sendiri**:
`device preview` gagal di sana, kliknya menggantung di scroll-into-view sampai batas 30 detik.
Diisolasi tiga kali sebelum dicatat sebagai temuan — WebKit 1440 lolos, Chromium 390 lolos,
WebKit 390 gagal — jadi penyebabnya kombinasi mesin dan lebar ponsel, bukan salah satunya.
**Didiagnosis dan diperbaiki di fase 18** — bukan kliknya, melainkan `document.fonts.ready`
yang tidak pernah resolve di WebKit dan memakan seluruh jatah 30 detik.

**Tes galeri tidak bisa hijau dua kali berturut-turut, dan itu bukan flake.** (Selesai di fase 18.) Tes unggah sudah
membersihkan fotonya sendiri, tapi hitungannya tetap merangkak naik sampai mentok 15 dan
`Dropzone` memasang `blocked`. Penyebabnya bug autosave yang sudah tercatat di bawah: jawaban
simpan yang melayang menimpa dokumen lokal dan menghidupkan kembali URL yang baru dihapus.
Terukur dalam satu sesi: dipangkas ke 14, satu putaran desktop lewat, lalu 15 lagi tanpa ada
unggahan baru yang berhasil. Selama bug itu hidup, tiap penambahan project melipatgandakan
gejalanya.

---

**Fase 16 selesai 2026-09-15.** Ditulis lebih dulu, lalu dikerjakan.

Yang tidak ada di rencananya, dan itu bagian pentingnya:

**Undangan ternyata belum 100% container query.** Fase 12 mengklaim itu, dan lima utilitas
`md:`/`sm:` memang dikonversi — tapi konversinya jadi `@media (min-width: …)` di blok `<style>`,
yang membaca viewport persis seperti utilitas yang digantikannya. Ditemukan lewat tes
`device preview` yang merah: tinggi pratinjau "Ponsel" berbeda-beda tergantung lebar browser
pasangan. Setelah enam `@media` → `@container`, empat lebar kotak foto cover dan enam skala huruf
`vw` → `cqw`, ketiga lebar browser menghasilkan angka yang **identik seksi demi seksi**
(Ponsel 5682, Tablet 5182). Undangan tamu tidak berubah sedikit pun — di sana wadahnya memang
selebar layar. Yang berubah: pratinjau perangkat berhenti berbohong.

**Penjaga hapus aset sempat salah.** Versi pertamanya memakai `publicDocument`, yang menyaring
section mati — jadi galeri yang sedang dimatikan membuat fotonya dianggap "tidak dipakai" dan
boleh dihapus, padahal revisi yang sudah terbit masih memuat tautannya. Ketahuan karena memang
terjadi: empat foto dasbor QA jadi 400. Sekarang `referencesAsset` (dokumen mentah, untuk
menolak hapus) dipisah dari `servesAsset` (versi publik, untuk menolak sajikan).

**Tes `device preview` juga diperbaiki, bukan dilemahkan**: menunggu hidrasi (kliknya dulu
mendarat sebelum Vue terpasang dan diam-diam tidak melakukan apa-apa), menunggu font terpasang,
dan memuat semua foto sebelum mengukur.

Sisa yang diketahui dan sengaja ditunda:

- **Tidak ada satu pun lagu Indonesia di pustaka.** Rekaman gamelan di Commons semuanya
  CC BY-SA, bukan CC0/PD. Pilihannya: terima CC BY-SA untuk audio dengan atribusi di pemutar
  (field `credit` sudah ada), atau pesan rekaman sendiri. Keputusan lisensi, bukan teknis.
  Rinciannya di `docs/features/invitation-builder/sources/MUSIC.md`.
- **Kuota foto masih satu angka untuk semua paket** (`galleryPhotoLimit = 15`), padahal katalog
  menjanjikan 15/30/60. `Invitation` belum menyimpan paketnya — hanya daftar entitlement fitur.
- ~~**Autosave bisa menghidupkan kembali URL yang baru dihapus.**~~ Selesai di fase 18, dan
  lebih dalam dari yang dicatat di sini: autosave dicabut seluruhnya.
- **Tinta tombol `#FFFDF7`** di `MusicPlayer.vue` belum diturunkan jadi `--iv-on-primary`.
  Itu yang memblokir tema gelap; fase sendiri, menyentuh `contrast.ts` dan sembilan tema.
- Dua permukaan yang **belum pernah** diaudit di browser masih menunggu: wizard `/order` dan
  halaman auth.
- `pnpm test:integration` gagal di `old refresh token replay denied` — tidak berhubungan dengan
  media, tapi artinya fixture QA tidak bisa diregenerasi bersih sampai itu dibereskan.

**Fase 12 melanggar aturan urutan** dan ditulis setelah dikerjakan. Dicatat apa adanya, bukan
dirapikan: ia lahir dari peninjauan hasil fase 11 di layar — kerapatan kolom dan pertanyaan
"bagaimana lihatnya di perangkat lain" — bukan dari rencana yang sudah ada. Peninjauan memang
melahirkan pekerjaan; yang keliru adalah mengerjakannya lebih dulu dan menulisnya belakangan.

---

## Aturan

- Fase dikerjakan berurutan; fase dokumentasi mengikuti fase yang melahirkan aturannya.
- Tiap fase yang menyentuh visual diverifikasi di browser pada **375px dan 1440px**, bukan hanya di satu lebar.
- Angka di berkas ini diambil dari pengukuran. Kalau sebuah angka berubah, perbarui barisnya — jangan tambahkan kesan baru di sampingnya.
- Suite e2e butuh **origin web dan `WEB_ORIGIN` API yang cocok**. `OriginGuard` menolak semua POST dari origin lain dengan 403, jadi gejalanya "halaman kebuka tapi login gagal" dan tiga tes `dashboard.spec.ts` merah. Kalau port 3000 sudah dipakai, jalankan pasangan sendiri (API dengan `PORT`/`WEB_ORIGIN` ditimpa, web dengan `NUXT_*_API_BASE` menunjuk ke situ) dan arahkan suite lewat `E2E_BASE_URL`. `nuxt dev` bind ke IPv6 saja kecuali diberi `--host 127.0.0.1` — tanpa itu originnya jadi `localhost` dan guard-nya menolak lagi.
