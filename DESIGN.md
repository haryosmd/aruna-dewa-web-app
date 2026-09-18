# Aruna Dewa — Design System

Satu-satunya sumber kebenaran untuk desain visual. Menggantikan `docs/features/landing-order/UI-BRIDGE.md`.

## Positioning

Undangan pernikahan digital premium Indonesia. Audiens 24–34 tahun, **mobile-first** (mayoritas tamu membuka dari WhatsApp di HP). Nada: hangat, personal, berkelas — bukan korporat, bukan norak, bukan template gratisan.

Dua dunia visual yang sengaja dibedakan:

| Dunia | Karakter | Dasar |
|---|---|---|
| **Aplikasi** (landing, order, auth, dashboard) | Terang, lapang, tegas, cepat dibaca. Putih murni. | `--color-surface: #FFFFFF` |
| **Undangan** (`/i/[slug]`) | Hangat, seremonial, berornamen. Palet milik pasangan. | token tema (`document.tokens`) |

Aplikasi tidak boleh mewarisi palet undangan, dan sebaliknya. Ini pemisahan yang dulu rusak: blok RSVP memakai cream landing di atas undangan bertema.

---

## Token aplikasi

Didefinisikan di `apps/web/assets/css/main.css` dalam blok `@theme` (Tailwind v4). Jangan pernah menulis hex mentah di komponen.

### Warna

```
surface          #FFFFFF   latar utama
surface-2        #FBF9F6   panel/kartu bertingkat
surface-3        #F4EFE8   band section bernuansa pasir
surface-inverse  #17110D   section gelap

ink              #17110D   teks utama            19.0:1 di putih
ink-muted        #6B5B52   teks pendukung         6.4:1 di putih
ink-subtle       #7D6E64   metadata, caption      4.9:1 di putih
ink-inverse      #FBF9F6   teks di surface gelap

primary          #B4472A   terracotta, CTA        5.4:1 dua arah
primary-strong   #8E3319   hover/pressed          8.0:1 dengan putih
primary-soft     #FCEFE9   latar tint
gold             #C08A2E   badge, ornamen         6.2:1 dengan ink (teks di atas emas WAJIB ink)
gold-soft        #FBF2E0
sage             #46756C   aksen sekunder         5.2:1 dengan putih
sage-soft        #EDF3F1

success          #1F7A4D
danger           #B3261E   6.5:1 dua arah
warning          #8A5A00

border           #E7DED4   hairline dekoratif (tidak pernah jadi satu-satunya penanda)
border-strong    #C9BCB0   pemisah struktural
border-input     #8E7F72   batas kontrol form     3.9:1 — lolos ambang komponen UI 3:1
ring             #B4472A   focus ring, offset 3px
```

Diverifikasi dengan `python3 scripts/contrast-check.py <fg> <bg>` pada 2026-09-11:

| Pasangan | Rasio | Ambang |
|---|---:|---|
| ink / putih | 18,71:1 | teks 4,5 ✓ |
| ink-muted / putih | 6,47:1 | teks 4,5 ✓ |
| ink-subtle / putih | 4,90:1 | teks 4,5 ✓ |
| primary / putih | 5,42:1 | teks 4,5 ✓ |
| putih / primary-strong | 7,96:1 | teks 4,5 ✓ |
| ink / gold | 6,16:1 | teks 4,5 ✓ — teks di atas emas **wajib** ink, bukan putih (putih hanya 3,04:1) |
| putih / sage | 5,22:1 | teks 4,5 ✓ |
| danger / putih | 6,54:1 | teks 4,5 ✓ |
| ink-inverse / ink | 17,80:1 | teks 4,5 ✓ |
| border-input / putih | 3,87:1 | komponen UI 3,0 ✓ (bukan teks) |

Jalankan ulang skrip setelah mengubah palet. Axe (`wcag2a`, `wcag2aa`, `wcag21aa`) dijalankan di
Playwright pada landing, undangan (**setiap tema**), dan halaman auth di tiga viewport — wajib nol violation.

Palet undangan diverifikasi terpisah pada 2026-09-12, empat pasangan per tema: `fg/bg`, `primary/bg`,
`primary` di atas tone `tint` (`color-mix(primary 9%, bg)` — pasangan paling ketat dan yang paling sering
terlewat), dan `#FFFDF7` di atas `primary`. Terendah dari keenam tema adalah 4,79:1 (`aruna-lumine`
`primary/tint`). `accent` **tidak pernah menjadi teks** — hanya `.iv-band` ber-`aria-hidden`.

Keempat pasangan itu sekarang juga dihitung **runtime** oleh `apps/web/utils/contrast.ts`, sumber tunggal
untuk penjaga kontras di editor. `tests/contrast.test.ts` menegakkan bahwa keenam preset lolos, jadi preset
yang diubah tanpa audit ulang akan menggagalkan `pnpm test`, bukan diam-diam terbit.

Warna merek bank (teks di atas pita kepala kartu), diverifikasi dengan skrip yang sama:

| Bank | Merek | Teks | Rasio |
|---|---|---|---:|
| BCA | `#0060AF` | putih | 6,38:1 |
| Mandiri | `#003D79` | putih | 10,80:1 |
| BRI | `#00529C` | putih | 7,82:1 |
| BSI | `#00A39D` | ink | 5,99:1 |
| Jago | `#F26F21` | ink | 6,30:1 |
| Jenius SMBC | `#00A9E0` | ink | 6,91:1 |
| Seabank | `#EE4D2D` | ink | 5,11:1 |
| Bank lain | `#5B4B41` | putih | 8,31:1 |

### Tipografi

Dimuat lewat modul `@nuxt/fonts` (self-host otomatis, nol CLS). Tidak ada `@fontsource` manual lagi.

**Keluarga yang dipilih saat runtime WAJIB `global: true` di `nuxt.config.ts` (2026-09-17).**
Pemindai `@nuxt/fonts` membaca CSS, bukan JavaScript. Nama keluarga di `fontStacks`
(`utils/theme.ts`) hanya muncul sebagai string JS lalu disuntikkan sebagai `--iv-display`,
jadi pemindai tidak pernah melihatnya dipakai dan tidak menulis satu pun `@font-face`.
Akibatnya diam dan mahal: pasangan memilih Italiana di dasbor, dan yang dirender Georgia.
Terukur pada build 2026-09-17 — hanya Fraunces, Plus Jakarta Sans, dan Cormorant Garamond
punya `@font-face`, karena hanya ketiganya yang dipakai lewat `font-family: var(--font-…)`
di `main.css`; `Italiana`, `Jost`, `Instrument Serif`, dan `Parisienne` tidak punya satu pun,
dan `.nuxt/nuxt-fonts-global.css` berukuran 0 byte. Setelah `global: true`, kedelapan keluarga
punya face dan lolos `document.fonts.check()` di build produksi.

Ini murah: `@font-face` tidak mengunduh apa pun sampai ada glif yang benar-benar dirender.
Yang bertambah beberapa KB CSS, bukan berkas fontnya.

- **Display — Fraunces** (variable, sumbu `SOFT`/`WONK`). Serif editorial yang terasa digambar tangan. Heading landing & dashboard. Selalu `letter-spacing` negatif pada ukuran besar.
- **UI/Body — Plus Jakarta Sans** (variable). Dirancang untuk Jakarta; terasa lokal tanpa jadi kampungan. Semua body, kontrol, nav, tabel.
- Font tema undangan dideklarasikan per tema (lihat di bawah), tidak memakai dua di atas kecuali tema memilihnya.
- **Lima script masuk daftar pilihan pada 2026-09-17**, dicari sebagai padanan gratis untuk Amoresa (font berbayar, tidak dipakai): **Charm** (OFL, Cadson Demak — serif kaligrafis, satu-satunya dengan bobot 700 nyata, paling terbaca), **Great Vibes** (paling dekat ke Amoresa), **Pinyon Script** (paling formal, goresan tipisnya paling rapuh di ponsel), **Allura**, dan **Parisienne** — yang sudah ada di repo sebagai aksen nama dan ternyata tidak pernah ditawarkan ke pasangan.

  Keempatnya selain Charm **hanya punya bobot 400**, jadi semuanya dipatok 400 di `displayWeights`. Tanpa itu permintaan 600 membuat browser menebalkan sendiri, dan bold sintetis memutus sambungan huruf script. Charm ikut dipatok 400 karena 700-nya terbaca gemuk, bukan tegas.

  `tokens.font` hanya mengendalikan **huruf judul** (`--iv-display`); huruf body datang dari `themePresentation.body`. Jadi aturan "script tidak pernah untuk paragraf atau navigasi" tidak bisa dilanggar lewat pemilih ini.

**Subset tidak bisa dibatasi lewat konfigurasi `@nuxt/fonts` (diuji 2026-09-17, gagal).** `subsets` per-keluarga maupun `defaults.subsets` diterima TypeScript — keduanya ada di tipenya — tapi keluaran build identik byte-per-byte dengan tanpa keduanya, dan `unicode-range` Thai milik Charm tetap tertulis. Konsekuensinya seluruh subset tiap keluarga ikut ke CSS: **60 KB `@font-face` di `entry.css` yang 129 KB**. Tidak ada yang diunduh kalau glifnya tidak dipakai, jadi ini biaya CSS, bukan biaya font — tapi angkanya cukup besar untuk jadi pekerjaan tersendiri, dan jalurnya menyaring di `providers/google-woff2.ts`, bukan memasang ulang opsi yang terbukti mati.

Skala fluid (`clamp`, 7 langkah): `display-1 · display-2 · h1 · h2 · h3 · body-lg · body · caption`.
Body minimal 16px. Heading pakai `text-balance`, paragraf pakai `text-pretty`. Script/handwriting tidak pernah untuk paragraf atau navigasi.

### Skala lain

- **Spacing** basis 4px, 13 langkah (`0 1 2 3 4 5 6 8 10 12 16 20 24` → `0–96px`).
- **Radius** `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · full`. Form 10–12px, kartu 16–24px.
- **Shadow** 5 tingkat: `hairline · lift · float · veil · glow-primary`. Warna bayangan berbasis ink hangat (`rgb(23 17 13 / …)`), bukan hitam netral.
- **Easing** `--ease-out-expo`, `--ease-out-quart`, `--ease-spring`, `--ease-in-out-soft`.
- **Durasi** `120 · 200 · 320 · 520 · 840ms`.
- **Z-index** `base 0 · raised 10 · sticky 20 · dock 30 · overlay 40 · modal 50 · toast 60`.
- **Container** maks 1280px; gutter 20 / 32 / 48px. Ruang section 64px mobile → 112px desktop.
- **Lebar konten dasbor** dua tingkat, lewat prop `width` di `DashboardShell`. `reading` (1024px)
  untuk layar yang dibaca — ringkasan, tamu, RSVP, pesanan; `wide` (1536px) untuk layar yang
  dikerjakan, sejauh ini cuma editor. Satu angka untuk semuanya selalu salah di salah satu sisi:
  1024px membuat kolom pengaturan editor tinggal 312px, 1536px membuat tabel tamu jadi baris
  sepanjang layar.

**Panel yang lebarnya datang dari jalur grid memakai container query, bukan breakpoint viewport.**

Ini aturan, bukan preferensi. `sm:grid-cols-2` bertanya pada lebar layar; panel di dalam jalur
grid tidak tahu apa-apa soal lebar layar. Editor pernah menjalankan `sm:grid-cols-3` di dalam
kolom selebar 312px pada viewport 1440 — benar menurut breakpoint-nya, dan menghasilkan kartu
tema selebar 80px serta `input[type=date]` selebar 128px. Pasang `@container` pada panelnya lalu
pakai `@xs:` / `@sm:` / `@lg:` di dalamnya; ambangnya **diukur dari lebar jalur yang sebenarnya**,
bukan ditaksir. Ukur di beberapa lebar sekaligus: jalur bermaksimum (`minmax(16rem,19rem)`)
mengambil jatahnya lebih dulu, jadi kolom `1fr` bisa lebih sempit di 1280 daripada di 1024, dan
ambang yang dipilih dari satu lebar saja akan membuat layar yang lebih besar terasa lebih sempit.

**Undangannya sendiri sepenuhnya container query — nol breakpoint viewport.** `OrnamentField`
memakai `cqw`, tipografinya `clamp()`, dan `.iv-root` adalah `container-type: inline-size`, jadi
lima utilitas `md:`/`sm:` terakhir (cover split, padding section, jarak hitung mundur) diukur
dari lebar undangan, bukan lebar layar. Ambangnya tetap 640/768px lewat `@min-[40rem]:` dan
`@min-[48rem]:` — di halaman publik `.iv-root` selebar viewport, jadi yang dilihat tamu tidak
bergeser sedikit pun. Yang berubah adalah undangan itu bisa dirender di lebar berapa pun dan
tetap jujur, dan **itulah yang membuat pratinjau perangkat di editor bukan sekadar zoom**:
render 390px berperilaku seperti ponsel 390px, termasuk cover yang menumpuk alih-alih membelah.
Jangan pernah kembalikan salah satunya ke `md:` — di editor pada layar 1440, `md:` selalu benar,
dan pratinjau "Ponsel" akan menampilkan tata letak yang tidak akan pernah dilihat tamu.

---

## Motion

GSAP 3.13 — sejak versi ini **semua plugin premium gratis**. Manfaatkan; ini pembeda utama dari kompetitor.

Tabel di bawah adalah yang **benar-benar terpasang**. Plugin lain boleh ditambahkan, tapi jangan
mencantumkannya di sini sebelum ada kode yang memakainya.

| Efek | Plugin | Dipakai di |
|---|---|---|
| Reveal headline per-baris bermasker | `SplitText` | hero, heading section landing |
| Ornamen tergambar saat scroll | `DrawSVGPlugin` | **hanya** detail bertanda `data-draw`; bentuk berisi tidak bisa |
| Ornamen bermassa mekar dari jangkarnya | `bloomIn` | keping `bloom`/`crown`/`swag` di `OrnamentField` |
| Ornamen jatuh dan bergoyang dari tepi atas | `cascadeIn` | keping `cascade`, ronce melati |
| Koreografi satu section: heading → foto → ornamen | `orchestrate` | tiap section undangan |
| Titik menyusuri path mengikuti scrub | `MotionPathPlugin` lewat `travelPath` | rel "cerita kami" |
| Fade-and-rise saat masuk viewport | `ScrollTrigger` | landing dan undangan |
| Parallax foto | `ScrollTrigger` | cover undangan, hero landing |
| Langkah scrub horizontal ter-pin | `ScrollTrigger` pin | "Cara kerja" |
| Mockup dasbor ter-pin, layar berganti saat scroll | `ScrollTrigger` pin + scrub | case-study dasbor di landing |
| Galeri sorot: satu foto per hentakan scroll | `ScrollTrigger` pin + scrub | galeri undangan, gaya `satu-per-satu` |
| Angka menggulung | counter kustom | statistik landing |
| Amplop terbuka | timeline lewat `useArunaTimeline()` | cover gate undangan |
| Tile galeri muncul berselang | `ScrollTrigger` + `parallax` | galeri undangan |
| Rel timeline tumbuh saat scroll | `ScrollTrigger` scrub | rundown undangan |

Hitung mundur sengaja **tidak** memakai counter: angkanya berdetak tiap detik lewat state reaktif,
dan animasi yang menulis `textContent` akan berebut dengan render Vue.

Aturan:
0. **Tidak pernah `once: true`.** ScrollTrigger dengan `once` membunuh dirinya sendiri saat
   menyala, jadi elemen yang sudah berada di viewport ketika halaman mount menghapus diri
   dari daftar trigger global tepat ketika trigger berikutnya sedang menyusuri daftar itu.
   `ScrollTrigger.init()` membaca `_triggers[i].end` tanpa penjaga null, sehingga satu lubang
   membuat **seluruh** motion halaman itu gagal dipasang — gejalanya hanya muncul pada
   navigasi klien, dan sempat lolos dari tes. Pakai `toggleActions: 'play none none none'`.
1. Semua animasi lewat `useArunaMotion()`; tidak ada `gsap.*` liar di komponen.
2. `prefers-reduced-motion: reduce` → semua timeline langsung ke keadaan akhir. Konten wajib tetap utuh dan bisa dipakai. Diuji di Playwright.
3. Animasi tidak pernah menunda konten kritis. Tanpa JS, halaman tetap terbaca penuh (state awal terlihat, bukan `opacity: 0`).
4. Motion melayani makna: mengungkap hierarki, menunjukkan perubahan state, memberi ritme. Bukan hiasan berkedip.
5. Foto tidak pernah "maju-mundur": skala masuk maksimal `1.06` dengan ease landai, dan parallax
   undangan maksimal `distance: 40`. Angka yang lebih besar terbaca sebagai jentakan, bukan kedalaman.
6. Ornamen yang membingkai sebuah foto dianimasikan dalam rentang scroll yang sama dengan fotonya,
   bukan sebagai gerakan kedua yang berdiri sendiri.
7. `drawSvg` memakai `<svg>` pemiliknya sebagai trigger, **tidak pernah** satu `<path>`.
   Sebuah path bukan kotak layout: rect-nya bisa nol, dan ScrollTrigger ber-`end` nol memicu
   `refresh()` rekursif yang menggagalkan pemasangan.
8. Efek yang memaku halaman (`pin`) wajib punya keadaan istirahat yang terbaca penuh tanpa JS.
   Galeri sorot runtuh jadi tumpukan biasa; case-study dasbor runtuh jadi daftar tegak.
9. **Gerakan masuk tidak boleh menyembunyikan apa yang sudah terbaca.** Aturan 3 melarang
   `opacity: 0` di CSS, jadi teks SSR sudah dicat sebelum modul motion tiba — dan `revealText`
   menyembunyikannya lagi untuk memasukkannya kembali. Kalau modulnya tiba dalam beberapa frame
   itu terbaca sebagai satu gerakan; kalau terlambat, yang terlihat adalah judul yang hilang lalu
   datang lagi, dan di landing judul itu elemen LCP. `useArunaMotion()` karena itu melewati
   gerakan masuk seketika kalau modul motion butuh lebih dari 200ms. Reveal ber-`trigger` tidak
   kena aturan ini: elemen di bawah lipatan belum pernah terlihat.

---

## Komponen

`apps/web/components/ui/` — dibangun di atas `reka-ui` (headless, sudah ada), varian dengan `cva` + `tailwind-merge`.

`Button` `Field` `Input` `Textarea` `Select` `Checkbox` `RadioCard` `Card` `Badge` `Dialog` `Accordion` `Carousel` `Tabs` `Stepper` `Skeleton` `Tooltip`.

Aturan wajib:
- Target sentuh minimal **44×44px**.
- Focus terlihat: `outline: 3px solid var(--color-ring)`, `outline-offset: 3px`. Tidak pernah `outline: none` tanpa pengganti.
- Setiap ikon dari library: **lucide** untuk UI, **@iconify** untuk logo brand (Google, WhatsApp). **Dilarang** memakai karakter teks sebagai ikon (`✓ ↑ ↓ ● ○ ×`).
- Setiap kontrol form punya `<label>` terkait, `aria-invalid`, dan pesan galat ber-`role="alert"` yang terhubung lewat `aria-describedby`.
- Tombol OAuth memakai logo resmi provider, tinggi 48px, di halaman login **dan** register.

### Popup (`AtomicPopup`)

Satu popup untuk seluruh aplikasi, dipasang sekali di `app.vue` — bukan di layout, karena editor
undangan memakai `layout: false` dan justru di sanalah ia paling dibutuhkan. Halaman tidak pernah
menyentuh store-nya: `usePopup()` adalah satu-satunya permukaan, dan `await`-nya menghasilkan `id`
aksi yang dipilih.

- **`window.confirm` dilarang.** Ia tidak mengenal satu pun token kita, tidak bisa menaruh tiga
  pilihan, dan tidak bisa membedakan "tinggalkan halaman" dari "buang perubahan".
- **Daftar aksi, bukan ya/tidak.** Pertanyaan yang taruhannya pekerjaan orang hampir selalu punya
  tiga jalan keluar, dan yang ketiga adalah "kembali".
- **Aksi pertama mendapat fokus awal**, bukan tombol silang — kalau tidak, Enter membatalkan
  pertanyaannya. Aksi pertama juga yang dipakai saat `tone` tidak ditentukan (`primary`).
- **Escape, klik overlay, dan tombol silang berarti hal yang sama**, dan jawabannya ditentukan
  pemanggil lewat `dismissId`. Untuk tindakan yang membuang pekerjaan, `dismissId` menunjuk aksi
  yang **aman**, bukan yang merusak.
- Fondasinya primitif `Dialog*` reka-ui: jebakan fokus, `aria-modal`, kunci gulir badan, dan
  pengembalian fokus ke pemicunya. Dialog buatan sendiri di atas `<div>` adalah cara paling umum
  membuat sapuan axe merah.
- Z-index mengikuti tabel di atas: overlay `40`, isi `50`. Tombolnya menumpuk di ponsel dan
  berjajar di layar lebar — tiga pilihan berjajar di 390px memaksa labelnya jadi satu kata, dan
  "Tinggalkan" yang dipendekkan jadi "Buang" adalah cara yang bagus untuk kehilangan pekerjaan
  orang.

---

## Tema undangan

**Id yang diterima schema dipisah dari id yang bisa dipilih.** `templateIds` **hanya tumbuh** —
ia satu-satunya sumber `z.enum(templateIds)`, jadi mencabut sebuah id dari sana membuat tiap draft
dan tiap revisi terbit yang memakainya gagal divalidasi, termasuk undangan yang sedang dibaca tamu.
Yang dicabut saat sebuah tema dipensiunkan adalah keanggotaannya di `liveTemplateIds`, ditambah
satu entri di `templateAliases` yang menunjuk penggantinya. Tipe aliasnya
`Record<Exclude<TemplateId, LiveTemplateId>, LiveTemplateId>`, jadi compiler **menuntut** alias
ditulis begitu sebuah id dipensiunkan — tidak mungkin ada id pensiun yang tidak punya tujuan.
Bentuknya menyalin preseden `fontChoices` versus `selectableFonts` di berkas yang sama.

`resolveTemplateId()` adalah satu-satunya penerjemah, dan ia dipanggil di dalam `themeOf()` —
bukan di pemanggilnya — supaya tidak ada jalur render yang bisa menerima id pensiun tanpa
melewatinya. Pelanggaran pertama aturan itu ditemukan dalam hitungan menit: `pages/i/[slug].vue`
mengukur `?tema=` terhadap `templateIds` lalu mencarinya di `invitationThemes` dengan non-null
assertion, jadi `?tema=aruna-sogan` menjawab **500**.

**Set ornamen tema pensiun tidak ikut dihapus**, dan itu bukan kesentimentilan. `bacaTema()` di
`scripts/ornament-forge/verify.mjs` membangun peta kepemilikan glyph dari `theme.ts`, lalu
`gerbangKeunikan` melewati glyph tanpa pemilik **diam-diam**. Menghapus delapan tema akan
menurunkan cakupannya dari 54 slot ke 6 sambil tetap melaporkan "0 pelanggaran" — hijau, dan tidak
berarti apa-apa. Terukur pada bentuk yang sengaja dirusak: gerbang lama melaporkan
`tema: 1 · pelanggaran keunikan: 0 · tema tidak kohesif: 0`, dan hanya penjaga cakupan di
`ornament-quality.spec.ts` yang merah. Set mereka karena itu tinggal di `ornamenPensiun` dengan
bentuk blok yang sama, dan parameternya di `temaPensiun` pada resep forge.

**Varian ornamen terkurasi.** Pasangan bisa menukar bingkai, pemisah, sudut, dan segel lewat panel
"Ornamen" di editor. Yang ditawarkan bukan 132 ornamen melainkan beberapa alternatif seresep —
alasan yang sama yang dipakai untuk menolak color picker bebas: pemilih bebas penuh mengubah lima
tema jadi satu tema dengan lima nilai awal. **Syarat keanggotaan kolam adalah ketebalan garis yang
sama dengan tema induknya**, karena itulah yang diukur `gerbangKohesi`; `ornament-variants.spec.ts`
mengukur ulang tiap kandidat lewat mesin gerbang yang sama, jadi kolam yang salah tidak bisa lolos
hanya karena daftarnya terlihat masuk akal. Pilihannya hidup di `cover.data.ornamentOverrides`,
**bukan** di `tokens`, jadi ia lolos `hasDesignChange()` dan tidak menyentuh
`invitationDocumentSchema` sama sekali. Ubin pratinjaunya mengikuti `ratio` tiap glyph: ubin
persegi membuat kelima pemisah berasio 8:1 terbaca sebagai garis tipis yang sama persis, dan
pasangan tidak bisa memilih bentuk yang tidak bisa ia bedakan.

`templateId` adalah `z.enum(templateIds)` di `packages/contracts`, dan kontraknya sengaja tipis:
tiga warna plus satu font. Sisa identitas tema hidup di lapisan web, pada `themePresentation` di
`apps/web/utils/theme.ts` — pasangan font, foto cover, aksen kaligrafi, dan **set ornamen** yang
menentukan bingkai, pemisah, sudut, floral, motif, simbol, dan monogram milik tema itu.
Renderer membaca set tersebut lewat `themeOrnaments()`, jadi mengganti tema mengubah wajah
undangan, bukan hanya paletnya. Tidak ada direktori layout per tema; satu renderer melayani semuanya.

| Tema | Mood | bg / fg / primary / accent | Font | Galeri |
|---|---|---|---|---|
| **aruna-bloom** | Botanical ivory, hangat, klasik | `#FBF6EE` / `#241A14` / `#A93F23` / `#7A8B6F` | Cormorant Garamond + Plus Jakarta Sans | masonry |
| **aruna-wastra** | Etnik modern: motif diabstraksi jadi bidang besar | `#F3EDE3` / `#20191A` / `#7E3B2C` / `#3E5C57` | Fraunces + Plus Jakarta Sans | rail |
| **aruna-hening** | Editorial minimal: huruf yang jadi ornamennya | `#FAFAF8` / `#14150F` / `#3A4F48` / `#9AA3A8` | Instrument Serif + Jost | mosaic |
| **aruna-pelita** | Mewah gelap: emas pada bidang malam | `#141719` / `#F1ECE2` / `#D9B978` / `#8E6B3A` | Italiana + Plus Jakarta Sans | masonry |
| **aruna-sekar** | Krem sogan: damask, sulur, cat air bergradasi | `#F3EBDE` / `#382C24` / `#7A5C44` / `#C89F3B` | Cormorant Garamond + Jost | masonry |

**Ladang ornamen.** Section tidak lagi memasang satu `frame` 34rem di tengah pada `opacity-[0.18]`.
`<InvitationOrnamentField>` memasang 2–6 keping kategori `layer` pada jangkar tepi (`top-left`,
`bottom-center`, `mid-right`, …) berukuran 200–480px dengan bleed 8–18% keluar section — section
induknya yang memotong. Empat resep jangkar dipilih deterministik lewat `seed` (indeks section),
jadi undangan tidak terbaca sebagai satu pola yang diulang sepuluh kali.

Kepadatannya diatur `document.sections[cover].data.ornamentIntensity`
(`lembut` | `seimbang` | `pekat`), yang mengalikan jumlah keping, ukuran, dan opacity sekaligus.
Field ini hidup di `section.data`, **bukan** di `tokens`: menambah key ke `tokens` menggerbangi
perubahannya di balik entitlement `design` dan membuat `tests/contracts.test.ts` gagal.

Frame, divider, corner, motif, symbol, dan seal **tidak pernah berulang antar tema** — kalau dua tema
memakai glyph yang sama pada salah satu slot itu, salah satunya belum benar-benar punya wajah.
Floral, monogram, dan garland boleh berbagi.

**Pack `sekar` menambahkan syarat kesepuluh yang sebelumnya tidak pernah ditulis: jangan datar.**
Sampai fase 42 seluruh bank satu tinta, dan `ornament-palette.ts` menjawabnya dengan ramp empat
stop — tapi ramp itu hanya menyediakan warnanya, tidak mewajibkan glyph memakainya. Diukur, 128
dari 133 glyph tetap hidup di dua tingkat. Kedua puluh dua glyph `sekar` karena itu wajib memakai
**tiga dari empat stop** dan membawa **minimal satu `<linearGradient>`** pada bidang bermassa
terbesarnya, dengan `stop-color` berupa `var(--iv-orn-*)` supaya gradasinya ikut palet pasangan
dan bukan warna yang dipanggang ke berkas.

Gradasi itu gratis bagi gerbang: `subPathPolyline()` melewati `d` yang mengandung kurva, jadi
bentuk kubik memang tidak diukur `potong-diri`, `lonjakan`, dan `runtuh` — dan bentuk kubik juga
yang paling murah. Satu kelopak butuh empat perintah, bukan empat puluh titik. Yang **tetap**
berlaku dan harus dijaga tangan adalah `massa-tertimbun`, dan ia langsung menangkap satu cecek
yang duduk persis di bawah palang sewarna di `motif-damask`.

### Gerbang perlu, tapi tidak pernah cukup

**Aturan tetap, dan ia lahir dari kegagalan yang terukur.** Fase 41 menyatakan tiga belas bingkai
selesai setelah kedelapan gerbang mutu hijau. Empat bug kemudian ditemukan **dengan melihat layar**,
tiga di antaranya lolos dari seluruh delapan gerbang: isen yang ditimpakan alih-alih dilubangi
(delapan belas keping ada di berkas, di koordinat yang benar, dan tidak satu pun terlihat), offset
yang melahirkan simpul, dan penggeser yang meninggalkan titik kontrol di titik asal. Gerbang mengukur
kepadatan, kelengkungan, bobot, dan keunikan; tidak satu pun bisa melihat poligon yang memotong
dirinya sendiri.

Empat gerbang geometris ditambahkan sesudahnya (`potong-diri`, `lonjakan`, `runtuh`,
`massa-tertimbun`), dan yang pertama **langsung menemukan sepuluh dari tiga belas bingkai yang sudah
dinyatakan selesai masih bersimpul**. Itu membuktikan kedua hal sekaligus: gerbang memang perlu, dan
gerbang yang ada memang belum cukup.

Karena itu:

1. **Tidak ada kategori ornamen yang boleh dinyatakan selesai sebelum lembar kontaknya dibuka dan
   tiap glyph dilihat** pada dua latar (kertas dan bidang gelap) dan dua lebar (375px dan 1440px).
   `pnpm ornament:sheet` membangunnya, `pnpm ornament:sheet:serve` menyajikannya.
2. **Tiap gerbang baru wajib diuji pada bentuk yang sudah diketahui jawabannya**, bukan sekadar
   dijalankan pada bank lalu dipercaya karena angkanya terlihat masuk akal. Tiga metrik sudah salah
   dengan cara itu: huruf kurva (fase 39), hitung elemen (fase 41), dan kotak pembatas pada
   `massa-tertimbun` (fase 45, menuduh empat ornamen yang baik-baik saja).
3. **Jangan mengukur bentuk lewat cara penulisannya.** Itu akar ketiga kesalahan di atas.
4. **Ambang diukur, bukan dikarang.** Plafon bobot 10240 fase 39 ditetapkan sebelum ada satu pun
   ornamen terisi untuk diukur, dan ia langsung salah. Kalau sebuah ornamen melewati plafon, potong
   dulu yang memang bisa dipotong tanpa kehilangan bentuk (kerapatan sampel, kerapatan isen,
   desimasi rel) — lalu naikkan plafonnya dengan angka, bukan dengan mengurangi ornamennya.

Yang dilihat mata dan tidak bisa dilihat gerbang mana pun, terbukti dari fase 45–47: pemisah yang
bandnya terjepit jadi deretan oval, dan simbol yang kartusnya memikul lebih banyak luas daripada
figurnya sendiri. Keduanya lolos sembilan gerbang.

**Tema gelap akhirnya mungkin, dan yang membukanya satu token.** Selama tinta tombol dipanggang
`#FFFDF7` di `MusicPlayer.vue` dan di `contrast.ts`, pasangan `accent` menuntut `primary` cukup
TERANG untuk terbaca di atas latar gelap sementara pasangan `button` menuntutnya cukup GELAP untuk
menampung tinta nyaris putih. Terukur: emas `#D8B26A` memberi accent 8,76 dan **button 1,97**;
primary yang cukup gelap untuk tombol memberi **accent 3,08**. Tidak ada palet di antaranya.

`onPrimary()` di `utils/contrast.ts` memilih di antara `inkLight` dan `inkDark` mana pun yang lebih
terbaca di atas `primary`, dan `themeStyle()` memancarkannya sebagai `--iv-on-primary`. Palet yang
sama lalu memberi **button 9,09**. Ia **diturunkan, bukan disimpan**: menaruhnya di `tokens`
menggerbangi perubahannya di balik entitlement `design` dan memecah `tests/contracts.test.ts`.
Efek sampingnya ikut benar — pasangan yang menggeser `primary` jadi terang mendapat tinta gelap
tanpa perlu tahu tombolnya punya token.

**Yang ikut terbalik pada tema gelap, dan tidak satu pun gerbang bisa melihatnya.** Bidang
`data-tone="ink"` dicat `--iv-fg` dan `data-tone="primary"` dicat `primary` — pada tema terang
keduanya bidang paling gelap di halaman, pada `aruna-pelita` keduanya justru yang paling TERANG.
Enam tempat memanggang `#fffdf7` dengan asumsi itu: `ornamentRampOnDark()` (accent jatuh ke 1,03
dan rampnya runtuh dari empat langkah jadi satu — ini satu-satunya yang tertangkap gerbang), rel
dan titik `Story.vue`, ladang ornamen ber-`data-dark`, motif `::before`, dan penanda timeline.
Semuanya sekarang mengikuti `--iv-orn-dark-body` atau `--iv-bg`. Tiga `#fffdf7` yang tersisa
memang benar: keduanya di atas FOTO, dan foto tetap foto pada tema mana pun.

`primary` bloom dan lumine dikoreksi pada 2026-09-12: `#B4472A` hanya 4,45:1 di atas tone `tint`
dan `#9C7C38` hanya 3,60:1 di atas latarnya sendiri, padahal keduanya dipakai sebagai teks biasa.
Axe e2e dulu hanya memindai tema default, jadi keduanya lolos berbulan-bulan; sekarang setiap tema
dipindai sendiri di `tests/e2e/public.spec.ts`.

**Latar tema** opsional lewat `backdrop` di `themePresentation`: motif SVG di
`apps/web/public/textures/` dipasang sebagai `mask-image` pada `.iv-section::before` dan diwarnai
`--iv-accent` runtime, jadi pasangan yang mengubah palet tetap mendapat backdrop yang selaras.
Tema tanpa `backdrop` memancarkan mask `none` dan opacity `0` — identik dengan sebelumnya.
Tekstur **tidak** masuk `ornamentBank`: tile CSS tidak bisa `currentColor` dan tidak boleh di-DrawSVG.

**`aruna-sekar` adalah tema pertama yang benar-benar menyalakannya**, dan dua hal yang ditemukan di
sana berlaku untuk tekstur berikutnya. Pertama, **ubin latar digambar berongga, bukan bermassa**:
versi pertamanya memakai siluet penuh dan pada 5% opacity ia terbaca sebagai noda besar, bukan
sebagai kain — latar bekerja pada siluet, dan siluet yang tepat untuk latar adalah garis.
Kedua, **opacity-nya dilihat, bukan disalin**: 0,05 yang diusulkan catatan pack kayon ditulis untuk
ubin bermassa; ubin bergaris menghilang di sana dan mulai berebut dengan keping ladang di 0,10.
`aruna-sekar` mendarat di 0,07 setelah ketiganya dibandingkan di layar.

**Dan ubinnya tidak boleh menyebut nama custom property di dalam komentar XML.** Tanda hubung
ganda membuat berkasnya tidak sah, dan kegagalannya sepenuhnya senyap: server menjawab 200,
`mask-image` terpasang, `--iv-backdrop-*` benar semua, dan latarnya kosong tanpa satu galat pun.
Yang menemukannya adalah membuka halamannya.

Pasangan tetap bisa mengubah `background`/`foreground`/`primary` sendiri (fitur premium `design`); preset hanya titik awal yang terkurasi. Keempat pasangan kontras dihitung ulang setiap kali color picker bergerak dan dilaporkan lengkap dengan rasionya di panel "Tema & warna", plus tombol **Perbaiki warna otomatis** yang mencari nilai terdekat yang lolos dengan menggeser terang-gelapnya saja (hue dan saturasi pilihan pasangan dipertahankan, `background` tidak pernah disentuh). **Simpan draft tidak diblokir** — pasangan sering berhenti di tengah penyetelan dan autosave tidak boleh menghukum itu; yang diblokir adalah **publish**, karena itulah titik ketika tamu mulai membacanya.

Anatomi undangan (urutan konvensi genre, section bisa dimatikan):
cover gate (amplop + segel) → pasangan → acara (+kalender, peta) → countdown → cerita → galeri → rundown → dresscode → video → hadiah → **RSVP (di dalam renderer, memakai token tema)** → dinding ucapan → penutup. Dock navigasi bawah + pemutar musik mengambang selalu ada setelah gate dibuka.

---

## Aset

- **Ornamen**: komponen SVG di `apps/web/components/ornament/`, terdaftar di `apps/web/utils/ornaments.ts`.
  Digambar sendiri, **empat tingkat warna**, tanpa PNG.
  Render lewat `<OrnamentGlyph :glyph="id" />`, bukan dengan menyebut nama komponennya — ornamen
  dipilih saat runtime, dan auto-import Nuxt hanya menangkap komponen yang muncul sebagai tag di template.

  **Ornamen bermassa (2026-09-12).** Sebelumnya semuanya `fill="none"` dengan `stroke-width` 1,1–1,4.
  Diukur di titik pakainya, itu hanya menyisakan **0,11–0,60px tinta** — `corner-flourish` dirender
  `h-10 w-10` dari viewBox 170 sama dengan stroke efektif 0,31px pada opacity 0,35. Di bawah 1px
  sebuah stroke hanya menjadi abu-abu antialias, dan itulah yang terbaca sebagai "garis tipis".
  Spesifikasi sekarang:
  - Badan bentuk `fill="currentColor"` bertanda `data-mass`. Tidak ada ornamen yang seluruhnya outline.
  - Detail bergaris `stroke-width` 2,5–4 **dalam satuan viewBox**, bertanda `data-draw`. Tidak ada path
    di bawah 2 — kalau butuh lebih tipis dari itu, bentuknya yang salah, bukan strokenya.
  - Dua bidang nilai per glyph (`opacity` 1 dan ~0,45) supaya terbaca sebagai cetakan, bukan outline.
  - Bingkai dan cincin tetap berongga; massanya datang dari tebal bandnya lewat `fill-rule="evenodd"`,
    bukan dari mengisi bagian dalamnya.

  **Ramp warna ornamen (2026-09-18).** Sebelum ini seluruh bank satu tinta: diukur pada 133 komponen,
  283 `fill="currentColor"`, 60 `stroke="currentColor"`, dan **nol** hex, gradient, atau pattern.
  Kedalaman dipalsukan sepenuhnya dengan `opacity`, dan 128 dari 133 glyph hanya punya dua tingkat.
  Pemilik produk menilainya monoton dan menunjuk pack Canva yang ia impor sendiri sebagai pembanding —
  pack itu memang punya ramp sungguhan (`canva-emas-hitam`: `#423d35 → #8c8153 → #ccb554 → #dbcd93`).

  Empat stop, diturunkan dari token tema di `apps/web/utils/ornament-palette.ts`, dipancarkan
  `themeStyle()` sebagai hex:

  | stop | turunan | peran |
  |---|---|---|
  | `--iv-orn-deep` | `mix(primary 64%, foreground 36%)` | kedalaman ukiran, lapisan garis |
  | `--iv-orn-body` | `primary` **persis** | badan bentuk |
  | `--iv-orn-accent` | `accent` tema | plat di balik rongga, inlay |
  | `--iv-orn-glow` | `mix(accent 55%, background 45%)` | sorot, rel tipis |

  Aturan yang menyertainya:
  - Tiap `var()` **wajib** membawa `currentColor` sebagai cadangan. Itu yang membuat glyph yang belum
    digubah dan empat belas tempat yang memaksa `color:` sendiri terus bekerja tanpa disentuh.
  - **Aksen adalah massa, bukan garis.** Diukur pada sembilan tema, `accent` serendah 2,32:1 terhadap
    latarnya dan 1,68:1 terhadap `primary` — cukup untuk bidang seluas band, tidak cukup untuk garis
    selebar tiga satuan viewBox. Lapisan `data-draw` memakai `deep`.
  - Susunan baku tiap ornamen tiga lapis: **plat aksen di bawah, badan bertinta di atasnya yang
    diperkecil sedikit supaya platnya menyembul sebagai tepi, lalu rongga isen `evenodd` menembus
    badan** sehingga aksennya terbaca lewat tiap ukiran. Warna jadi berarti tanpa satu bentuk baru.
  - Ambangnya **ambang dekoratif, bukan ambang teks**: tiap stop ≥ 1,18:1 terhadap latarnya dan dua
    stop bertetangga terpisah ≥ 1,12:1. Memaksakan 4,5:1 WCAG ke sini akan menolak aksen di hampir
    semua tema. Dijaga `apps/web/test/ornament-palette.spec.ts` pada 27 ramp (9 terang + 18 gelap).
  - Bidang gelap menukar rampnya **sekali** di `.iv-root` (`Renderer.vue`), bukan di empat belas
    tempat yang masing-masing sudah memaksa `color: #fffdf7`.

  **Keunikan dijamin konstruksi, bukan ketelitian.** Sidik jari gerbang keunikan tahan geser **dan
  tahan skala**, jadi persegi panjang selalu cocok dengan persegi panjang dan lingkaran selalu cocok
  dengan lingkaran — memperbesar bentuk satu tema tidak pernah menolong. Karena itu tiap kategori
  menurunkan siluet, band, rel, dan isennya dari `profilTema(mahkota)` di
  `scripts/ornament-forge/resep/tata.mjs`, dan tiap pertumbuhan membawa kuncup `unitTema` di
  pangkalnya. Dibuktikan: membangun sudut dan pemisah dari persegi panjang generik melonjakkan
  pelanggaran keunikan dari 1 jadi **144**; setelah diturunkan dari profil tema, **0**.

  Konsekuensi yang mahal kalau dilupakan: **DrawSVG hanya menganimasi stroke.** Bentuk berisi tidak
  bisa diungkap dengannya — `bloomIn`/`cascadeIn`/`orchestrate` yang menggantikannya.

  **Ladang ornamen diukur terhadap wadahnya, bukan terhadap viewport (2026-09-13).**
  `OrnamentField` memasang `container-type: inline-size` dan tiap keping berlebar
  `clamp(size × 0.44, size/1400 × 100cqw, size × 1.25)`. Angka `size` di resep berlaku untuk
  section selebar 1400px; sisanya diturunkan. Batas bawah 0,44 ada supaya ornamen tidak kembali
  jadi hantu di ponsel — proporsi murni mengecilkan `cascade` 250px ke 67px di section 375px.
  Titik peralihannya 616px.

  Dua aturan yang lahir bersamanya: **bleed diturunkan dari lebar yang sudah di-clamp**
  (`calc(var(--iv-piece) * -0.14)`), karena bleed yang dihitung terpisah tidak lagi cocok begitu
  clamp menggigit; dan **pemanggil tidak mengoper pengali ukuran**. Sebelum ini kartu tema landing
  mengoper `:scale="0.46"` — benar angkanya, salah tempatnya. Yang perlu tahu lebar bidang adalah
  ladangnya sendiri, jadi ladang yang sama bekerja di section selebar layar maupun di kartu 302px.
- **Foto**: hanya CC0/PD terverifikasi (jalur Wikimedia Commons yang sudah terbukti di `docs/REFERENCE-REVIEW.md`). Konversi WebP, provenance dicatat.
- **Lambang bank** di `apps/web/public/banks/<bankId>.svg`, presentasinya di `apps/web/utils/banks.ts`.
  Ini **bukan** ornamen: lambang merek berwarna banyak, jadi tidak `currentColor`, tidak `data-draw`,
  dan tidak pernah masuk `ornamentBank`. Path-nya juga **tidak pernah disimpan di dokumen undangan** —
  dokumen hanya membawa `bankId`; regex `assertSafeUrls` hanya memeriksa key berakhiran
  `url|urls|image|images`, sehingga key `logo` akan lolos tanpa diperiksa. Warna merek hanya mengecat
  pita kepala kartu, dan warna teks di atasnya **dipatok per bank** karena tidak ada satu aturan yang
  lolos (putih di atas Jenius hanya 2,71:1, ink di atas Mandiri hanya 1,73:1). Lambang selalu diletakkan
  di atas kepingan putih dan dirender `alt=""` `aria-hidden` di samping nama bank sebagai teks — lambang
  tidak boleh menjadi accessible name. Berkas yang terpasang sekarang **penanda sementara buatan sendiri**,
  bukan lambang resmi; prosedur menggantinya ada di `docs/features/invitation-builder/sources/BANK-MARKS.md`.
- **Tangkapan layar dasbor** di `apps/web/public/dashboard/`, dipakai `LandingDashboard`
  sebagai case-study. Dibuat `pnpm capture:dashboard`, bukan digambar tangan.
  **Wajib diregenerasi setiap kali dasbor berubah** — tiruan yang tidak ikut berubah membuat
  calon pembeli memutuskan berdasarkan layar yang tidak pernah ada. Prosedur lengkapnya,
  termasuk daftar hal yang tidak boleh ikut terpotret, ada di
  `docs/features/landing-order/DASHBOARD-SHOWCASE.md`.
- **Aset kompetitor di `docs/` adalah riset, bukan aset produksi.** Tidak pernah masuk `apps/web/public`.

---

## Gaya kode

- Markup dan CSS ditulis **multi-baris**. Section satu-baris sepanjang 1.500 karakter dilarang — diff harus bisa direview.
- Styling memakai utilitas Tailwind + token. `<style scoped>` hanya untuk hal yang tidak bisa diungkap utilitas (keyframes kompleks, selector `::part`, layout tema undangan).
- Halaman tidak boleh menaruh chrome-nya sendiri: pakai `layouts/`.
- `vue-tsc` wajib hijau (`typeCheck: true`).
- Wajib lolos: axe 0 violation, `scrollWidth <= innerWidth` di 360 / 768 / 1440.
