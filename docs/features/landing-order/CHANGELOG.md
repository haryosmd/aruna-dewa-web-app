# Riwayat

## REV-001 — 2026-09-11

Permintaan pengguna menetapkan shadcn-vue, referensi Snapture, landing one-page dengan motion, paket, komentar/testimoni, toast dan aset dummy gratis. Frontend Next dari rencana awal diganti Nuxt mengikuti percakapan pemilihan stack; palet coral/pink diganti cream/ink/terracotta. Layout original dirinci di SPEC; screenshot Snapture belum berhasil diperoleh. Skill UI/UX memberi saran generik pink/soft UI yang tidak dipakai karena bertentangan arah referensi pengguna. Aplikasi belum diimplementasikan.

### Lanjutan setelah interupsi

Empat kandidat foto gratis ditambahkan dalam sources/ASSETS.md. Kontras enam pasangan warna dihitung; border sand hanya 2.24:1 terhadap card, sehingga ditambahkan input-border #574642 dengan 8.68:1. Pasangan putih/primary memenuhi 5.14:1. Verifikasi ini numerik, belum audit visual atau browser aplikasi.

## REV-002 — 2026-09-11: arsip aset

Atas permintaan pengguna, screenshot asli dan gambar fitur web disimpan dalam sources/assets. Manifest checksum dan GALLERY.md ditambahkan; docs/ tetap gitignored. Tidak ada perubahan aplikasi.

## REV-003 — 2026-09-11: aset produksi dekoratif

Empat foto CC0 Wikimedia Commons diunduh, dibuka secara visual dan disimpan sebagai original audit serta turunan WebP di `apps/web/public/images/`: `hero.webp` (longest edge 1600px), `couple.webp`, `rings.webp`, dan `venue.webp` (masing-masing longest edge 1000px). Author, source/license URL, checksum dan dimensi dicatat pada `sources/ASSETS.md`. Kandidat Unsplash/Pexels sebelumnya tidak dipakai karena page source terhalang redirect verifikasi atau Cloudflare challenge. Tidak ada aset Katsudoto/Dribbble yang digunakan sebagai aset produksi.

## REV-004 — 2026-09-11: implementasi frontend

Landing Nuxt menggunakan palet cream, ink, terracotta, fotografi proyek, dan renderer Aruna Bloom yang sama dengan halaman publik/editor. Katalog, error, dan retry dibaca dari API. Demo `/i/demo` diberi label jelas dan tidak menyimpan RSVP.

## REV-005 — 2026-09-12: landing & dasbor setelah rombak ornamen (Fase 3–4)

Section "Momen bahagia" dihapus seluruhnya — komponen, mount, entri nav, dan barisnya di
DESIGN.md. Keenam `/images/*.webp` tetap ada karena semuanya dipakai di tempat lain.

Koleksi tema dikecilkan jadi 4-up dan tiap kartu memakai ladang ornamen temanya sendiri,
dengan pancingan yang **diturunkan dari data** ("15 ornamen khas · amplop laurel") sehingga
tidak basi saat bank ornamen berubah.

Section dasbor berhenti memakai tiruan yang digambar tangan. `pnpm capture:dashboard`
memotret dasbor yang sungguhan lewat akun QA, dengan `reducedMotion: 'reduce'` supaya tiap
potret menangkap keadaan istirahat yang sama, bukan satu frame acak di tengah reveal.
Prosedur regenerasinya di `DASHBOARD-SHOWCASE.md` — tiruan selalu berbohong pelan-pelan,
karena ia tidak ikut berubah saat dasbornya berubah.

Tes `scrollWidth <= innerWidth` di landing sempat terbaca gagal (1873 di lebar 1440).
Setelah diukur, layout yang sudah tenang tidak meluber sama sekali — 1440 = 1440, nol elemen
lolos klip; yang tertangkap adalah baris carousel sebelum hidrasi. Aturannya **tidak**
dilonggarkan, hanya momen ukurnya dijadikan poll.

## REV-006 — 2026-09-13: berat potret dasbor & kedip judul hero (Fase 06–07)

`apps/web/public/dashboard/` memuat **1,38 MB PNG** di landing (`editor-desktop.png` sendiri
436 KB). Fase 4 menutupnya dengan perintah `cwebp` opsional di akhir `capture-dashboard.ts`
dan catatan "`cwebp` tidak ada di mesin ini" — langkah manual yang karena itu tidak pernah
dijalankan. Skrip sekarang meng-encode sendiri lewat `sharp` (`quality: 84`, `effort: 6`),
jadi tidak ada langkah opsional yang bisa terlewat lagi. Sepuluh berkas yang sama: **471 KB,
turun 65%**. Markup di `Dashboard.vue` menunjuk ke `.webp`.

`sharp` masuk sebagai devDependency root. `pnpm add` itu ikut me-resolve ulang range yang
mengambang dan meninggalkan **vite 7 dan vite 8 sekaligus** di satu tree; `tailwindcss()` lalu
bertipe `Plugin` dari vite yang berbeda dengan yang dibaca `defineNuxtConfig`, dan
`pnpm typecheck` gagal di `nuxt.config.ts` tanpa satu baris kode pun berubah. Dipaku dengan
`overrides: { vite: ^8.2.0 }` di `pnpm-workspace.yaml`.

Patokan pertama sempat `^7.3.6` dan itu **salah**: `pnpm typecheck` hijau, tapi `nuxt dev` mati
di `transformWithOxc is not exported by vite` — `@nuxt/vite-builder@4.5.2` menuntut `^8.2.0`.
Typecheck hijau tidak membuktikan builder-nya jalan; patokan versi builder wajib diuji dengan
menyalakan dev server, bukan hanya dengan gerbang tipe.

**Judul hero berkedip.** `revealText` membungkus tiap baris dengan `.split-line-wrap
{ overflow: hidden }` lalu mendorongnya keluar sebelum memasukkannya kembali — tapi
pembungkus itu baru dibuat setelah `import('gsap')` selesai, sementara teksnya sudah dirender
server dan sudah dicat. Urutan yang benar-benar dilihat pengunjung dengan sambungan lambat:
judul terbaca → hilang → masuk lagi dari bawah. Judul hero adalah elemen LCP landing.

Gerakan masuk yang tidak digerbangi scroll sekarang hanya berjalan kalau modul motion tiba
dalam 200ms; kalau lebih lama, teks dibiarkan di keadaan istirahatnya. Reveal ber-`trigger`
tidak disentuh — elemen di bawah lipatan belum pernah terlihat, jadi tidak ada yang berkedip.
Diverifikasi dengan menurunkan anggaran ke 0: judul hero tidak dibungkus sama sekali
(`0` pembungkus) sementara 19 reveal bergerbang scroll tetap terpasang.

---

## REV-007 — 2026-09-14: potret dasbor mengikuti editor yang diperbaiki (Fase 11)

Case-study dasbor di landing memakai potret sungguhan justru supaya ia tidak bisa berbohong.
Kali ini ia bekerja seperti seharusnya: cacat tata letak editor di 1440 — kolom pengaturan
tersempit dari tiga, tombol urutan menempel ke kolom sebelah — terlihat lebih dulu di landing,
bukan di dasbornya. Perbaikannya di `apps/web/pages/dashboard/`, tercatat di
`docs/features/invitation-builder/CHANGELOG.md`; di sini hanya akibatnya.

Sepuluh berkas ditulis ulang lewat `pnpm capture:dashboard`. Nama berkas dan viewport tidak
berubah (1440×900 @1,5 → 2160×1350), jadi atribut `width`/`height` di `Dashboard.vue` tetap.
Berat total praktis tidak bergeser: **483.080 → 487.388 byte (+4,3 KB, +0,9%)**.
Hampir semuanya dari `editor-desktop.webp` (108.188 → 111.548 byte) — potretnya kini memuat
lebih banyak isi, bukan lebih banyak ruang kosong. Delapan berkas lain bergeser di bawah 500
byte masing-masing: itu sisa re-encode ditambah penghitung revisi draft yang memang ikut naik,
bukan perubahan tata letak — prop `width` yang baru tidak menyentuh halaman selain editor.

**Koordinat callout ikut bergeser, dan ini yang hampir terlewat.** Pill "Pratinjau ikut berubah
saat kalian mengetik" dipasang dengan persen (`x: 79`), sementara jalur pratinjau di editor
pindah dan menyempit. 79% tidak lagi menunjuk ke pratinjau; pusatnya sekarang ~87%. Dipasang di
`x: 85, y: 45` — bukan 87 — supaya pill selebar 13rem tetap di atas pratinjau tanpa menempel ke
tepi kanan jendela: terukur 77,5%–92,5% dari lebar potret, keduanya di dalam batas.

Pelajarannya masuk ke `DASHBOARD-SHOWCASE.md` sebagai langkah wajib: setiap kali potret diambil
ulang, koordinat callout diperiksa ulang terhadap potret yang baru. Callout berpersen menunjuk
ke tata letak, dan tata letak yang berubah adalah alasan potretnya diambil ulang.

`public.spec.ts:235` tetap hijau — kelima potret termuat di ketiga viewport.

---

## REV-008 — 2026-09-14: potret ikut pemilih perangkat (Fase 12)

Potret diambil ulang lagi setelah editor dapat pemilih perangkat di rel pratinjau. Kali ini
landing ikut mendapat sesuatu yang lebih dari sekadar layar yang lebih rapi: tombol
**Ponsel / Tablet / Laptop** terlihat langsung di potret, berikut baris "Selebar 390px ·
diperkecil 82%". Itu menjawab keberatan yang selama ini hanya bisa dijanjikan lewat kalimat —
"bagaimana tampilannya di HP tamu saya?" — dengan menunjukkan kontrolnya, bukan menceritakannya.

Berat: **487.388 → 487.936 byte (+548 byte)**. `editor-desktop.webp` 111.548 → 112.098.

Koordinat callout diperiksa ulang sesuai langkah wajib yang baru ditambahkan di
`DASHBOARD-SHOWCASE.md`. Rel pratinjau memang bergeser lagi (selokan 20 → 32px, rel 304 → 320px),
tapi `x: 85, y: 45` masih tepat: terukur **77,5%–92,5%** horizontal dan **41,7%** vertikal dari
potret, seluruhnya di dalam batas, dan pill-nya masih mendarat di atas pratinjau. Diperiksa,
bukan diasumsikan — itu justru inti langkahnya.

Teks callout dibiarkan: "Pratinjau ikut berubah saat kalian mengetik" masih benar dan masih
klaim yang paling penting. Pemilih perangkat sekarang terbaca sendiri di potretnya.

`public.spec.ts:235` tetap hijau.

---

## REV-009 — 2026-09-19: pratinjau `/order` per langkah, selebar ponsel (Fase 65)

Panel kanan wizard tidak lagi menggulung seluruh undangan bawaan. Tiap langkah merender hanya
section yang ia sentuh (`apps/web/utils/order-preview.ts`), selebar 390px lewat
`InvitationPhoneFrame` yang diperkecil sampai muat di viewport, dan baru di langkah paket seluruh
undangan tampil dan bisa digulung. Di bawah `lg` panelnya disembunyikan; yang tersisa satu baris
"Tampil sebagai … · arunadewa.id/i/…" di bawah judul langkah.

Alasannya ada di `docs/ROADMAP.md` (Fase 65). Yang penting untuk landing: potret alur pesanan di
`verification/` kini menunjukkan nama pasangan di lipatan pertama pratinjau — klaim "pratinjau ikut
berubah saat kalian mengetik" akhirnya terlihat, bukan dijanjikan. Potret belum diambil ulang.

## REV-010 — 2026-09-19 — Fase 69.5, tombol "Buat tema versi Anda sendiri"

- Header koleksi tema (`landing/Themes.vue`) mendapat tombol outline → `/order?langkah=tema&addon=design`;
  `Cta.vue` tidak disentuh (sudah memegang dua aksi).
- `/order` membaca `?langkah=` (`langkahDariQuery()`, nama langkah bukan angka) dan `?addon=design`;
  catatan di langkah Tema; `checkout()` mengembalikan ke langkah 1–2 yang belum lengkap. Login tetap
  wajib sebelum `/order` — `?next=` membawa query-nya utuh.
- E2e: publik memeriksa tautan dan pengalihan; dasbor (masuk) memeriksa langkah Tema terbuka, catatan
  tampil, dan `addonIds` draft berisi `design`.
