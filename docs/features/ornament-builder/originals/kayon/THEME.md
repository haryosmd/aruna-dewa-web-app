# Usulan tema `aruna-kayon`

**Status: usulan, belum dipasang.** Berkas ini menyiapkan pemetaan supaya pemasangan nanti
tidak perlu menebak. Tidak ada berkas di `apps/` yang disentuh oleh pack ini.

## Palet

Diturunkan dari warna terukur di `../../sources/canva-cokelat-krem/WARNA.md`, lalu digeser
terang-gelapnya sampai keempat pasangan kontras lolos. Hue dan saturasi hasil pengukuran
dipertahankan.

| Token | Nilai |
|---|---|
| `background` | `#F4EFE7` |
| `foreground` | `#2A1F1B` |
| `primary` | `#8C4F55` |
| `accent` | `#6C524B` |

Diverifikasi `python3 scripts/contrast-check.py` pada 2026-09-17:

| Pasangan | Rasio | Ambang | Hasil |
|---|---:|---|---|
| `foreground` / `background` | 14,00:1 | 4,5 | lolos |
| `accent` / `background` | 6,23:1 | 4,5 | lolos |
| `primary` / `background` | 5,45:1 | 4,5 | lolos |
| tinta tombol `#FFFDF7` / `primary` | 6,14:1 | 4,5 | lolos |

`primary` `#8C4F55` di atas tan `#DFCCBB` hanya **4,01:1** — gagal untuk teks biasa. Tan
bukan token tema, jadi ini tidak menggagalkan preset; tapi kalau tan nanti dipakai sebagai
latar kartu, teks di atasnya wajib `foreground`, tidak boleh `primary`.

Tema ini **tidak** memakai emas. Referensinya tidak punya emas sama sekali (`WARNA.md`).

## Pemetaan slot ornamen

`DESIGN.md`: `frame`, `divider`, `corner`, `motif`, `symbol`, dan `seal` **tidak pernah
berulang antar tema**. `floral`, `monogram`, dan `garland` boleh berbagi. Semua slot di
bawah diisi glyph yang hanya ada di pack ini.

| Slot | Glyph | Catatan |
|---|---|---|
| `frame` | `bingkai-kayon-polos` | Interior bersih; kartu nama tidak boleh ditabrak tatahan |
| `divider` | `pemisah-medalion` | Padanan pita batik referensi |
| `corner` | `sudut-kayon` | |
| `motif` | `motif-medalion` | |
| `symbol` | `simbol-kayon` | |
| `seal` | `segel-kayon` | Gerbang amplop |
| `monogram` | `monogram-kayon` | |
| `floral` | `mawar-mekar` | |
| `floralAlt` | `tangkai-daun` | |
| `garland` | `layer-patran-gantung` | |
| `layers` | `layer-rumpun-kayon`, `layer-kayon-tunggal`, `layer-sulur-mawar`, `layer-pita-medalion`, `layer-dedaunan` | Lima keping ladang |

`backdrop`: `{ motif: { src: '/textures/kayon-pita-medalion.svg', size: '140px', opacity: 0.05 } }`

Jangkar keping mengikuti pengukuran zona di `MOTION.md` — densitas baris bawah 1,09–1,29 vs
baris atas 0,70–0,92, jadi keping bermassa (`layer-rumpun-kayon`) bertumpu di tepi bawah.

## Sisa 28 glyph

Sebelas slot memakai sebelas glyph; 28 sisanya adalah varian yang tidak masuk preset:
bingkai kembar/medalion/tumpal/lung, lima pemisah lain, empat sudut lain, empat motif lain,
dan sebagainya. Mereka ada supaya pasangan yang membeli fitur `design` punya pilihan, dan
supaya slot bisa ditukar tanpa menggambar ulang.

## Yang harus dikerjakan sebelum ini bisa dipasang

Tidak satupun dikerjakan oleh pack ini.

1. **Pasangan font belum ada.** Font referensi tidak teridentifikasi (`LIMITS.md`). Setiap
   preset di `theme.ts` menuntut `body` dan `script`; keduanya masih kosong untuk tema ini.
2. **Glyph jadi komponen Vue.** 39 SVG perlu menjadi komponen di
   `apps/web/components/ornament/` dan tercatat di `apps/web/utils/ornaments.ts` (component,
   name, category, ratio, slot lapis). Ini pekerjaan mekanis tapi belum dikerjakan.
3. **Tiga ubin tekstur ke `apps/web/public/textures/`**, bukan ke `components/ornament/`.
   Tekstur tidak masuk `ornamentBank` — `DESIGN.md`.
4. **Menambah template id menyentuh `packages/contracts` dan tes tema.** Belum diperiksa.
5. **Axe per-tema.** `tests/e2e/public.spec.ts` memindai tiap tema sendiri. Tema baru berarti
   kasus uji baru, dan keempat pasangan kontras di atas harus dihitung ulang oleh tes itu,
   bukan hanya oleh skrip manual.
6. **Penelusuran kultural.** `CULTURE.md`: kalau tema ini dijual dengan klaim kultural,
   penelusuran ke sumber otoritatif harus dikerjakan lebih dulu. Belum dikerjakan.
