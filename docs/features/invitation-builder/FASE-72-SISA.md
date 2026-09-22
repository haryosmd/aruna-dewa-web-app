# Fase 73 — mengunci fase 72

Penjejak lintas-sesi. Ditulis 2026-09-21 sesudah pemeriksaan ulang fase 72 ("Elegance"): dua
cacat yang ditemukan saat verifikasi 2026-09-20 sudah benar diperbaiki, tapi di belakangnya ada
tiga cacat yang memblokir pelanggan sungguhan dan tidak tersentuh tes mana pun.

**Cara memakai berkas ini:** centang saat sebuah butir selesai, dan tulis nomor commit-nya di
belakang judulnya. Yang belum tercentang adalah yang tersisa — jangan mengandalkan ingatan sesi.

Status: `[ ]` belum · `[~]` sedang dikerjakan · `[x]` selesai · `[-]` diputuskan tidak dikerjakan

**2026-09-22:** sisa berkas ini dikerjakan sebagai **fase 74** (`docs/ROADMAP.md`), bersama
pemisahan `templateId` jadi dua sumbu (`structureId` + `themeId`). Nomor commit `74.x` ditulis
di belakang tiap butir yang ditutup.

**2026-09-22 (kedua):** yang masih tersisa sesudah fase 74 — termasuk yang ditulis sebagai
"ditunda resmi" di §5 — ditelusuri ulang dan dikerjakan sebagai **fase 75**. Nomor commit `75.x`.
Satu butir tetap tidak dikerjakan dan alasannya ditulis di tempatnya, bukan dihapus: undang
kolaborator. Penelusuran fase 75 juga membalik satu prioritas — lihat §5 butir share-card.

---

## 0. Keadaan saat berkas ini ditulis

- [x] **Sampah lokal ditutup `.gitignore`** — `env` (tanpa titik, 11 nilai terisi),
  `env.example 23-10-41-429.example`, `claude (1).zip`, `.DS_Store`. `.env`/`.env.*` tidak
  menutup `env`, dan satu `git add -A` akan menerbitkannya permanen.
  Catatan untuk pemilik: akar repo **tidak punya `.env.example`** padahal `.gitignore` menegosiasikannya
  (`!.env.example`); `env` sepertinya salinannya yang kehilangan titik saat diunduh.
- [x] **Fase 72 masuk enam commit** (2026-09-21) — `2599dad` 72.0 · `4d8ae6f` 72.1–72.2 ·
  `9798641` 72.8+72.3 · `fae9aaf` 72.4–72.5 · `f76268a` 72.6 · `a55a8f5` 72.7. Sebelum ini
  88 berkas hidup hanya di working tree; satu `git clean` menghapus seluruh fase 72.

## 1. Dua cacat 2026-09-20 — terverifikasi, dengan catatan

- **Cacat A (undo sesudah menggeser urutan): benar, narasinya salah.** Riwayat tidak ada di
  `composables/useDocument.ts` (berkas itu hanya dokumen demo) melainkan di
  `pages/dashboard/[id]/editor.vue:124-144`. Yang menutup bug adalah `salin()` yang memakai JSON,
  **bukan** `toRaw` di `reorder()` — `toRaw` di sana kosmetik. Proxy masih ditanam ke dokumen hari
  ini oleh `editor/ExtrasForm.vue:26,34,37,40` dan `editor.vue:242,253,263,326`; kalau `salin()`
  suatu saat "dioptimalkan" kembali ke `structuredClone`, bug yang sama kembali lewat pintu lain.
- **Cacat B (kartu 480px): benar dan menyeluruh untuk lebar.** `Renderer.vue:609` memasang
  `container-type: inline-size` pada `.iv-frame`, satu tingkat di luar `.iv-root` (elemen tidak bisa
  menanyai dirinya sendiri), dan `.iv-frame` menerima lebar render dari `PhoneFrame`. Nol `@media`
  berlebar tersisa di `components/invitation/**`. Sesuai DESIGN.md:186.

## 2. Kesesuaian dengan bedah undang.site & template yang diusulkan

Tabel label kolom di `FASE-72.md:141-154` cocok hampir baris per baris dengan `sectionFields`.
Tidak ada berkas data mentah — seluruh hasil bedah hidup sebagai prosa di `FASE-72.md`.

- [-] ~~Galeri: urutan `viewLabel` dan `subtitle` tertukar~~ — **butir ini keliru**, dicoret
  2026-09-22 (fase `74.0`) sesudah halaman terbit referensi dibaca ulang: "LIHAT FOTO" muncul
  empat kali, satu per ubin (`viewLabel`, dirender `Gallery.vue:125`), dan "Two cultures, one
  beautiful story." muncul sekali di bawah grid (`subtitle`, dirender `elegance/Gallery.vue:33`).
  Kodenya benar. Buktinya di `referensi/undang-site/SECTIONS.md`.
- [-] Mempelai dipecah `brideOrder` + `brideParents` (referensi satu textarea) — dipertahankan.
- [-] Galeri `limit: 15` (referensi "Maks 4") — dipertahankan, batas paket kita 15 foto.
- [-] `shareCard` / `tokens.layout` / `background` (rencana menulisnya dalam bahasa Indonesia) —
  dipertahankan, konsisten dengan kontrak lain.
- [-] Migrasi v1→v2 di editor, bukan di server — keputusan sudah direkam `ROADMAP.md:64`.
- [x] **`referensi/undang-site/` dibuat** `74.0` — `INDEX.md`, `SECTIONS.md` (dua belas bagian
  dengan teks terbitnya, dibandingkan baris per baris dengan `createEleganceSections()`),
  `RENDER.md` (referensi melebur 12 bagian jadi enam `<section>`; kita 1:1, dan kenapa),
  `ASSETS.md`. Seluruhnya **teks** — `.gitignore:12-26` menjaga biner `docs/` di luar git, jadi
  11 tangkapan layar pemilik tetap di arsip lokalnya dan `INDEX.md` menyebutkannya seperti pola
  `sources/INDEX.md`.
- [ ] Selisih nyata yang menggantikan butir galeri yang dicoret di atas: urutan kolom galeri di
  `FASE-72.md:120` (`title, eyebrow, subtitle, viewLabel`) tidak konsisten dengan `:310`
  (`Label section, Judul, Label preview foto, Caption`) yang menyebut dirinya "persis, urut".
  Kode mengikuti `:310`, jadi `:120` yang dibetulkan. Angka "Maks 4" sudah dicatat sebaris di
  atas dan tetap dipertahankan.

## 3. P0 — memblokir pelanggan sungguhan

- [x] **3.1 Gerbang desain menolak simpan sesudah migrasi v1→v2.** SELESAI `73.1`. Pasangan tanpa add-on `design`
  membuka editor → dokumen dimigrasi di klien (`editor.vue:103`) → toast menyuruh menyimpan →
  `invitations.service.ts:71` menolak **400 selamanya**, karena `designFingerprint` membaca `order`
  (dua belas id berganti) dan `copy` (dibuang migrator, `sections.ts:552`).
  **Perbaikan: ganti pembandingnya, bukan lewati gerbangnya** — di `hasDesignChange`
  (`invitations.service.ts:266`) bandingkan terhadap `migrateLegacyDocument(oldDocument)` bila
  `oldDocument.schemaVersion !== 2 && next.schemaVersion === 2 && Array.isArray(oldDocument.sections)`.
  Migrasi murni lolos; satu warna/urutan/`textStyles` yang diselundupkan tetap tertangkap; dan
  pembebasannya habis sendiri sesudah tersimpan. `designFingerprint` tidak disentuh, jadi sidik
  jari revisi terbit lama tidak bergeser. Tulis risiko skew versi web↔API di komentar.
  Uji: ~14 kasus di `apps/api/test/domain/design-gate-v2.spec.ts`.
- [x] **3.2 `gift` menyala bawaan tapi bukan fitur paket Mula.** SELESAI `73.2`. `sections.ts:458` `enabled: true`,
  `sectionFeature.gift = 'gift'`, `baseFeatures` (`index.ts:538`) tidak memuatnya → `publish()`
  menolak **setiap undangan baru di paket Mula**. Komentar `sections.ts:48-51` mengklaim sebaliknya.
  **Perbaikan: `enabled: false`** (sama seperti `story`/`rundown`/`dresscode`/`video`), bukan
  memasukkan `gift` ke `baseFeatures` — itu perubahan harga (Mula 279k vs Mekar 449k) dan
  `priceOrder()` akan mulai menolak add-on `gift` yang sah kemarin. Perbaiki komentarnya.
  Uji: invarian di `tests/sections.test.ts` — *setiap bagian `enabled: true` bawaan harus tercakup
  `baseFeatures`*, plus penjaga arah sebaliknya, plus versi untuk hasil migrasi.
- [x] **3.3 Kesetiaan `migrateLegacyDocument`** SELESAI `73.3`. (`sections.ts:496-554`):
  - `enabled` yang hilang: `countdown`, `gallery`, `map`(←`events`), `wishes` (lebur `rsvp ∪ wishes`).
    `closing` berpindah ke wajib — kehilangan yang **dipin tes**, bukan disembunyikan.
  - Musik yang dimatikan ikut terbawa (`:550`): `settings.musicUrl` ditulis tanpa melihat
    `music.enabled` → undangan yang sengaja membisu mulai berbunyi.
  - `day` (`:537`): `str(at('event').data.day, str(akad.date))` tidak pernah kalah, dan bila menang
    ia menulis ISO 24 karakter ke kolom `max: 20` → **dokumen hasil migrasi gagal validasi**.
    Perbaiki sumbernya: `const tanggalIso = str(akad.date, str(countdown.date))`, hapus barisnya.
  - Acara ke-3 → `unduh-mantu` (bagian yang hari ini lahir mati dan berbentuk persis "acara
    tambahan"; fiturnya `events`, aman untuk Mula). Acara ke-4+ = kehilangan yang diakui, dipin tes.
  - Alamat resepsi berbeda (`:530` hanya membawa venue akad) → digabung ke `map.subtitle` (400).
  - `rsvp.deadline` = kehilangan yang dicatat; jangan diselundupkan sebagai kunci passthrough tanpa
    pembaca. Beri komentar di `public.service.ts:38` bahwa endpoint `rsvp` memang 400 pada v2.
  Uji: ~16 kasus di `tests/sections.test.ts`, termasuk `invitationDocumentSchema.safeParse` per
  fixture (batas panjang kolom adalah tempat migrator paling mudah menabrak) dan kemurnian.

## 4. P1 — penjaga supaya dua cacat kemarin tidak kembali

- [x] **4.1 Riwayat keluar dari SFC lalu diuji.** SELESAI `73.4`. `salin/checkpoint/undo/redo` → composable
  `apps/web/composables/useDocumentHistory.ts` (composable, bukan util: `canUndo`/`canRedo` dibaca
  template jadi tumpukannya wajib `ref`). Impor `ref/computed/toRaw` eksplisit dari `'vue'`, jangan
  pakai alias `~/` — `vitest.config.ts` akar tidak punya alias. Bagian murni `reorder` jadi
  `pindahkan()` di `utils/editor-sections.ts` yang sudah punya spec. Pemanggil yang ikut berubah:
  `editor.vue:57-58`, `:108-109`, `:124-144`, `:178-188`, `:597-598`; 19 titik `checkpoint()` tetap;
  `salinOverrides()` **tidak** ikut. Spec baru `apps/web/test/document-history.spec.ts` (11 kasus),
  termasuk reproduksi persis bug kemarin: larik bagian yang ditanami proxy. Koreksi komentar
  `editor.vue:171-177` yang menyiratkan reorder satu-satunya sumber proxy.
- [x] **4.2 Gerbang teks-sumber "nol breakpoint viewport".** SELESAI `73.5`. `apps/web/test/invitation-breakpoints.spec.ts`,
  meniru `motion-rules.spec.ts`. Buang komentar `<!-- -->`, `/* */`, `//` dulu. Larang **hanya**
  `@media` berlebar (`@container (min-width:…)` justru bentuk yang benar di sembilan berkas),
  maafkan `prefers-reduced-motion`, jangan tersandung deklarasi `max-width: 480px`, dan lepaskan
  varian container `@sm:` / `@min-[48rem]:` lewat lookbehind. Lahir hijau. Sekalian `components/ornament`.

## 5. P2 — utang yang dicatat

- [x] **Tinggi pratinjau** SELESAI `74.2`. Akarnya bukan pembacanya melainkan `PhoneFrame` yang
  tidak pernah MENGHITUNG tinggi layar dan tidak menerbitkan satu pun CSS var — sementara
  `DeviceBezel` sudah punya prop `screenHeight` yang tidak pernah dioper siapa pun. Kini
  `previewDevices` menyimpan tinggi viewport perangkat (844/915/800) dan `--iv-layar-h`
  diterbitkan ke dalam undangan. `Gallery.vue:145` sengaja TIDAK ikut: lightbox-nya di-portal ke
  `body`, jadi viewport memang pembandingnya.
- [x] **Sistem `copy` yatim** SELESAI `74.5`. Permukaan form dibuang; `copyDefaults`,
  `resolveCopy`, `pilihCopy` tetap (dipakai `Renderer.vue` dan `CoverGate.vue` untuk render v1).
  Bonus yang tidak terduga: penjaga "label bukan istilah desain" yang ikut terbuang dipindahkan
  ke `sectionFields`, dan langsung menangkap LIMA pelanggaran yang sudah tiga fase lolos
  ("Kicker" x2, "Nama di lightbox", "Placeholder nama/ucapan").
- [x] **Validasi bagian ekstra** SELESAI `74.3`. `sectionExtraSchemas` membatasi panjang dan
  jumlah tanpa memaksa keempatnya jadi `FieldMeta`; `.passthrough()` tetap untuk
  `ornamentOverrides`. `storySides` pindah ke kontrak supaya renderer dan skema tidak berselisih.
- [x] **Penjaga kelengkapan renderer** SELESAI `74.4`. Dua lapis: tipe peta diketatkan jadi
  `Record<Exclude<…>, Component>` (compiler menuntut entrinya) dan `renderer-coverage.spec.ts`
  menjaga arah sebaliknya. Pengecualiannya dibaca dari `headlessSectionTypes` di kontrak.
- [ ] Share-card tidak pernah benar-benar dirender di tes (satori+resvg tak pernah dipanggil; e2e
  hanya memeriksa `href`).
- [x] DESIGN.md menyebut `.iv-frame` sebagai lapisan pengukur di luar `.iv-root` (`73.5`).
- [x] **Pangkas foto** SELESAI `74.6` — **tanpa** `vue-advanced-cropper`. Mesinnya sudah ada di
  `utils/image-normalize.ts`; pustaka luar akan memperkenalkan cara kedua untuk salah pada dua
  jebakan yang sudah dibayar di sana (EXIF potret, PNG saat diminta WebP). Dicatat di
  `docs/DEPENDENCIES.md`.
- [ ] **Ditunda resmi** (ditulis apa adanya, bukan dilupakan): impor Google Sheets (`ImportDialog.vue:111`),
  undang kolaborator (`Toolbar.vue:86`), riwayat versi (`editor.vue:466`), dan `WishCard.vue:13`
  yang masih menangani dua ejaan kehadiran.

  Ditelusuri ulang 2026-09-22 sebagai fase 75, dan keempatnya ternyata berbeda-beda beratnya:

  - [x] **Dua ejaan kehadiran** SELESAI `75.5`. Cabang `yes`/`no` terbukti **tidak pernah bisa
    lahir**: `Wish.attendance` dibuat `20260920000000_wish_attendance` tanpa backfill, penulisnya
    hanya `public.service.ts:102`, dan yang ditulisnya sudah lolos `z.enum(wishAttendances)`.
    Tapi yang diperbaiki bukan cabang matinya — melainkan penampung di ujung keduanya, yang
    mengembalikan "Belum pasti" untuk nilai **apa pun** yang tidak dikenal. Satu ejaan asing
    karena itu tampil sebagai jawaban yang tamunya tidak pernah pilih. Sekarang
    `wishAttendanceLabel` di kontrak, dipakai `WishCard.vue` dan `rsvps.vue`, dan nilai tak
    dikenal tidak dapat lencana sama sekali.
  - [ ] **Riwayat versi** — dikerjakan fase 75; substratnya ternyata sudah ada seluruhnya
    (`PublishedRevision`, snapshot per terbit, tidak pernah dihapus).
  - [ ] **Impor Google Sheets** — backend **sudah selesai** sejak awal; yang kurang hanya Google
    Picker di web, dan itu menuntut konfigurasi Google Cloud milik pemilik. Dipasang di belakang
    env supaya tidak ada tombol yang terlihat hidup lalu gagal.
  - [-] **Undang kolaborator** — tetap ditunda, keputusan pemilik 2026-09-22. `InvitationMember`
    dan `requireInvitationRole` sudah dipakai di seluruh API, tapi `EDITOR`/`VIEWER` tidak bisa
    dicapai sama sekali: nol endpoint, tidak ada `TokenPurpose` untuk undangan, tidak ada email,
    tidak ada UI. Satu fase sendiri, bukan sisa.

## 6. Enam commit fase 72

`git add -p` untuk `invitations.service.ts` dan `contracts/src/api.ts` — isinya terpecah antar-irisan.

1. `Fase 72.0` — `contracts/{sections,fonts,index}.ts`, `document-validation.ts`, cabang v2
   `designFingerprint`, `types/aruna.ts`, `tests/{sections,contracts}.test.ts`, lima spec domain
   API, `FASE-72.md`
2. `Fase 72.1–72.2` — `invitation/elegance/*`, `Text.vue`, `DeviceBezel.vue`, tujuh komponen
   undangan, empat komponen editor, composable + util + spec, `main.css`, `i/[slug].vue`,
   penulisan ulang `editor.vue`
3. `Fase 72.8 + 72.3` — Pustaka Saya, preset palet, musik berlabel
4. `Fase 72.4–72.5` — gaya teks per kolom, form yang digenerate, tab ornamen
5. `Fase 72.6` — Generator dan Ucapan, termasuk dua migrasi Prisma
6. `Fase 72.7` — kartu bagikan, e2e, ROADMAP, CHANGELOG

**Jujur soal hijau:** hanya commit terakhir hijau di ketiga suite. 72.0 typecheck-merah (`apps/web`
masih merender v1 sementara `types/aruna.ts` sudah v2) dan 72.1–72.2 unit-merah (spec lama + e2e
menyusul) tidak bisa dihindari tanpa satu commit raksasa. Sebutkan di pesan commit berkas mana yang
menyusul. `pnpm test && pnpm typecheck` hijau di HEAD.

## 6c. Yang sudah dikerjakan 2026-09-22 (fase 74)

**Bagian B — sisa fase 73.** `74.0` referensi undang.site jadi teks + koreksi butir galeri ·
`74.1` proxy berhenti ditanam di enam situs · `74.2` tinggi pratinjau lepas dari jendela editor ·
`74.3` batas struktur berulang bagian ekstra · `74.4` penjaga kelengkapan renderer · `74.5` `copy`
yatim dibuang + lima label istilah desain · `74.6` pangkas foto tanpa dependensi baru ·
`74.7` `test:integration` diperbaiki sehingga e2e akhirnya berjalan.

**Bagian A — template jadi struktural.** `74.8` registry `structures.ts`; v1 berhenti jadi
pengecualian dan jadi struktur `warisan` yang pensiun · `74.9` `themeId` + `structureId` opsional
di akar dokumen, tanpa `schemaVersion: 3` · `74.10` renderer memilih keluarga komponen dari
struktur, bukan dari `schemaVersion` · `74.11` `restructureDocument` + sidik jari dua sumbu +
gerbang desain · `74.12` `/order` dan editor.

Terukur: `pnpm test` **1323 hijau** (dari 1241), typecheck dan lint bersih, `test:integration`
49 hijau, dan seluruh suite e2e di empat project **197 lulus · 1 merah · 6 dilewati**. Angka itu
identik dengan pengukuran sebelum bagian A dikerjakan — pemisahan dua sumbu tidak membawa satu
pun regresi e2e. Satu-satunya yang merah adalah utang lama di §6d.

**Yang dijawab untuk pertanyaan "pastikan ada template yg baru":** "Wedding Elegance" kini record
template yang membawa dua belas bagiannya sendiri (daftar, urutan, wajib, lahir-menyala, keluarga
komponen), bukan struktur yang tertanam di skema. Pemilihnya di `/order` dan editor sudah ada
tapi dirender `v-if` terhadap jumlah struktur hidup, jadi **belum tampil** selama baru ada satu.
Keduanya dibuktikan muncul dan bekerja dengan menyetel `warisan` hidup sementara (`74.12`).

## 6b. Yang sudah dikerjakan 2026-09-21

`73.1` gerbang migrasi · `73.2` hadiah lahir mati + invarian paket · `73.3` kesetiaan migrator ·
`73.4` riwayat undo jadi composable yang diuji · `73.5` gerbang breakpoint + DESIGN.md.

Terukur sesudahnya: `pnpm test` **1241 hijau** (dari 1201), `pnpm typecheck` dan `pnpm lint`
bersih. Kedua penjaga baru dibuktikan bisa merah: `salinDokumen` dikembalikan ke `structuredClone`
→ tiga kasus gagal; satu `md:grid-cols-2` di `elegance/Hero.vue` → gerbang breakpoint gagal.
Keduanya dikembalikan. `/i/demo` dirender lewat `web-demo` dan bagian Hadiah tetap muncul.

**Belum diverifikasi: e2e.** `pnpm test:integration` + `pnpm test:e2e` menuntut Postgres, Redis,
dan API hidup; di laptop ini port 3001 mati dan Docker tidak menjawab. Itu sisa verifikasi paling
penting — tanpanya 21 tes dasbor lolos tanpa pernah berjalan.

> **Koreksi 2026-09-22 (fase 74.7).** Paragraf di atas keliru dan dibiarkan berdiri supaya
> salahnya terbaca. Docker tidak pernah dibutuhkan: `pnpm demo` menyalakan Postgres tertanam,
> SMTP, API, dan web tanpa Docker. Yang benar-benar memblokir adalah **`pnpm test:integration`
> yang rusak sejak fase 72** — skripnya masih menguji `/rsvp`, yang menolak setiap dokumen v2
> dengan sengaja, jadi ia berhenti sebelum menulis `.data/qa-account.json`. Tanpa fixture itu,
> 21 tes dasbor `test.skip` sendiri di mesin MANA PUN, termasuk CI. Sesudah diperbaiki: 49
> pemeriksaan integrasi hijau, e2e desktop 51/51 hijau dengan dashboard yang benar-benar
> berjalan.

## 6d. Satu e2e merah yang BUKAN dari fase 74, dan sudah dilokalisasi

`[mobile] signed-in editor and guest management use persisted data` (`dashboard.spec.ts:156`)
gagal di `scrollWidth <= innerWidth`: **364 vs 360**, konsisten, bukan flake.

**Bukan regresi fase 74.** Diuji dengan menjalankan tes yang sama pada worktree `d3a4ffb`
(fase 73.6, sebelum satu pun commit fase 74) — gagal dengan angka yang persis sama.

Yang sudah diketahui, supaya sesi berikutnya tidak mengulang penelusurannya:

- Hanya muncul **sesudah editor dikunjungi lebih dulu**. Membuka `/dashboard/<id>/guests`
  langsung: `scrollWidth === innerWidth`, lolos.
- Bukan tabel lebarnya: `table.min-w-[52rem]` (853px) ada di dalam `.table-wrap`
  ber-`overflow-x: auto` dan memang terpotong — `scrollWidth` berhenti di 364, bukan 853.
- Akarnya **jalur grid di wadah halaman**: `div.mx-auto.grid.w-full.px-5` lebarnya 360 dengan
  padding 20px, jadi kolomnya seharusnya 320 — terukur **`grid-template-columns: 343.781px`**.
  Tiga dari empat anaknya ber-`min-width: auto` (HEADER dan dua SECTION), jadi salah satunya
  menyumbang min-content 343,78.
- Bukan isi HEADER: min-content anak-anaknya 91 · 183 · 81 · 69, semuanya jauh di bawah 320.
  Jadi tersangkanya salah satu `SECTION`.
- Obatnya kemungkinan besar idiom yang sudah dipakai repo ini (`minmax(0,1fr)` / `min-w-0` di
  tiap tingkat, memori `editor-studio-fase62`), tapi **belum dipasang**: ia halaman Generator,
  di luar lingkup fase 74, dan mengubah tata letak tanpa bisa melihat layarnya adalah cara
  membuat cacat kedua.

> **SELESAI `75.3`, dan tebakan tersangkanya meleset.** Idiomnya benar, tersangkanya salah.
> Bukan kelompok pil filter status — min-content-nya 302,77, di bawah jatah 320. Yang melar
> **`section.card` milik Composer**, min-content **347,13**, dan rantainya terukur penuh:
> `#share-live-banner` (305,13) → `+ p-5` (40) → kolom grid `auto` → `+ px-5` halaman (20) →
> `document.scrollWidth` **367** lawan `innerWidth` 360 di Chromium headless.
>
> Dan peringatan "cacat kedua" di paragraf atas terbukti tepat. `minmax(0,1fr)` di
> `DashboardShell` **memang** membuat `scrollWidth` jadi 360 — tesnya hijau — tapi kartunya lalu
> memotong isinya sendiri: `scrollWidth` 325 lawan `clientWidth` 318. Halaman berhenti melar,
> URL-nya yang hilang 7px. Kalau diukur hanya dengan angka yang dipin tes, perbaikan itu terlihat
> selesai.
>
> Akar sebenarnya: `#share-live-banner` memuat URL ber-`truncate`, dan `truncate` cuma bisa
> memotong kalau wadahnya boleh menyusut — sebagai item grid ber-`min-width: auto`, banner itu
> justru memaksa kartunya selebar URL utuh. `grid-cols-[minmax(0,1fr)]` pada kartu Composer
> mengembalikan pekerjaan itu ke `truncate`: banner 305,13 → 278, kartu 325 → 318, nol
> pemotongan. **Itu obatnya**, dan sendirian ia sudah membuat keempat project hijau.
>
> `minmax(0,1fr)` di `DashboardShell` tetap dipasang, tapi jujur tentang perannya: ia bukan yang
> menyembuhkan kasus ini melainkan penjaga kelas — ia menahan min-content anak mana pun sampai ke
> tepi halaman, untuk setiap halaman dasbor bervarian `page`, bukan cuma yang ini.
>
> Terukur sesudahnya: 360 dan 375, `scrollWidth === innerWidth` di editor maupun Generator, nol
> elemen terpotong. `[mobile] [tablet] [desktop] [safari]` keempatnya lulus.

## 7. Verifikasi

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test:integration && pnpm test:e2e --project=desktop
```

- `pnpm test` naik dari 1201: +14 (gerbang v2) +16 (migrator) +11 (riwayat) +~35 (gerbang
  breakpoint `it.each`) +2 (invarian paket).
- Kedua penjaga baru **harus terbukti bisa merah**: kembalikan `salin()` ke `structuredClone` →
  `document-history.spec.ts` merah; tulis `md:grid-cols-2` di `elegance/Hero.vue` →
  `invitation-breakpoints.spec.ts` merah. Kembalikan lagi.
- §3.1 manual di stack owner 3000: undangan v1, entitlement `design` dicabut → Simpan **200**;
  ganti satu warna lalu Simpan → **400**.
- §3.2: `POST /invitations` di akun paket Mula → Publikasikan → 200.
- Tanpa `pnpm test:integration`, 21 tes dasbor **lolos tanpa pernah berjalan** (`test.skip(!account)`),
  termasuk kedua penjaga cacat kemarin.
