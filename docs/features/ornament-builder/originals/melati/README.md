# Ronce Melati — pack ornamen original

45 glyph SVG bermassa, digambar 2026-09-17 (fase 31). **Belum dipasang sebagai tema aplikasi.**

| Berkas | Isi |
|---|---|
| `svg/<id>.svg` | 45 glyph, `currentColor`, path/group yang bisa disunting |
| `catalog.json` | Katalog v1: kategori, tag, peran budaya, provenance, resep motion, SHA-256 |
| `CULTURE.md` | Sumber budaya, dan **apa yang tidak diklaim** — baca sebelum menulis salinan pemasaran |
| `build.mjs` | Generator geometri. Deterministik; menulis ulang `svg/` dan `catalog.json` |
| `demo.mjs` | Perakit `demo/index.html` (SVG di-inline, `id` diberi akhiran instance) |
| `verify.mjs` | Playwright + axe: 360/768/1440, reduced-motion, tanpa-JS, jeda offscreen |
| `demo/` | Demo offline: cover, kartu acara fiktif, tabel resep motion, galeri 45 glyph |

## Isi per keluarga

frame 5 · divider 6 · corner 6 · floral 6 · layer 6 · monogram 3 · motif 5 · symbol 4 · seal 3 · venue 1

## Aturan bentuk

Dari `DESIGN.md`, dan dipatuhi oleh seluruh 45 glyph (diaudit, bukan diasumsikan):

- Badan bentuk `fill="currentColor"` bertanda `data-mass`. **Tidak ada glyph yang seluruhnya outline.**
- Detail bergaris `stroke-width` **2,5–4 dalam satuan viewBox**, bertanda `data-draw`.
- **Dua bidang nilai per glyph** (opacity 1 dan 0,45). Enam glyph anyaman tidak punya `data-draw`
  sama sekali; bidang keduanya datang dari pita belakang yang memang berada di `opacity .45`.
- Cincin dan bingkai berongga lewat `fill-rule="evenodd"`, bukan diisi penuh.

Dua jebakan yang sudah ditemukan dan tidak boleh diulang saat menyunting:

1. **Lingkaran jangan digambar sebagai satu busur** yang titik awal dan akhirnya hampir berimpit.
   Penyelesaian pusatnya membagi dengan tali busur mendekati nol; `monogram-cincin` versi pertama
   keluar sebagai dua gumpalan terisi penuh. Pakai `circlePath`/`ringPath` (dua busur 180°).
2. **Massa berwarna sama di atas massa tidak pernah terlihat.** Detail di dalam sebuah bentuk harus
   jadi rongga `evenodd`, bukan ditumpuk di atasnya.

## Motion

Angkanya dari `../../sources/canva/MOTION-DALAM.md`, bukan dari selera: masuk `power1.out` 0,9 s,
stagger 0,5 s, seluruh gerak masuk tuntas di bawah 2,5 s, zona teks tidak dianimasikan.
Konsekuensinya **maksimal empat keping ber-`reveal` per adegan** (0,5 × 3 + 0,9 = 2,4 s), dan batas
itu dipaksakan di `demo/motion.js`, bukan diserahkan ke kedisiplinan penulis markup.

Amplitudo dan periode sway **tidak terukur** — keduanya pilihan, dan ditandai
`amplitudeMeasured: false` di `catalog.json`.

## Membangun ulang

```sh
rtk proxy node docs/features/ornament-builder/originals/melati/build.mjs
rtk proxy node docs/features/ornament-builder/originals/melati/demo.mjs
rtk proxy node .claude/skills/aruna-ornament-builder/scripts/validate.mjs docs/features/ornament-builder/originals/melati
```
