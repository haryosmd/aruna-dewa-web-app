# Provenance — impor Canva "Putih Cokelat"

Dibuat 2026-09-18 atas permintaan pemilik, yang mengirim 5 berkas SVG hasil ekspor dari akun
Canva Pro-nya sendiri.

**Ini bukan aset original.** Batas lisensinya sama dengan pack impor lain di repo ini; uraian
lengkapnya di [`../canva-cokelat-krem/PROVENANCE.md`](../canva-cokelat-krem/PROVENANCE.md). Semuanya
`"usage": "imported-local-demo"`, tidak masuk `apps/web/public` maupun `ornamentBank`.

| | |
|---|---|
| Template | *Putih Cokelat Elegan Klasik Undangan Pernikahan Mobile Video* |
| Berkas mentah | `source/` — 5 berkas |
| Diterima | 2026-09-18 |

## Kenapa hampir semuanya raster

Kelompok ini nyaris seluruhnya **ukiran relief berwarna**: badan emas dengan bayangan gelap di
atasnya. Yang membentuk reliefnya adalah perbedaan *warna*, bukan perbedaan *bentuk* — di
`bingkai-ukir.svg`, 1.070 dari 1.082 path memakai satu warna badan yang sama dan sisanya bayangan.

Diturunkan ke `currentColor`, relief seperti itu runtuh jadi siluet pekat: benar secara geometri,
menyesatkan sebagai ornamen. Jadi yang disajikan raster ber-alpha yang setia. Satu-satunya
pengecualian `motif-latar`, yang memang dua warna datar dan karena itu jadi glyph `currentColor`.

Ini kebalikan dari keputusan di pack `canva-emas-hitam`, dan alasannya juga kebalikannya: di sana
ornamennya bergaris satu warna, jadi monokrom justru bentuk aslinya.

## Delapan aset dari lima berkas

| Aset | Dari | Bentuk | Pemecahan |
|---|---|---|---|
| `mahkota-ukir` | `mahkota-ukir.svg` | raster | — |
| `sudut-ukir-kiri` · `-kanan` | `sudut-ukir.svg` | raster | **dipotong**, celah bersih di x 324–405 |
| `bingkai-ukir-kiri` · `-kanan` | `bingkai-ukir.svg` | raster | **dipotong** di x 405, dua paruh bercermin (sejak 2026-09-19) |
| `cincin-kawin` | `cincin-bunga.svg` | raster | **dipotong**, celah bersih di y 82–126 |
| `rangkai-bunga` | `cincin-bunga.svg` | raster | **dipotong**, dari berkas yang sama |
| `motif-latar` | `motif-latar.svg` | SVG `currentColor` | satu ubin dari tiga salinan |

**`bingkai-ukir` semula tidak dipecah** (2026-09-18) dengan alasan kedua separuhnya menyusun satu
bingkai tertutup. Pemilik membalik keputusan itu 2026-09-19 (fase 70): dipecah kiri–kanan di
x 405 dan dipasang sebagai keping **sudut**, bukan bingkai — sebagai bingkai utuh ia tidak pernah
dipilih, sebagai sepasang sudut ia berguna. Kedua paruh bertemu di puncak, jadi potongannya
lurus tanpa celah alpha; ujung runcing di tengah ikut ke paruh masing-masing.

**`cincin-bunga.svg` dipecah menurut sumbu Y**, bukan X — cincin di atas, rangkaian bunga di bawah,
dengan celah alpha bersih di y 82–126. Pemecahan kiri–kanan bukan satu-satunya bentuk pemecahan.

**`motif-latar.svg` memuat tiga salinan ubin yang sama** berjajar. Yang diambil satu, karena ubin
memang diulang oleh CSS; menyimpan tiga salinan cuma melipattigakan berkasnya.

| Glyph vektor | Path | Beda piksel | Koordinat utuh |
|---|---|---|---|
| `motif-latar` | 2 | 636 / 653.100 (0,097%) | ya |
