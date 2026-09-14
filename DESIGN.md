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

- **Display — Fraunces** (variable, sumbu `SOFT`/`WONK`). Serif editorial yang terasa digambar tangan. Heading landing & dashboard. Selalu `letter-spacing` negatif pada ukuran besar.
- **UI/Body — Plus Jakarta Sans** (variable). Dirancang untuk Jakarta; terasa lokal tanpa jadi kampungan. Semua body, kontrol, nav, tabel.
- Font tema undangan dideklarasikan per tema (lihat di bawah), tidak memakai dua di atas kecuali tema memilihnya.

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

---

## Tema undangan

`templateId` adalah `z.enum(templateIds)` di `packages/contracts`, dan kontraknya sengaja tipis:
tiga warna plus satu font. Sisa identitas tema hidup di lapisan web, pada `themePresentation` di
`apps/web/utils/theme.ts` — pasangan font, foto cover, aksen kaligrafi, dan **set ornamen** yang
menentukan bingkai, pemisah, sudut, floral, motif, simbol, dan monogram milik tema itu.
Renderer membaca set tersebut lewat `themeOrnaments()`, jadi mengganti tema mengubah wajah
undangan, bukan hanya paletnya. Tidak ada direktori layout per tema; satu renderer melayani semuanya.

| Tema | Mood | bg / fg / primary / accent | Font | Galeri |
|---|---|---|---|---|
| **aruna-bloom** | Botanical ivory, hangat, klasik | `#FBF6EE` / `#241A14` / `#A93F23` / `#7A8B6F` | Cormorant Garamond + Plus Jakarta Sans | masonry |
| **aruna-lumine** | Modern luxe, emas sampanye, tenang | `#F7F5F1` / `#1C1C1A` / `#7E6020` / `#2E3330` | Italiana + Jost | mosaic |
| **aruna-senja** | Senja Jawa, plum & amber, dramatis | `#FBF3EA` / `#2E1A26` / `#7D3350` / `#C2803A` | Fraunces + Plus Jakarta Sans | rail |
| **aruna-alba** | Minimalis modern, putih tulang, garis tegas | `#F4F3F1` / `#15161A` / `#4A5560` / `#9AA3A8` | Instrument Serif + Plus Jakarta Sans | mosaic |
| **aruna-sogan** | Terinspirasi adat Jawa: sogan, kunir, kawung | `#F6EEE2` / `#241809` / `#7A4A18` / `#A9833F` | Cormorant Garamond + Plus Jakarta Sans | masonry |
| **aruna-gonjong** | Terinspirasi adat Minang: marun, songket | `#FBF1E7` / `#25101A` / `#8E2433` / `#BE9440` | Fraunces + Plus Jakarta Sans | rail |
| **aruna-mendung** | Mega mendung Cirebon: awan berundak, biru laut | `#F2F6F8` / `#10222E` / `#1F4E68` / `#B8842B` | Cormorant Garamond + Jost | mosaic |
| **aruna-kenanga** | Blush kenanga: merah jambu pudar, kupu-kupu | `#FBF1EF` / `#2A1A1C` / `#97364A` / `#C08A7A` | Italiana + Plus Jakarta Sans | rail |
| **aruna-bentar** | Terinspirasi adat Bali: candi bentar, poleng, padas | `#F5F1E8` / `#1C211E` / `#2B6252` / `#B08A3C` | Instrument Serif + Jost | masonry |

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

**Tema gelap belum mungkin.** Tinta tombol dipanggang sebagai `#FFFDF7` di
`MusicPlayer.vue` dan di `contrast.ts`, jadi pasangan `button` menuntut `primary` cukup gelap
untuk menampung teks nyaris putih; sementara pasangan `accent` menuntut `primary` cukup terang
di atas latar. Pada latar gelap kedua tuntutan itu saling meniadakan — diuji, bahkan latar hitam
murni hanya mencapai 3,55:1 pada `accent`. Tema gelap karena itu menunggu tinta tombol diturunkan
dari tema (mis. `--iv-on-primary`), bukan menunggu palet yang lebih pintar.

`primary` bloom dan lumine dikoreksi pada 2026-09-12: `#B4472A` hanya 4,45:1 di atas tone `tint`
dan `#9C7C38` hanya 3,60:1 di atas latarnya sendiri, padahal keduanya dipakai sebagai teks biasa.
Axe e2e dulu hanya memindai tema default, jadi keduanya lolos berbulan-bulan; sekarang setiap tema
dipindai sendiri di `tests/e2e/public.spec.ts`.

**Latar tema** opsional lewat `backdrop` di `themePresentation`: motif SVG di
`apps/web/public/textures/` dipasang sebagai `mask-image` pada `.iv-section::before` dan diwarnai
`--iv-accent` runtime, jadi pasangan yang mengubah palet tetap mendapat backdrop yang selaras.
Tema tanpa `backdrop` memancarkan mask `none` dan opacity `0` — identik dengan sebelumnya.
Tekstur **tidak** masuk `ornamentBank`: tile CSS tidak bisa `currentColor` dan tidak boleh di-DrawSVG.

Pasangan tetap bisa mengubah `background`/`foreground`/`primary` sendiri (fitur premium `design`); preset hanya titik awal yang terkurasi. Keempat pasangan kontras dihitung ulang setiap kali color picker bergerak dan dilaporkan lengkap dengan rasionya di panel "Tema & warna", plus tombol **Perbaiki warna otomatis** yang mencari nilai terdekat yang lolos dengan menggeser terang-gelapnya saja (hue dan saturasi pilihan pasangan dipertahankan, `background` tidak pernah disentuh). **Simpan draft tidak diblokir** — pasangan sering berhenti di tengah penyetelan dan autosave tidak boleh menghukum itu; yang diblokir adalah **publish**, karena itulah titik ketika tamu mulai membacanya.

Anatomi undangan (urutan konvensi genre, section bisa dimatikan):
cover gate (amplop + segel) → pasangan → acara (+kalender, peta) → countdown → cerita → galeri → rundown → dresscode → video → hadiah → **RSVP (di dalam renderer, memakai token tema)** → dinding ucapan → penutup. Dock navigasi bawah + pemutar musik mengambang selalu ada setelah gate dibuka.

---

## Aset

- **Ornamen**: komponen SVG di `apps/web/components/ornament/`, terdaftar di `apps/web/utils/ornaments.ts`.
  Digambar sendiri, satu warna, `currentColor`. Tidak ada PNG untuk ornamen.
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
