# Aset yang benar-benar dimuat halaman referensi

Dibaca 2026-09-22 dari `https://arunadewa.undang.site/` (font terkomputasi + elemen `<audio>`).
Dicatat untuk perbandingan, **bukan untuk disalin** — semuanya milik pihak lain.

## Font

| Keluarga | Dipakai untuk | Padanan kita |
|---|---|---|
| Cormorant Garamond | judul serif | ada — `fontChoices` `cormorant`, dipakai `aruna-bloom` dan `aruna-sekar` |
| Great Vibes | nama mempelai, huruf sambung besar | ada — `--iv-script` (`utils/theme.ts:547`) |
| Dancing Script | caption, huruf sambung kecil | ada — sama, dipilih per tema |
| Manrope | teks badan, label huruf besar | ada — `--iv-body` |

Keempatnya sudah ada di pustaka font kita, jadi tidak ada yang perlu ditambahkan. Yang berbeda
adalah **pemasangannya**: referensi memakai satu pasangan tetap, kita memilihnya per tema
(`themePresentation`, `utils/theme.ts:101-326`) dan pasangan bisa menimpanya lewat `tokens.font`
/ `tokens.bodyFont`.

## Audio

Satu berkas: `assets/audio/FLY-ME-TO-THE-MOON-Piano-Version.mp3`.

Ini rekaman berhak cipta, dan ia menjelaskan kenapa pustaka lagu kita kosong dari lagu populer:
`../../sources/MUSIC.md` mencatat bahwa satu-satunya rekaman Indonesia di Commons semuanya
CC BY-SA, bukan CC0/PD. Referensi tidak menghadapi masalah itu karena mereka tidak
mendistribusikan pustaka — pasangannya mengunggah sendiri. Kita **juga** mengizinkan unggahan
MP3 sendiri (`PhotoField` filter audio, fase 72.8), jadi jalur itu sudah ada; yang belum ada
adalah lagu berlisensi bebas untuk pustaka bawaan. Itu keputusan lisensi, bukan teknis, dan
tetap terbuka di `docs/ROADMAP.md`.

## Foto dan ornamen

Foto pasangan, nama, dan nomor rekening pada halaman referensi adalah data pemiliknya sendiri
dan tidak pernah masuk produk. Ornamen floral garis tipis, damask latar, dan segel lilinnya
**tidak** disalin: padanan kita digambar sendiri dan hidup di `packs/` yang terlacak git
(lihat `docs/features/ornament-builder/`).
