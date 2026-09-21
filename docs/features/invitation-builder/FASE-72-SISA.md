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

- [ ] Tinggi pratinjau berbohong: `100svh`/`92svh`/`82svh` di `elegance/Hero.vue:28`,
  `sections/Cover.vue:34`, `CoverGate.vue:357`, `Gallery.vue:145` membaca jendela editor, bukan
  bezel. Butuh tinggi bingkai lewat CSS var dari `PhoneFrame`; `@container` saja tidak cukup.
- [ ] Sistem `copy` yatim: `copyGroups`/`copyGroupsFor`/`copyKeysFor` di `utils/invitation-copy.ts`
  tidak punya konsumen selain spec-nya sendiri (13 tes). `copySchema` + `kanonikCopy` **wajib tetap**
  (dokumen v1 masih sah dan sidik jarinya membacanya).
- [ ] Validasi bagian ekstra: `sectionFields` tidak memuat `steps`/`items`/`attire`/`colors` yang
  justru disunting `ExtrasForm`; `sectionDataSchema()` `.passthrough()` melepasnya tanpa batas.
- [ ] Penjaga kelengkapan renderer: `Renderer.vue:145` membuang tipe tanpa komponen **diam-diam**.
- [ ] Share-card tidak pernah benar-benar dirender di tes (satori+resvg tak pernah dipanggil; e2e
  hanya memeriksa `href`).
- [x] DESIGN.md menyebut `.iv-frame` sebagai lapisan pengukur di luar `.iv-root` (`73.5`).
- [ ] **Ditunda resmi** (ditulis apa adanya, bukan dilupakan): pangkas foto di Pustaka
  (`FASE-72.md:488` meminta `vue-advanced-cropper`), impor Google Sheets (`ImportDialog.vue:111`),
  undang kolaborator (`Toolbar.vue:86`), riwayat versi (`editor.vue:466`), dan `WishCard.vue:13`
  yang masih menangani dua ejaan kehadiran.

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
