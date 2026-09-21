# Fase 72 — Revamp editor studio ala Undangan Studio (undang.site) + manajemen ornamen

## Context

Pemilik membedah undang.site (editor "Undangan Studio" dan undangan terbitnya di
arunadewa.undang.site) dan ingin editor Aruna Dewa dirombak mengikuti tata letaknya yang
lebih sederhana, ditambah manajemen ornamen yang sudah kita punya. Keputusan pemilik
2026-09-19:

- Revamp ini **menjadi fase 72**; kanvas bagian (elemen bebas, geser ala Figma) yang
  sudah ditulis di `docs/ROADMAP.md` **bergeser jadi fase 73** dengan model data yang sama.
- Gaya teks **per kolom** seperti undang.site (font, ukuran, warna, perataan tiap teks).
- Tab inspektor: **Bagian | Global | Ornamen**.
- Ikut masuk: nav atas Editor | Generator | Ucapan; zoom + pratinjau iPhone/Android/Clean;
  preset palet per tema (4); kartu share OG/WhatsApp; **animasi dan pembukaan amplop
  berjalan di panggung pratinjau** seperti di undang.site.

### Hasil reverse engineering undang.site (referensi, bukan pekerjaan)

Stack: Next.js (App Router + Turbopack, RSC), tanpa GSAP/Framer — semua gerak CSS
`@keyframes` (`envelope-open-3d`, `hero-zoom`, `dove-hover`, `wish-in`, dst.), Cloudflare,
Meta Pixel, login Google (editor tidak bisa dibuka tanpa masuk; saya tidak masuk — bedah
editor memakai 4 tangkapan layar pemilik). Font: Cormorant Garamond, Great Vibes, Dancing
Script, Caveat, Manrope.

Dokumen undangan (dari payload RSC halaman terbit) — bentuknya mirip kita:

```
{ templateCode:'hjydg', themeId:'blue-gold', invitationId,
  sections:[{ id, type, enabled, data:{...teks per kolom, imageUrl, imageUrls[] } }],
  settings:{ musicUrl, musicVolume, customColors:{}, whatsAppPreset:'islami',
             whatsAppMessageTemplates:{},
             cardStyle:{ styleId:'template', backgroundMode, overlayOpacity, textAlign,
                         colors:{}, showGuestName, showDate, showVenue, showSubject },
             publishPricing:{ total, pricingStatus, paidAt }, publishRetention:{ retentionDays:30 },
             payment:{ provider:'pivot', amount, status } } }
```

12 tipe section (Wedding Elegance): `opening-envelope, hero, couple, countdown, event, map,
unduh-mantu (off), quote, gallery, gift, wishes, closing`. Section tetap (toggle tampil + urut),
tidak bisa tambah/hapus — sama dengan kita. Tiap kolom teks punya panel lipat "Gaya teks".
API publik: `GET /api/wishes?invitationId`, `GET /api/share-card/<slug>` (PNG 1200×630 untuk
og:image), `GET /api/settings/public`. Tamu personal lewat `verifiedGuestName`.

Editor (dari tangkapan layar): header = logo + nama tema·kode + "Tersimpan di cloud" +
segmented nav **Editor | Generator | Ucapan** + tombol Undang + akun + status **Published**.
Kiri = "Struktur Undangan" (12), cari, kartu bagian berlabel **Wajib/Opsional**, tombol mata
untuk menyembunyikan (kartu jadi putus-putus). Tengah = panggung: refresh, **zoom −/100%/+**,
**Desktop | iPhone | Android | Clean**, bingkai iPhone. Kanan = ikon undo/redo/buka/riwayat/
keyboard/simpan/ciut, tab **Section | Global | Card Style**. Section = judul + lencana Tampil +
kartu per kolom (label, input, "Gaya teks" lipat). Global = Musik (pustaka + play + genre/durasi +
volume + "Pilih dari Asset Saya"), Fokuskan untuk Layar (Mobile card 480 | Desktop penuh),
Preset Theme (4 swatch + nama font), Kustom Warna (Primary, Accent).

Kenapa tema Wedding Elegance terasa menarik (untuk dipetik, bukan ditiru): amplop 3D dengan
segel lilin dua-warna + callout "Klik di sini" yang berdenyut; hero foto penuh dengan bingkai
garis emas, monogram bercahaya, dua merpati; foto pasangan dibingkai lengkung (arch) bergaris
emas tipis; kartu acara gradasi maroon dengan ikon emas bulat dan tanggal besar; dock bawah
mengambang 5 ikon + tombol musik; galeri grid 2 kolom bernomor 01–04 + caption script;
ornamen floral garis tipis di sudut dengan bintang emas kecil, latar krem dengan pola damask
samar. Kita sudah punya padanannya (CoverGate, Dock, OrnamentField, arch-potret) — yang
belum: hero foto penuh, kartu acara gelap berornamen, dan gerak yang terlihat di editor.

### Peta kode kita yang disentuh (hasil eksplorasi)

- `apps/web/pages/dashboard/[id]/editor.vue` (1.788 baris; state, undo 30 langkah, simpan
  manual, publish + penjaga kontras, seluruh form bagian inline `v-if="selected.type"`).
- `apps/web/components/dashboard/editor/{Toolbar,SectionRail,Stage,Inspector,CopyFields,MotionPicker}.vue`
- `apps/web/composables/useEditorPrefs.ts` (`device`, `inspectorTab`, `railCollapsed`).
- `apps/web/components/invitation/{Renderer,Section,CoverGate,PhoneFrame}.vue`,
  `apps/web/utils/motion-play.ts` (`kaya = !compact && !container.narrow`).
- `apps/web/components/dashboard/ornament/{Studio,SlotSummary,SlotCard,BackdropPicker}.vue`,
  `apps/web/utils/ornament-slots.ts` (`sectionOrnamentSlots`, `uploadableSlots`).
- `apps/web/utils/theme.ts` (`ThemePresentation`, `themePresentation`), `apps/web/utils/contrast.ts`.
- `packages/contracts/src/index.ts` (`invitationDocumentSchema`, `tokens`, `copyKeys`, `fontChoices`).
- `apps/api/src/invitations/invitations.service.ts` (`designFingerprint` membaca `tokens`,
  `order`, `ornamentOverrides`, `copy` → apa pun di `tokens` otomatis tergerbang add-on `design`).
- `apps/web/pages/dashboard/[id]/{guests,rsvps}.vue`, `apps/web/pages/i/[slug].vue`.

## Keputusan tambahan pemilik (2026-09-19, setelah rencana pertama)

**Struktur bagian bawaan kita dirombak total mengikuti format bawaan undang.site** — tipe
bagian, urutannya, label Wajib/Opsional, dan **kata-kata di dalam tiap bagian menjadi kolom
`data` bagian itu** (bukan lagi 44 `copyKeys` global). Alasannya: saat digabung dengan
manajemen ornamen nanti, satu bagian = satu wadah isi + ornamennya, dan struktur undangan
di rail sama persis dengan struktur dokumennya. Pemilik masih akan menunjukkan gambar
tambahan sebelum rencana ini disetujui — rencana ini disalin ke
`docs/features/invitation-builder/FASE-72.md` saat mulai dikerjakan supaya terlacak git.

**Keputusan pemilik terakhir (2026-09-19): struktur ini menjadi template utama Aruna Dewa.**
Struktur bagian dan kolom di bawah bukan sekadar bawaan editor, melainkan wajah tema utama
kita ke depan. Yang membedakan kita dari undang.site adalah **gerak**: di sana hanya amplop
pembuka yang benar-benar bergerak (sisanya `@keyframes` CSS kecil), sedangkan kita memakai
partitur GSAP per tema (`utils/motion-score.ts`, `motion-play.ts`, `sectionRole`). Karena itu:

- `sectionRole` dipetakan ke tipe baru: `opening-envelope → overture`, `hero → introduction`,
  `couple → introduction`, `countdown/event/map/unduh-mantu → information`, `quote →
  interlude`, `gallery → showcase`, `gift → information`, `wishes → response`, `closing → coda`.
- Setiap bagian mendapat **gerak masuk per bagian** yang bisa dipilih pasangan:
  `data.motion?: 'tema' | 'rise' | 'sweep' | 'iris' | 'silhouette' | 'tanpa'` (preset partitur
  yang sudah ada; bawaan `tema`), ditampilkan di form bagian sebagai select "Gerak masuk" di
  atas blok Background section. Ini melampaui undang.site tanpa membuka kanvas bebas (fase 73).
- Amplop pembuka tetap `CoverGate` + `envelopeTempo`; hero foto penuh mendapat `hero-zoom`
  ala referensi lewat partitur, bukan CSS lepas.

### 72.0 Struktur bagian bawaan baru (dikerjakan pertama, sebelum kerangka)

`schemaVersion: 2`. `sectionTypes` baru mengikuti undang.site, urutan bawaan dan status:

| # | Tipe baru | Rail | Status | Kolom `data` bawaan (persis undang.site) | Dari tipe lama |
|---|---|---|---|---|---|
| 1 | `opening-envelope` | Opening Envelope | Wajib | `title, eyebrow, kicker, date, guestLabel, sealMonogram, sealLabel, callout, subtitle, footer` | `cover` + `gate.*` copy |
| 2 | `hero` | Hero | Wajib | `title, monogram, kicker, subtitle, guestLabel, scrollLabel, imageUrl` | `cover.image/title/subtitle` |
| 3 | `couple` | Mempelai | Wajib | `title, bismillah, greeting, subtitle, brideLabel, brideName, brideOrder, brideParents, groomLabel, groomName, groomOrder, groomParents, imageUrl` | `couple` |
| 4 | `countdown` | Hitung Mundur | Opsional | `title, subtitle, targetDate, daysLabel, hoursLabel, minutesLabel, secondsLabel, buttonLabel, calendarUrl, backgroundImageUrl` | `countdown` |
| 5 | `event` | Rangkaian Acara | Wajib | `title, eyebrow, subtitle, day, date, monthYear, akadTitle, akadTime, akadNote, receptionTitle, receptionTime, receptionNote` | `events.events[0..1]` |
| 6 | `map` | Lokasi | Opsional | `title, subtitle, mapUrl, buttonLabel` | `events.events[*].venue/address/mapUrl` |
| 7 | `unduh-mantu` | Unduh Mantu | Opsional (mati) | `title, subtitle, kicker, address, mapUrl, buttonLabel` | baru |
| 8 | `quote` | Quote | Opsional | `title, subtitle, imageUrl` | baru |
| 9 | `gallery` | Galeri | Opsional | `title, eyebrow, subtitle, viewLabel, lightboxTitle, imageUrls[]` | `gallery.images` |
| 10 | `gift` | Hadiah | Opsional | `title, eyebrow, subtitle, bank1, account1, holder1, bank2, account2, holder2, hasSecondAccount, buttonLabel, copiedLabel` | `gift.accounts` |
| 11 | `wishes` | Ucapan | Opsional | `title, eyebrow, formTitle, subtitle, nameLabel, namePlaceholder, attendanceLabel, presentLabel, unsureLabel, absentLabel, messageLabel, messagePlaceholder, submitLabel, savingLabel, successLabel, celebrationLabel, loadingLabel, emptyLabel` | `rsvp` + `wishes` (digabung: RSVP = pilihan kehadiran di form ucapan) |
| 12 | `closing` | Penutup | Wajib | `title, copy, subtitle, greeting, date, imageUrl` | `closing` |

Bagian kita yang tidak ada di undang.site tetap ada sebagai **Opsional (mati)** di bawah
Penutup dengan kolom kata-kata di dalamnya: `story`, `rundown`, `dresscode`, `video`.
`music` keluar dari `sections` → `settings.musicUrl/musicVolume` di dokumen (seperti
undang.site) dan diatur di tab Global.

Teknis:

- `packages/contracts/src/index.ts`: `sectionTypes` baru; **`sections[].data` divalidasi
  zod per tipe** (`z.discriminatedUnion('type', …)`, bukan lagi `z.record(z.unknown())`),
  semua kolom teks `string().max(240)` (judul 80, label/tombol 40 — pakai `copyLimit` yang
  ada), `imageUrl` string, `imageUrls` array ≤ `galleryPhotoLimit`. `copy` dan `copyKeys`
  **dihapus dari skema v2** (kata-kata sudah di dalam bagian). `createDefaultDocument()`
  mengisi kata-kata bawaan berbahasa Indonesia seperti tabel di atas.
- Migrator `migrateDocumentV1toV2()` di contracts (murni, diuji vitest dengan dokumen v1
  nyata dari `tests/fixtures`) dipanggil API saat memuat draft/revisi (`document-validation.ts`)
  dan klien tidak pernah melihat v1. `PublishedRevision` lama dimigrasi saat dibaca, bukan
  ditulis ulang.
- `designFingerprint` (`invitations.service.ts`) berhenti membaca `copy`; `order` dan
  `ornamentOverrides` tetap; `ornamentOverrides` pindah dari `cover.data` ke
  `opening-envelope.data` (migrator).
- Renderer: `sections/*.vue` ditulis ulang per tipe baru (`OpeningEnvelope` = CoverGate,
  `Hero`, `Couple`, `Countdown`, `Event`, `Map`, `UnduhMantu`, `Quote`, `Gallery`, `Gift`,
  `Wishes`, `Closing`, + `Story/Rundown/Dresscode/Video`), membaca kata-kata dari `data`
  bukan `t(copyKey)`; `invitation-copy.ts` dan `CopyFields.vue` dihapus.
  `sectionOrnamentSlots` dan `sectionRole` (partitur) dipetakan ulang ke tipe baru; vitest
  yang membaca sumber `components/invitation/` menjaga tabelnya.
- Editor: form per bagian = daftar kolom `data` (label per fungsi, urutan seperti tabel) —
  ini yang membuat form bisa digenerate dari skema (`sectionFieldMeta` per tipe: label,
  jenis `teks|paragraf|tanggal|url|foto|foto[]|boolean`) dan tiap kolom teks otomatis
  mendapat "Gaya teks" di 72.4.
- Halaman publik `/i/[slug]`, RSVP/Wish API, dan dasbor `rsvps.vue` menyesuaikan gabungan
  `wishes` (kehadiran `hadir|belum-pasti|berhalangan` ikut di ucapan; model `RSVP` Prisma
  tetap, diisi dari form yang sama).

## Referensi UI undang.site yang wajib diikuti (dari 11 tangkapan layar pemilik)

Disalin di sini supaya tidak bergantung pada ingatan sesi; saat mulai dikerjakan, gambar
5–11 disalin ke `docs/features/invitation-builder/referensi/undang-site/` (diabaikan git
sesuai aturan biner, cukup tercatat namanya).

**Header studio.** Kiri: logo + "Undangan Studio" + `Nama tema · kode` + pil hijau
"✓ Tersimpan di cloud". Tengah: segmented **Editor | Generator | Ucapan**. Kanan: tombol
"Undang" (tooltip "Undang kolaborator untuk mengedit bersama" — di kita cukup tombol
non-aktif berlabel "Segera"), avatar akun, tombol hijau "✓ Published".

**Rail kiri.** Judul "Struktur Undangan", sub "Geser section untuk mengatur urutan.", lencana
jumlah (12), tombol ciut. Cari "Cari section (Akad, Galeri…)". Kartu: pegangan ⠿ + ikon +
nama + sub Wajib/Opsional; aktif = pil hijau muda berbingkai hijau; disembunyikan = putus-
putus, nama dicoret abu, tombol mata-coret kuning di kanan. Drag-and-drop untuk urutan
(kita: tambah drag lewat `useSortable` VueUse; panah ↑↓ tetap untuk keyboard).

**Panggung.** Pil kiri: ↻ | ZOOM ⊖ 100% ⊕. Pil kanan: Desktop | iPhone (aktif hijau) |
Android | ⤢ Clean. Bingkai iPhone hitam bernotch. Di dalam undangan: tombol mute bulat kanan
atas, dock bawah mengambang (Awal, Acara, Galeri, Hadiah, Ucapan). Pojok kanan bawah ada
thumbnail mengambang (bawaan macOS screenshot — abaikan).

**Tab Section (form bagian).** Judul bagian + sub + lencana "Tampil". Tiap kolom = kartu
putih: label tebal, input, baris lipat "T Gaya teks ⌄". Kartu **FOTO KOMPONEN**: nama berkas,
pratinjau 16:9, tombol ✕ hapus di pojok, tombol hijau muda "🗁 Ganti dari Asset Saya".
Blok **BACKGROUND SECTION**: "Warna background" + swatch + hex (#FFF7F0); "Background image"
→ Asset Manager, kosong = ilustrasi + "Belum ada gambar terpilih" + "Pilih dari Asset Saya".
→ Kontrak 72.0 menambah `data.latar?: { warna?: #hex, gambarUrl?: string }` pada setiap
tipe bagian, dan `imageUrl` sudah ada di tipe yang punya foto.

**Modal "Pustaka Saya".** Header: ikon gambar, judul "Pustaka Saya", sub "Foto & gambar
undangan", pencarian "Cari nama foto...", ✕. Dropzone putus-putus hijau: "Upload Foto /
Gambar Baru — Format: JPG, PNG, WebP, AVIF (Maks. 8MB per file)" + tombol hijau "+ Upload
Foto Baru". Grid 4 kolom kartu: thumbnail 4:3, nama berkas tebal, tanggal, baris tombol
"✓ Pilih" hijau + ikon pangkas + ikon hapus; kartu terpilih berbingkai hijau. → Irisan 72.8.

**Tab Card Style (kartu bagikan).** Panggung berganti jadi pratinjau kartu 1200×630 dengan
lencana "PREVIEW WHATSAPP / OPEN GRAPH" dan tombol "⭳ Unduh ⌄"; di bawahnya catatan
"Preview kartu saat dibagikan ke WhatsApp… nama Bpk. Budi Santoso di atas hanya contoh dan
tidak disimpan." Kartu: latar maroon berornamen lingkaran tipis, "UNDANGAN PERNIKAHAN"
(spasi huruf, emas), nama pasangan script krem, garis pemisah emas, "KEPADA YTH.", nama tamu
sans tebal besar krem. Panel: **Gaya kartu** (Template "Motif mengikuti karakter template" |
Elegan "Bingkai klasik untuk kartu formal" | Minimal "Tampilan ringkas dan modern"), **Latar
belakang** (Template | Foto | Warna), **Informasi dan warna** (swatch Aksen, swatch Teks;
perataan Kiri | Tengah; sakelar Nama tamu (on), Tanggal & jam, Lokasi), "↺ Reset gaya kartu".
→ Keputusan: inspektor jadi **empat tab: Bagian | Global | Ornamen | Kartu** (Ornamen tetap
tab ketiga sesuai jawaban pemilik; Kartu mengikuti undang.site persis). Kontrak `document.kartu`
di 72.7 diperluas: `{ gaya:'template'|'elegan'|'minimal', latar:'template'|'foto'|'warna',
warnaLatar?, aksen?, teks?, perataan:'kiri'|'tengah', tampilkanNama, tampilkanTanggal,
tampilkanLokasi }`. Nama tamu di kartu ikut `?to=` (share-card menerima `?to=`).

**Tab Global.** Kartu **Musik undangan** (ikon nada; lencana kategori "✨ Pernikahan" kuning
+ "🔊 Aktif" hijau): select besar berikon ⭐ untuk lagu pilihan, tombol ▷ pratinjau, baris
"Genre: Romantis · 3:44", slider "Volume Musik 60%", tombol "🗁 Pilih dari Asset Saya"
(unggah MP3). Daftar lagu undang.site (judul — versi · genre · durasi) — semuanya cover
instrumental:

| ⭐ | Lagu | Genre | Durasi |
|---|---|---|---|
| ⭐ | Easy On Me — Adele (Instrumental Cover) | Romantis | 3:44 |
| ⭐ | A Thousand Years — Christina Perri (Instrumental) | Akustik Romantis | 4:45 |
| ⭐ | Fly Me to the Moon — Piano Version | Jazz Romantis | 2:19 |
| ⭐ | Until I Found You — Piano Cover | Piano Romantis | 3:29 |
| ⭐ | Can't Help Falling in Love — Piano Version | Piano Romantis | 3:31 |
| ⭐ | Janji Suci — Piano Cover | Piano Romantis Indonesia | 3:44 |
| ⭐ | Canon in D Major — Johann Pachelbel (Piano) | Klasik Elegan | 4:12 |
| ⭐ | Sampai Jadi Debu — Banda Neira (Piano) | Folk Romantis | 3:58 |
|  | Happy Birthday to You — Acoustic Ukulele | Ulang Tahun · Ceria & Hangat | 2:30 |
|  | Playful Sunshine — Kids Party & Playful Melody | Aqiqah & Anak · Ceria & Hangat | 2:45 |
|  | Sholawat Badar Syahdu — Gambus & Biola | Khitanan & Aqiqah · Religius & Syahdu | 3:50 |
|  | Instrument Jawa — Instrumental | Khitanan · Tradisional | 4:05 |
|  | Tanpa musik — Undangan hening tanpa pengiring | | |

Catatan hak cipta: judul-judul di atas adalah lagu berhak cipta (aransemen cover tetap butuh
lisensi komposisi). Kita **meniru struktur UI dan metadatanya** (⭐, genre, durasi, kategori,
"Tanpa musik"), tapi isi pustaka tetap trek berlisensi/bebas royalti yang sudah ada di
`apps/web/utils/music-library.ts`, ditambah kolom `genre`, `durasi`, `kategori`, `unggulan`.

Kartu **Fokuskan untuk Layar** (lencana "LAYOUT"): "Mobile — Card 480px" | "Desktop — Lebar
Penuh". Kartu **Preset Theme** (lencana "GLOBAL"): 4 kartu, tiga bulatan warna + nama palet +
nama font script (Terracotta & Gold/Great Vibes, Maroon & Gold, Ivory & Gold, Sage & Gold/
Dancing Script). Kartu **Kustom Warna Tema** ("Sesuaikan dengan tema busana/dekorasi"): baris
"Warna Utama (Primary)" + swatch + hex, "Warna Aksen (Accent / Gold)" + swatch + hex.

**Halaman Generator.** Lencana "WHATSAPP BROADCAST · Buku Tamu & Generator", H1 "Manajemen
Tamu & Broadcast WhatsApp", sub "Pilih gaya bahasa undangan, lihat pratinjau pesan personal,
dan kelola daftar tamu untuk broadcast WhatsApp resmi."
1. **Pilih Format & Gaya Bahasa Template WhatsApp** — 5 kartu: Formal & Santun ("Cocok untuk
   keluarga & rekan kerja"), Nuansa Islami ("Lengkap dengan basmalah & doa"), Nuansa Non-Muslim
   ("Salam sejahtera & doa berkat"), Santai & Akrab ("Asik untuk teman sebaya"), Bilingual /
   English ("Format internasional").
2. **Edit Pesan WhatsApp (ISLAMI)** — "Tersimpan otomatis"; chip sisip `{{nama_tamu}}`
   `{{tautan_undangan}}`; "↺ Reset bawaan"; textarea bergaya gelembung WhatsApp di atas latar
   krem, hitung karakter ("730 karakter") + jam ✓✓. Isi bawaan islami: Bismillah, kutipan
   "_Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan._", "Dengan
   memohon ridho dan rahmat Allah SWT, kami bermaksud mengundang Bpk/Ibu/Saudara/i
   *{{nama_tamu}}* pada acara pernikahan kami:", *nama pasangan*, "Yang akan dilaksanakan
   pada:" 📅 hari tanggal, ⏰ Akad, ⏰ Resepsi, 📍 lokasi + alamat, "Info lengkap & lokasi acara
   dapat diakses melalui: {{tautan_undangan}}". Data acara diambil dari section `event`/`map`.
   Banner hijau "✓ Undangan Aktif & Siap Dibagikan · https://… · Buka Link ↗".
3. **Daftar Tamu Undangan Terdaftar** ("Tamu wajib terdaftar untuk menghindari manipulasi
   URL") — tiga kartu statistik: Total Tamu (orang), Sudah Terkirim (n, %), Belum Terkirim.
   Tombol: "+ Tambah Tamu" hijau, "Import Excel / CSV", "Tempel Teks", "Template Excel ⌄",
   "Export Data". Pencarian "Cari nama tamu, nomor HP, atau kategori...", filter pil Semua (n) |
   Belum (n) | Terkirim (n), dropdown "Semua Kategori". Tabel: ☐ | NAMA TAMU UNDANGAN | NOMOR
   WHATSAPP | KATEGORI (chip, mis. "Teman CPP") | STATUS (🕓 Belum / ✓ Terkirim) | AKSI
   BROADCAST ("➤ Kirim WA" hijau, salin, sunting, hapus). → Model `Guest` kita perlu kolom
   `phone`, `category`, `sentAt`; import sudah ada (`apps/api/src/imports/`).

## Hasil bedah langsung editor undang.site (Chrome, sesi pemilik, 2026-09-19)

Dibaca dari DOM dan API editor yang sedang login (tangkapan layar gagal karena jendela
Chrome tersembunyi; tidak ada data yang diubah).

**Model draft (`GET /api/drafts/:id`).** `{ draft:{ id, userId, title, editTokenHash,
templateId:'wedding-lampung-elegance', templateVersion:2, themeId:'blue-gold',
styleOverrides:{ musicUrl, musicVolume, customColors:{}, cardStyle:{…}, whatsAppPreset,
whatsAppMessageTemplates:{}, publishPricing, publishRetention, payment }, status:'published',
publishMode:'subdomain', slug, subdomain:'arunadewa', recoveryCodeHash, publishedAt,
createdAt, updatedAt, sections:[{ id, type, order, enabled, data }] }, role:'owner',
isOwner:true }`. Section punya `order` eksplisit. API lain yang terlihat di bundel:
`/api/assets`, `/api/drafts/:id/history`, `/api/share-card/render`, `/api/wishes`,
`/api/collaboration/invitations`, `/api/payments/qr-proxy`, `/api/auth/google/one-tap`.

**Gaya teks per kolom — bentuk sebenarnya.** Disimpan **di dalam `section.data`** sebagai
`textStyles[<field>]` (alias lama `fontStyles`) dengan kunci `fontFamily, fontSize, color,
fontWeight, fontStyle`; renderer menulis `style` inline dan `background-color` per section.
Panel "Gaya teks" (lipat, tombol `aria-expanded`): **Font teks** (menu: "Bawaan template —
Mengikuti gaya template", lalu 4 font milik template: Great Vibes, Dancing Script, Cormorant
Garamond, Manrope), **Warna** (tombol → `input type=color` bawaan), **Ukuran** (`input
type=number` + satuan "px", `aria-label="Ukuran <label kolom>"`), tombol **Bold** dan
**Italic** (`aria-label="Bold <label>"`), tombol **Reset gaya teks**.
→ Rencana 72.4 mengikuti ini: `sections[].data.textStyles` (bukan `tokens.teks`), ukuran
dalam px dibatasi 10–96, font dari daftar font tema (bukan seluruh `fontChoices`), warna hex
+ pemeriksaan kontras; `designFingerprint` membaca `textStyles` dan `latar` semua section.

**Label kolom per bagian (persis, urut).** Tiap bagian diawali judul + deskripsi + lencana
"Tampil"/"Tersembunyi", dan diakhiri blok **Background section** ("Warna background" tombol
hex `#FFF7F0`) + **Background image** ("Pilih background dari Asset Manager", "Belum ada
gambar terpilih", "Pilih dari Asset Saya"). Kolom teks = `input text`, paragraf = `textarea`.

| Bagian (deskripsi) | Kolom |
|---|---|
| Opening Envelope (Amplop pembuka dengan nama tamu.) | Label pembuka, Kicker, Nama mempelai, Tanggal, Label nama tamu, Monogram segel, Teks segel, Judul petunjuk, Petunjuk segel, Catatan bawah |
| Hero (Cover utama undangan.) | Monogram atas, Kicker, Nama mempelai, Tanggal, Label nama tamu, Petunjuk scroll, **Foto komponen** (Ganti dari Asset Saya) |
| Mempelai (Profil kedua mempelai.) | Bismillah, Salam pembuka, Kalimat pengantar (textarea), Label mempelai wanita, Nama mempelai wanita, Keterangan mempelai wanita (textarea: urutan + orang tua), Label mempelai pria, Nama mempelai pria, Keterangan mempelai pria (textarea), Foto komponen |
| Hitung Mundur (Hitung mundur menuju hari pernikahan.) | Label, Judul, Target tanggal & waktu (`datetime-local`), Label hari, Label jam, Label menit, Label detik, Teks tombol kalender, URL kalender (`url`), Background image (Ganti dari Asset Saya) |
| Rangkaian Acara (Akad dan resepsi.) | Label section, Judul, Kalimat pengantar, Hari, Tanggal, Bulan dan tahun, Nama acara akad, Waktu akad, Catatan akad, Nama acara resepsi, Waktu resepsi, Catatan resepsi |
| Lokasi (Peta dan alamat acara.) | Label lokasi, Alamat (textarea), URL Google Maps (`url`), Teks tombol Maps |
| Unduh Mantu (Acara tambahan pihak pria.) | Keterangan, Nama acara, Tanggal acara, Alamat (textarea), URL Google Maps, Teks tombol Maps |
| Quote (Ayat atau kutipan pilihan.) | Kutipan (textarea), Sumber, Foto komponen |
| Galeri (Kumpulan foto bahagia.) | Label section, Judul, Label preview foto, Caption, Nama di lightbox, Foto komponen (Maks 4) |
| Hadiah (Rekening atau hadiah digital.) | Label section, Judul, Kalimat pengantar (textarea), Bank pertama, Nomor rekening pertama, Pemilik rekening pertama, Teks tombol salin, Teks setelah disalin, sakelar **Aktif** rekening kedua → Nama bank / e-wallet kedua, Nomor rekening kedua, Nama pemilik kedua, tombol Hapus |
| Ucapan (Kehadiran dan buku tamu.) | Label section, Judul, Judul form, Deskripsi form, Label nama, Placeholder nama, Label kehadiran, Pilihan hadir, Pilihan belum pasti, Pilihan berhalangan, Label ucapan, Placeholder ucapan, Teks tombol kirim, Teks saat menyimpan, Pesan berhasil, Pesan animasi, Pesan saat memuat, Pesan saat kosong |
| Penutup (Ucapan terima kasih.) | Judul, Paragraf penutup (textarea), Nama mempelai, Salam penutup, Tanggal, Foto komponen |

**Toolbar & panggung (aria-label persis).** Rail: "Tutup sidebar struktur (Zen Mode)",
"Geser <bagian>", "Sembunyikan/Tampilkan <bagian>". Panggung: "Refresh preview", "Perkecil
Kanvas", "Reset zoom ke 100%", "Perbesar Kanvas", "Tampilan Desktop Viewport", "Tampilan Frame
iPhone", "Frame Android (Camera Punchhole)", "Tampilan Minimalis Tanpa Frame". Inspektor:
"Undo perubahan (Ctrl+Z)", "Redo perubahan (Ctrl+Y)", "Asset Manager (Kelola Foto & Musik)",
"Riwayat versi" (dialog "Versi otomatis dari perubahan kolaboratif.", data dari
`/drafts/:id/history`), "Tampilkan pintasan keyboard", "Simpan perubahan", "Tutup sidebar
editor (Collapse ke kanan)". Header: "Daftar kolaborator online" ("1 online"), tombol
**Published** → dialog "UNDANGAN TELAH PUBLISHED · Undangan Anda sudah aktif · URL UNDANGAN
AKTIF · Salin URL · Buka undangan · Gunakan menu Generator untuk membuat tautan personal…".
Global juga punya warna ketiga **"Warna Latar (Background)"** `#FFF7F0`. Halaman **Ucapan**:
lencana "BUKU TAMU", judul "Ucapan & Kehadiran", "n ucapan", kosong = "Belum ada ucapan pada
undangan ini."

**Template WhatsApp islami bawaan (lengkap):**
```
Bismillahirrahmannirrahim

_Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan._

Dengan memohon ridho dan rahmat Allah SWT, kami bermaksud mengundang Bpk/Ibu/Saudara/i *{{nama_tamu}}* pada acara pernikahan kami:

*Dea & Haryo*

Yang akan dilaksanakan pada:
🗓️ Sabtu, 03 Oktober 2026
⏰ Akad: 08.00 WIB s.d selesai
⏰ Resepsi: 11.00 – 15.00 WIB
📍 Lokasi Akad & Resepsi
<alamat>

Info lengkap & lokasi acara dapat diakses melalui:
{{tautan_undangan}}

Doa restu dan kehadiran Bapak/Ibu/Saudara/i merupakan kebahagiaan yang tak ternilai bagi kami.

Jazakumullah Khairan Katsiran.
Wassalamu'alaikum Wr. Wb.
```

Yang **tidak** ikut ditiru: kolaborasi realtime/riwayat versi otomatis (fase lain), pembayaran
top-up, mode subdomain.

## Irisan

Tiap irisan satu commit "Fase 72.n: …", CHANGELOG di `docs/features/invitation-builder/`,
ROADMAP diperbarui (fase 72 lama ditulis ulang jadi fase 73 sebelum 72.0 dimulai).
Urutan: **72.0 → 72.1 → 72.2 → 72.8 (pustaka, karena form foto 72.0 memakainya) → 72.3 →
72.4 → 72.5 → 72.6 → 72.7**; irisan 72.1–72.8 di
bawah membaca struktur baru dari 72.0 (mis. `sectionRequired` = kolom "Status" tabel di atas).

### 72.1 Kerangka: tiga tab, rail Wajib/Opsional, nav atas, status terbit

- `useEditorPrefs.ts`: `InspectorTab = 'bagian' | 'global' | 'ornamen' | 'kartu'`;
  `mergeDefaults` memetakan simpanan lama `'tema'` → `'global'`.
- `Inspector.vue`: empat tab (ikon `SlidersHorizontal`, `Palette`, `Sparkles`, `Image`),
  empat slot `#bagian #global #ornamen #kartu`, tetap `v-show`. Hapus komentar "dua tab,
  bukan tiga". Saat tab `kartu` aktif, `Stage` berganti ke pratinjau kartu (72.7).
- Rail: drag-and-drop urutan lewat `useSortable` (VueUse) dengan pegangan ⠿; panah ↑↓
  tetap ada untuk keyboard. Lencana jumlah bagian + tombol ciut seperti referensi.
- `SectionRail.vue`: sub-label **Wajib** (cover, couple, events, rsvp, closing) / **Opsional**
  dari tabel baru `sectionRequired` di `apps/web/utils/editor-sections.ts`; bagian wajib
  tidak bisa disembunyikan; tombol mata (`Eye/EyeOff`) menggantikan checkbox; kartu
  tersembunyi bergaris putus-putus + `line-through`. Ikon per tipe sudah ada.
- `Toolbar.vue`: tambah segmented nav **Editor | Generator | Ucapan** (`NuxtLink` ke
  `/dashboard/[id]/editor`, `/guests`, `/rsvps`, `aria-current="page"`), status
  **Terbit ✓ / Draf** dari `invitation.publishedRevision`, tombol ciut inspektor
  (`inspectorCollapsed` masuk `EditorPrefs`). Status simpan tertulis tetap.
- `editor.vue`: pindahkan isi tab Tema ke slot `#global`; slot `#ornamen` sementara berisi
  `SlotSummary` + `BackdropPicker` (dirapikan di 72.5). Judul `h1` tetap di Toolbar (axe).

### 72.2 Panggung hidup: perangkat baru, zoom, amplop & partitur berjalan

- `Stage.vue`: perangkat `iphone 390 | android 412 | laptop 1280 | bersih 390` (tablet
  dicabut; prefs memetakan `tablet|ponsel` → `iphone`). `iphone`/`android` memakai bezel
  (notch vs punch-hole) dari komponen baru `components/invitation/DeviceBezel.vue`; `bersih`
  tanpa bezel. Tombol zoom −/+ langkah 10 % antara 50–100 % (`zoom` masuk `EditorPrefs`).
  Skala akhir = `min(zoom, pas)`; tetap **tidak melebihi 1** (alasan di komentar Stage:
  memperbesar render berbohong soal ukuran huruf). Tombol "Muat ulang pratinjau" (ikon
  `RotateCw`) menaikkan `key` Renderer → amplop tertutup lagi dan partitur diputar dari awal.
- `Renderer.vue`: prop `compact` diganti `mode: 'live' | 'stage' | 'compact'` (compact tetap
  untuk landing). `stage` = gerbang **dirender** dan partitur dimainkan seperti `live`
  (kontainer 390 sudah memilih skor ringan yang sama dengan ponsel tamu), pemutar musik dan
  dock tetap dirender, RSVP/ucapan dalam mode baca.
- `CoverGate.vue`: prop `contained` → `absolute inset-0` di dalam `.iv-root` (bukan `fixed`),
  tidak menyentuh `document.body.style.overflow`; yang dikunci adalah viewport Stage lewat
  emit `lock`/`unlock`. Renderer meneruskan `contained` saat `mode === 'stage'`.
- Jebakan tercatat: pane tersembunyi mematikan rAF — ukur motion via Playwright headless
  (memori `verifikasi-browser-jebakan`); scan axe mengecualikan panggung yang di-tween (71.5).

### 72.3 Tab Global: preset palet, musik, fokus layar

- `theme.ts`: `ThemePresentation.palettes: ThemePalette[]` (3–4 per tema hidup:
  `{ id, label, tokens:{ background, foreground, primary } }`); setiap palet **lolos
  `checkPalette`** dan dijaga vitest. Kartu "Preset warna" di Global = swatch tiga bulatan +
  nama + font (seperti undang.site); klik = `checkpoint()` + set tokens. Warna kustom tetap
  tiga picker + laporan kontras yang ada.
- Musik: kartu "Musik undangan" di Global persis referensi — `settings.musicUrl` +
  `settings.musicVolume` (0–1) di dokumen (72.0); `music-library.ts` mendapat kolom
  `genre`, `durasi`, `kategori`, `unggulan` (⭐ diurutkan lebih dulu) dan entri "Tanpa musik";
  select berikon + tombol pratinjau ▷ (pemutar `<audio>` yang sudah ada) + baris genre/durasi
  + slider volume + "Unggah MP3" (batas `mediaRules.audio` yang ada).
- "Fokuskan untuk layar": `tokens.tataLetak?: 'kartu' | 'penuh'` (opsional, bawaan ikut
  tema = `kartu` 480 px di desktop). `Renderer.vue` menerjemahkan ke `max-width` `.iv-root`
  di `@min-[48rem]`. Di `tokens` → otomatis tergerbang `design`.
- Sisa tab Global: grid tema, font judul/isi, `MotionPicker`, "Kembalikan semua tulisan".

### 72.4 Gaya teks per kolom

- Kontrak (mengikuti bentuk undang.site yang terkonfirmasi): `sections[].data.textStyles?:
  Record<field, TextStyle>`, `TextStyle = { fontFamily?: FontChoice (hanya font tema),
  fontSize?: 10–96 px, color?: #RRGGBB, fontWeight?: 'bold', fontStyle?: 'italic' }`,
  `.strict()`, kunci hanya kolom teks tipe itu (divalidasi per tipe di union 72.0).
  `designFingerprint` di API ditambah pembacaan `textStyles` + `latar` semua section.
- Render: composable `useTextStyle(key)` di `apps/web/composables/` mengembalikan
  `style` (`font-family` dari peta font yang sudah ada, `font-size` = `calc(1em * skala)`
  dengan skala `0.8/0.9/1/1.15/1.35`, `color` dari peran `--iv-fg/--iv-primary/--iv-muted`
  atau hex, `text-align`). Komponen `InvitationText.vue` (`<component :is="tag">`) dipakai
  di 13 `sections/*.vue` + `CoverGate` menggantikan `<p class="iv-…">` untuk kolom yang
  terdaftar. Aturan DESIGN.md "script bukan di paragraf": font script hanya ditawarkan untuk
  kunci `*.title` / nama.
- Form: `components/dashboard/editor/TextStyleField.vue` — kartu kolom = label + input +
  `<details>` "Gaya teks" (select font, 5 chip ukuran, chip warna peran + picker hex,
  perataan, tebal, tombol "Ikuti tema" yang menghapus kunci). Hex kustom dicek
  `contrastRatio` terhadap `tokens.background` (≥ 4.5) sebelum diterima; publish tetap
  memakai `checkPalette` + pemeriksaan semua `tokens.teks[*].warna` hex.
- `CopyFields.vue` dan form inline di `editor.vue` memakai `TextStyleField`. Saat itu juga
  form per section **diekstrak** ke `components/dashboard/editor/forms/<Type>Form.vue`
  (satu per tipe, props `section` + emit `update`) supaya `editor.vue` turun di bawah
  ~700 baris — refactor mekanis, tanpa mengubah perilaku.

### 72.5 Tab Ornamen: manajemen ornamen kita

- Isi tab: (1) "Ornamen di bagian ini" — `SlotSummary` dengan `slots =
  sectionOrnamentSlots[selected.type]` (fase 71) di atas; (2) "Semua slot" — sisa 11 slot
  dikelompokkan per bagian pemakainya; (3) kepekatan ornamen per bagian (enum yang ada di
  cover dipindah ke sini); (4) `BackdropPicker` + bobot; (5) unggahan raster (tab Unggahan
  Studio) + daftar unggahan yang dipakai; (6) tombol "Kembalikan ornamen tema".
- Studio Ornamen dialog tetap; dibuka dari `SlotCard`. `ornamenDisembunyikan` dihormati.
- Bagian yang dipilih di rail menyorot slotnya; klik slot menggulir panggung ke bagian
  pemakainya (`focusSection` yang sudah ada).

### 72.6 Generator & Ucapan

- `guests.vue` jadi halaman **Generator** dengan tiga blok referensi: (1) 5 kartu gaya
  bahasa `formal | islami | nonmuslim | santai | bilingual`; (2) komposer pesan: textarea
  gelembung WhatsApp, chip sisip `{{nama_tamu}}` `{{tautan_undangan}}`, hitung karakter,
  "Reset bawaan", simpan otomatis (debounce 800 ms) ke `invitation.shareSettings`
  (kolom Prisma `Json?` baru; endpoint `PATCH /invitations/:id/share-settings`); teks bawaan
  tiap gaya dirakit dari `event`/`map` dokumen; banner "Undangan aktif & siap dibagikan";
  (3) daftar tamu: statistik Total / Terkirim / Belum, tombol Tambah, Import Excel/CSV
  (yang ada), Tempel Teks, Template Excel, Export CSV, pencarian, filter status, kategori,
  tabel dengan aksi "Kirim WA" (`https://wa.me/<phone>?text=` dari template + `buildGuestUrl`),
  salin, sunting, hapus. Prisma `Guest` + kolom `phone String?`, `category String?`,
  `sentAt DateTime?`; "Kirim WA" menandai `sentAt`.
- `rsvps.vue` jadi halaman **Ucapan** (moderasi ucapan + RSVP sudah ada); nav Toolbar
  dari 72.1 menghubungkan ketiganya.

### 72.7 Kartu bagikan (og:image)

- Kontrak: `document.kartu?: { latar: 'tema'|'foto', tampilkanNama, tampilkanTanggal,
  tampilkanLokasi, kepekatan: 0–1 }` (di luar `tokens` → tidak tergerbang `design`).
- API Nest `GET /public/share-card/:slug.png` (`apps/api/src/public/share-card.controller.ts`)
  merender 1200×630 dengan `satori` + `@resvg/resvg-js`: nama pasangan, tanggal, lokasi,
  ornamen `divider` tema sebagai SVG, warna dari `tokens`; cache per `publishedRevision.id`
  di disk `/srv/aruna/cache`. Font diambil dari berkas font web yang sudah ada.
- `pages/i/[slug].vue`: `og:image`/`twitter:image` menunjuk ke rute itu dengan `?v=revisi`.
  Kartu pengaturannya di tab Global ("Kartu bagikan") dengan pratinjau `<img>`.

### 72.8 Modal "Pustaka Saya" (asset manager)

- `components/dashboard/MediaLibrary.vue` (dialog reka-ui, pola sama dengan Studio
  Ornamen): header + pencarian nama berkas, dropzone "Upload Foto / Gambar Baru — JPG, PNG,
  WebP, AVIF (maks. sesuai `mediaRules.image`)", grid 4 kolom kartu (thumbnail, nama,
  tanggal, "✓ Pilih", pangkas, hapus), kartu terpilih berbingkai. Sumber: `MediaAsset` Prisma
  lewat `useMediaUploads` (tambah `list`/`delete` bila belum ada di
  `apps/api/src/media/`). Pangkas = `vue-advanced-cropper` rasio bebas, hasil diunggah
  sebagai aset baru.
- `PhotoField.vue` menjadi kartu **Foto komponen** referensi (nama, pratinjau, ✕, "Ganti dari
  Asset Saya") dan dipakai `imageUrl`, `imageUrls[]` (galeri, multi-pilih), `latar.gambarUrl`,
  unggah MP3 (filter audio), serta latar `foto` kartu bagikan.

## Di luar lingkup (tercatat untuk fase 73+)

Kanvas elemen bebas & drag (fase 73), tambah/hapus section, unggahan SVG, autosave (dicabut
fase 18, tetap manual), riwayat versi UI, kolaborasi realtime.

## Verifikasi

- Unit: `pnpm --filter @aruna/contracts test` (skema `tokens.teks`, `tataLetak`, `kartu`;
  batas 200 KB tetap), vitest web: palet preset lolos kontras, `sectionRequired` dan
  `railHidden` selaras dengan `sectionTypes`, `useTextStyle` menghasilkan style yang benar.
- API: spec domain di `apps/api/test/domain` — `designFingerprint` berubah saat `tokens.teks`
  berubah dan **tidak** berubah saat `document.kartu` berubah; share-card mengembalikan PNG.
- E2E (pasangan API+web sesuai memori `run-lokal`, stack owner 3000): tiga tab inspektor
  terbaca axe; rail menyembunyikan bagian opsional dan menolak bagian wajib; zoom mengubah
  `data-preview-stage` scale; klik segel di panggung membuka amplop (Playwright headless
  mengukur `opacity` gerbang → 0); Gaya teks mengubah `font-size` elemen di panggung dan
  hex kontras rendah ditolak; preset palet mengganti tiga token; Generator menyalin tautan
  dengan template; `/i/<slug>` memuat `og:image` yang 200 PNG.
- Bukti akhir: tangkapan layar panggung iPhone/Android/Bersih dan tab Global/Ornamen.
