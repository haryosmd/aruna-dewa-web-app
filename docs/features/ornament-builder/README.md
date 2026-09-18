# Ornament Builder — Aruna Dewa

Skill, arsip riset, dan paket ornamen original untuk menyiapkan tema undangan.

**Sejak fase 53 fitur ini menyentuh aplikasi.** Kalimat lama di sini berbunyi "tidak mengubah
aplikasi, kontrak backend, atau tema aktif", dan itu benar selama pack-nya hanya menganggur di
`docs/`. Pack `sekar` menyeberang: ia mengisi `templateIds` dan `liveTemplateIds` di
`packages/contracts`, satu entri `themePresentation`, satu kolam varian, dan satu ubin di
`apps/web/public/textures/`. Jalur menyeberangnya tetap satu dan tetap lewat
`pnpm ornament:pack`; yang berubah adalah bahwa ia sekarang dipakai.

## Buka hasil

**Pack Sekar (fase 53, 22 glyph) — satu-satunya yang sudah tayang sebagai tema penuh**

- [Katalog](../../../packs/sekar/catalog.json) · [catatan budaya](../../../packs/sekar/CULTURE.md) · generator [`buat.mjs`](../../../packs/sekar/buat.mjs) + [`geometri.mjs`](../../../packs/sekar/geometri.mjs).
- [Studi referensinya](imported/canva-sekar/STUDI.md) dan [batas provenance-nya](imported/canva-sekar/PROVENANCE.md) — sembilan ekspor Canva yang **tidak** menyeberang ke produk.
- Tayang sebagai `aruna-sekar`: `/i/demo?tema=aruna-sekar`. Lembar kontak lokal: `node packs/sekar/lihat.mjs [gelap]`.

**Pack Ronce Melati (fase 31, 45 glyph)**

- [Demo Ronce Melati](originals/melati/demo/index.html): cover, kartu acara fiktif, tabel resep motion, dan galeri seluruh 45 glyph.
- [Katalog](originals/melati/catalog.json) · [sumber budaya](originals/melati/CULTURE.md) · generator [`build.mjs`](originals/melati/build.mjs).
- [Motion tahap dua](sources/canva/MOTION-DALAM.md): bentuk kurva dan peta ruang dari sembilan klip Canva — **baca ini sebelum menyetel angka motion apa pun**.

**Pack Taman Pasundan (fase 30, 8 aset)**

- [Demo Taman Pasundan](originals/sunda/demo/index.html): cover, kisah, acara fiktif, dan koleksi delapan ornamen.
- [Katalog original](originals/sunda/catalog.json): enam SVG editable + dua ilustrasi alpha PNG/WebP.
- [Sumber budaya](originals/sunda/CULTURE.md) dan [provenance generasi](originals/sunda/GENERATION.md).

**Impor Canva — 58 aset dari 9 template (bukan original)**

| Pack | Aset | Isi |
|---|---|---|
| [Cokelat Krem](imported/canva-cokelat-krem/PROVENANCE.md) | 6 | Kayon, sepasang daun sulur, pita ceplok, dua rangkaian mawar |
| [Krem Wayang](imported/canva-krem-wayang/PROVENANCE.md) | 7 | Tiga kayon, sepasang lampion ronce, pita tekstur, rumah joglo |
| [Rumah Jawa Barat](imported/canva-rumah-jawa-barat/PROVENANCE.md) | 3 | Sepasang ukiran sudut **dipecah**, Rumah Julang Ngapak |
| [Emas Hitam](imported/canva-emas-hitam/PROVENANCE.md) | 13 | Sudut daun, pita sulur, pita tipis, mega mendung, empat gunungan — lima berkas **dipecah** |
| [Emas Cokelat](imported/canva-emas-cokelat/PROVENANCE.md) | 11 | Sudut gunungan, sulur, lengkung latar, cahaya, dan **pengantin Jawa: utuh + pria + wanita** |
| [Putih Cokelat](imported/canva-putih-cokelat/PROVENANCE.md) | 7 | Ukiran relief (raster), cincin, rangkaian bunga, motif latar |
| [Coklat Krim](imported/canva-coklat-krim/PROVENANCE.md) | 6 | Gunungan monogram, sudut bergaris, wayang sepasang, sapuan kuas |
| [Putih Hijau](imported/canva-putih-hijau/PROVENANCE.md) | 4 | Sepasang sudut bunga **dipecah**, dua komposisi hati |
| [Merah Emas](imported/canva-merah-emas/PROVENANCE.md) | 1 | Kayon sudut merah — **sengaja tidak dipecah**, dan alasannya ada di sana |

- **Baca `PROVENANCE.md` masing-masing lebih dulu.** Geometrinya milik template Canva, diekspor pemilik; status lisensinya belum diputuskan dan belum disetujui untuk produksi.
- Konverter bersamanya di [`imported/lib/`](imported/lib/convert.mjs); tiap `build.mjs` hanya daftar glyph.
- Semuanya tampil di seksi bertanda sendiri pada demo Ronce Melati, tidak dicampur ke pack original.

**Arsip riset**

- [Galeri delapan situs](sources/index.html): unduhan gambar, screenshot, font, motion, dan laporan per situs.
- [Arsip Canva](sources/canva/README.md): sembilan preview MP4 dengan profil motion terukur. Riset, bukan aset.
- [Hasil verifikasi](verification/RESULTS.md).
- Skill: [aruna-ornament-builder](../../../.claude/skills/aruna-ornament-builder/SKILL.md).

HTML dapat dibuka langsung karena demo menggunakan file lokal. Untuk browser preview, jalankan dari root proyek:

```sh
rtk proxy python3 -m http.server 4178 --bind 127.0.0.1 --directory docs/features/ornament-builder
```

Lalu buka `http://127.0.0.1:4178/originals/melati/demo/index.html`,
`/originals/sunda/demo/index.html`, atau `/sources/index.html` pada server tersebut. Server hanya
menyajikan folder feature, bukan seluruh repo.

Membangun ulang pack melati dari nol (semua deterministik, aman dijalankan berulang):

```sh
rtk proxy node docs/features/ornament-builder/originals/melati/build.mjs
rtk proxy node docs/features/ornament-builder/originals/melati/demo.mjs
rtk proxy node .claude/skills/aruna-ornament-builder/scripts/validate.mjs docs/features/ornament-builder/originals/melati
rtk proxy node docs/features/ornament-builder/originals/melati/verify.mjs   # butuh server statis di 4179
```

Tiap pack impor dibangun ulang terpisah, lalu demo dirakit ulang supaya seksinya ikut terbarui:

```sh
for p in $(ls docs/features/ornament-builder/imported | grep -v lib); do
  rtk proxy node docs/features/ornament-builder/imported/$p/build.mjs
  rtk proxy node .claude/skills/aruna-ornament-builder/scripts/validate.mjs docs/features/ornament-builder/imported/$p
done
rtk proxy node docs/features/ornament-builder/originals/melati/demo.mjs
```

## Pakai skill kembali

Contoh prompt:

> Gunakan $aruna-ornament-builder untuk audit ornamen dan font dari URL undangan ini. Simpan bukti dan aset dalam arsip riset Aruna Dewa.

> Gunakan $aruna-ornament-builder untuk merancang paket ornamen Sunda botanical sage/ivory dari katalog yang ada. Jelaskan kecocokan budaya dan motion, lalu buat kekurangan asetnya.

Skill berisi alur hunting, kurasi budaya, recreate SVG/raster, motion dan perakitan paket. Helper rekomendasi memakai tag/metadata dan alasan pemilihan; penilaian visual serta riset tetap dilakukan agent. Ini bukan model yang dilatih sendiri atau layanan AI latar belakang.

## Temuan Inspect dan font

Kedelapan referensi memuat **Bisdev Browser Protection**. Handler skrip mencegah klik kanan, F12, Ctrl/Cmd+U/S, beberapa Ctrl/Cmd+Shift shortcut DevTools, dan Cmd+Option+I/J/C. Pada sesi browser, event contextmenu sintetis dibatalkan di delapan halaman. Ini menjelaskan hilangnya menu klik kanan/shortcut; tidak membuktikan semua bentuk DevTools selalu tak dapat dibuka.

HTML/CSS/network tetap dapat dibaca dalam sesi pengumpulan. Font harus ditelusuri melalui stylesheet dan rendered glyph, bukan hanya menu Inspect pada gambar. Nama font dalam CSS bisa berbeda dari nama internal file/font fallback; laporan membedakan deklarasi, computed style, dan CDP platform fonts.

Belum ada bukti yang menetapkan Canva sebagai asal ilustrasi. Lokasi hosting WordPress atau penggunaan Elementor/Bisdev tidak membuktikan sumber pembuat gambar.

## Batas arsip

Arsip adalah hasil pengamatan mobile pada waktu tertentu, bukan salinan lengkap seluruh website. Foto contoh, ikon, dan font global ikut terinventaris; tidak semuanya ornamen yang dipakai pada halaman itu. Audio/video dan dokumen embed tidak disalin sebagai aset ornamen. Setiap laporan mencatat kegagalan/pengecualian. Aset kompetitor tetap research-only di docs gitignored; paket Sunda memiliki provenance original terpisah.

## Bank referensi pemilik — 2026-09-18

[Galeri 65 SVG/PNG sesuai kiriman](originals/melati/demo/referensi/index.html) tersedia dari tautan pada `#impor`. Sumber produksi di `packs/referensi/` dan `apps/web/public/ornaments/referensi/`. Jalankan `pnpm ornament:reference` untuk membangun ulang, `pnpm ornament:reference:verify` untuk bukti visual. Skill tersedia identik di Codex dan Claude; panggil `$aruna-ornament-builder` dengan gambar referensi.
