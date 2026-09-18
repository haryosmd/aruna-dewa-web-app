# Studi referensi `canva-sekar`

Sembilan ekspor SVG Canva milik pemilik akun, plus satu ubin damask, diserahkan 2026-09-18
dengan permintaan satu tema undangan khusus yang dibangun dari sana.

**Yang keluar dari folder ini menuju produk adalah angka, bukan bentuk.** Tidak ada satu path
pun yang disalin ke `packs/sekar/`; seluruh koordinat di sana lahir dari `packs/sekar/geometri.mjs`
dan bisa dibangkitkan ulang dengan `node packs/sekar/buat.mjs`. Batasnya ditulis di
`PROVENANCE.md`.

## Cara mengukurnya, dan kenapa begitu

`studi.mjs` merender tiap berkas lewat sharp/librsvg lalu menghitung histogram pikselnya —
**bukan** membaca atribut `fill`-nya. Dua alasan, dan keduanya terbukti pada berkas yang ada:

- Dua referensi terberat isinya PNG cat air tertanam. Atribut `fill`-nya menyebut **satu** warna
  untuk berkas yang di layar punya puluhan.
- Satu referensi memalsukan gradient dengan serpih terklip. Atribut `fill`-nya menyebut **233**
  warna untuk apa yang di layar adalah satu gradasi emas.

Membaca atributnya akan salah pada keduanya, dengan cara yang berlawanan. Angka di bawah dan di
`measurements.json` semuanya dari piksel.

## Yang terukur

| Ref | Berkas | Byte | path | fill unik | raster | tinta | Ramp terukur |
|---|---|---|---|---|---|---|---|
| A | sudut sulur | 488 KB | 386 | 3 | 0 | 4,0% | `#5d5245` → `#847665` (88%) → `#dfcdb7` |
| B | pengantin | 669 KB | 394 | 28 | 0 | 19,1% | `#92704b` `#847665` `#d37258` `#edbd7f` |
| C | rozet | 222 KB | 103 | 2 | 0 | 13,7% | `#847665` (12%) → `#bcaa94` (86%) |
| D | karangan daun | 30 KB | **1** | 1 | 0 | 9,2% | `#ae4c92` (99%) |
| E | mahkota | 323 KB | 15 | 1 | 0 | 11,3% | `#f0d9b9` (77%) |
| F | bingkai segi | 516 KB | **774** | **233** | 0 | 4,4% | `#ad832e` → `#c89f3b` → `#f5cd4e`, sembilan stop |
| G | bingkai cipratan | 1,9 MB | 3 | 1 | **2** | 11,0% | `#7f6e7b` · `#d0a051`→`#e3b56b` · `#f6b783`→`#fce4cb` |
| H | gapura | **7,7 KB** | 4 | 2 | 0 | 4,1% | `#745359` (97%) |
| I | oval cat air | **8,0 MB** | 625 | 1 | **2** | 6,0% | `#39553c`→`#b5c8b3` hijau · `#b98250` terakota · `#e49a9e` blush |
| Z | damask | 225 KB | — | — | — | 100% | `#b29f87` (20%) motif di atas `#e9dac3` (40%) kertas |

## Tiga temuan yang menentukan bentuk packnya

**F memakai 516 KB untuk dua poligon emas.** 774 path terklip, 233 warna, dan seluruhnya hanya
meniru satu `<linearGradient>` yang tidak dimiliki format ekspornya. Ini yang membuat keputusan
"digambar ulang, bukan diimpor" bukan sekadar soal lisensi: mengimpornya berarti membawa 516 KB
untuk bentuk yang muat di 2 KB, dan plafon bobot `frame` di repo ini 20 KB.

**G dan I isinya raster, bukan vektor.** Masing-masing dua PNG — satu mask, satu warna — pada
1996×2021 dan 3241×3802. `creation-motion.md` melarang membungkus bitmap dalam SVG lalu
menyebutnya rekreasi vektor, jadi keduanya digambar ulang. Yang ditiru adalah **arah gradasinya**
(pucat di tepi kelopak, pekat di jantung), yang terbaca jelas di histogramnya.

**D adalah satu path tunggal, dan simetris cermin.** Itu yang membuatnya bisa dibelah jadi
`ranting-kiri` dan `ranting-kanan` tanpa kehilangan apa pun — dan permintaan pemilik memang
memecah yang berpasangan kiri-kanan.

## Yang sengaja tidak ditiru

- **B, ilustrasi pengantin.** Figur manusia bukan kategori `ornamentBank`, dan wordmark
  "Undangan" di dalamnya adalah huruf, bukan ornamen.
- **Serpih gradient F.** Ditiru hasilnya, bukan caranya.
- **Warna ungu D dan merah muda G.** Diambil bentuk dan gradasinya; paletnya mengikuti tema.
- **Nama daerah apa pun.** Template Canva bukan dokumen budaya; lihat `packs/sekar/CULTURE.md`.

## Menjalankan ulang

```
node docs/features/ornament-builder/imported/canva-sekar/studi.mjs
```

`source/` dan `raster/` **tidak ikut git** — `.gitignore` membuang bahan biner referensi, dan
kesembilan berkas itu 12 MB. Yang ikut adalah `measurements.json`, angka yang dihasilkannya.
Di mesin tanpa berkas sumbernya, skrip ini tidak bisa dijalankan; yang tetap terbaca adalah
hasil ukurnya. Rujukan warna yang benar-benar dipakai produk hidup di
`packs/sekar/raster/damask-asli.webp`, yang terlacak.
