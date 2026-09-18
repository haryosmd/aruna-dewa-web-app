# Provenance — impor Canva "Putih Hijau"

Dibuat 2026-09-18 atas permintaan pemilik, yang mengirim 3 berkas SVG hasil ekspor dari akun
Canva Pro-nya sendiri.

**Ini bukan aset original.** Batas lisensinya sama dengan pack impor lain di repo ini; uraian
lengkapnya di [`../canva-cokelat-krem/PROVENANCE.md`](../canva-cokelat-krem/PROVENANCE.md) dan tidak
diulang di sini. Semuanya `"usage": "imported-local-demo"`, tidak masuk `apps/web/public` maupun
`ornamentBank`. Aturan konversinya di [`../lib/convert.mjs`](../lib/convert.mjs); tiap `d` disalin
karakter per karakter dan diuji dengan pemeriksaan "koordinat utuh".

| | |
|---|---|
| Template | *Putih Hijau Bunga Floral Minimalist Undangan Pernikahan Instagram Story* |
| Berkas mentah | `source/` — 3 berkas, disimpan apa adanya |
| Diterima | 2026-09-18 |

## Empat aset dari tiga berkas

| Aset | Bentuk | Catatan |
|---|---|---|
| `sudut-bunga-kiri` · `sudut-bunga-kanan` | PNG + WebP ber-alpha | **Dipecah** dari satu berkas; celah alpha bersih di x 462–507 |
| `hati-rangkai-a` · `hati-rangkai-b` | SVG `currentColor` | Sepasang komposisi hati bercermin, sudah terpisah di sumbernya |

Sudut bunganya raster karena bunganya memang bitmap di dalam SVG sumbernya. Pemecahannya memakai
**celah alpha** yang terukur, bukan titik tengah yang ditebak: kolom 462–507 sama sekali tidak
bertinta, jadi potongannya tidak menyentuh satu pun kelopak.

## Kesetiaan terukur

| Glyph | Path | Beda piksel | Koordinat utuh |
|---|---|---|---|
| `hati-rangkai-a` | 8 | **0** / 504.000 | ya |
| `hati-rangkai-b` | 8 | **0** / 504.000 | ya |
