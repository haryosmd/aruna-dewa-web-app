# Provenance — impor Canva "Cokelat Krem"

Dibuat 2026-09-17 atas permintaan pemilik, yang mengirim enam berkas SVG hasil ekspor dari akun
Canva Pro-nya sendiri dan meminta bentuknya dipakai sebagai ornamen.

**Ini bukan aset original, dan berkas ini ada supaya kalimat itu tidak pernah hilang.**

## Asal

| | |
|---|---|
| Template | *Cokelat Krem Elegan Tradisional Undangan Pernikahan Video Seluler* |
| Diekspor oleh | Pemilik, dari akun Canva Pro-nya |
| Berkas mentah | `source/` — enam SVG, disimpan apa adanya, berwarna asli |
| Diterima | 2026-09-17 |

## Yang perlu diputuskan sebelum ini masuk produksi

Aturan yang berlaku sebelum berkas ini ada — `AGENTS.md` ("aset kompetitor tidak pernah masuk
`apps/web/public`") dan fase 30 di `docs/ROADMAP.md` ("template Canva adalah referensi, bukan
sumber aset") — **belum dicabut**. Yang berubah hanyalah: pemilik memberikan berkasnya sendiri dan
memintanya dipakai.

Dua hal yang tidak bisa diselesaikan dari sini, dan keduanya keputusan pemilik, bukan keputusan
teknis:

1. **Lisensi konten Canva** mengatur elemen template yang dipakai di dalam produk, dan umumnya
   tidak mengizinkan elemen dicabut menjadi aset berdiri sendiri yang didistribusikan ulang.
   Undangan yang dijual ke pasangan adalah produk. Ini perlu dibaca terhadap paket Canva yang
   dipegang pemilik.
2. **Elemen di dalam template bisa milik kontributor pihak ketiga**, dengan syarat yang berbeda
   dari template itu sendiri.

Sampai itu diputuskan, tiap aset di sini ditandai `"usage": "imported-local-demo"` di
`catalog.json` dan tampil di demo dalam seksi bertanda peringatan sendiri. Tidak ada satu pun yang
masuk `apps/web/public`, `ornamentBank`, atau `themePresentation`.

**Pack `originals/melati/` tidak disentuh.** Seluruh klaimnya adalah "digambar dari nol"; satu aset
impor yang menyelinap ke dalamnya membuat provenance 45 glyph lainnya ikut tidak bisa dipercaya.

## Apa yang dilakukan konverter, dan apa yang tidak

Aturan konversinya sekarang hidup di `../lib/convert.mjs` dan `../lib/pack.mjs`, dipakai bersama
tiga pack impor; `build.mjs` di sini tinggal daftar glyph dan pemetaan warnanya.

Konverter itu **tidak menggambar ulang apa pun.** Tujuannya memang kemiripan persis, jadi:

- Tiap `d` disalin **karakter per karakter** dari berkas sumber. Ini diuji, bukan diklaim: laporan
  `koordinat utuh` memastikan tiap `d` yang ditulis muncul apa adanya di sumbernya.
- `viewBox` sumber dipertahankan, jadi proporsi dan padding-nya tidak bergeser.
- `clipPath` dipertahankan berikut definisinya, dengan `id` diberi awalan per glyph. Versi pertama
  konverter membuangnya dengan alasan "cuma kotak pembatas"; peta beda di `diff/` membuktikan
  alasan itu salah — ujung tangkai daun memang dipotong olehnya.
- `mask` dan `filter` **juga dipertahankan** sejak 2026-09-18. Semula keduanya dibuang dengan
  alasan "opak seluruhnya" — alasan yang untuk template *ini* kebetulan benar dan lolos dengan
  beda 0 piksel, tapi terbukti salah pada template kayon wayang, yang maskn­ya justru yang membuat
  sapuan lembut di tepi kanan. Aturannya sekarang: seluruh `<defs>` disalin apa adanya dengan
  `id` berawalan. Lihat [`../canva-krem-wayang/PROVENANCE.md`](../canva-krem-wayang/PROVENANCE.md).

Dua hal **sengaja** berbeda dari sumbernya, dan keduanya dipaksa oleh sistem ornamen Aruna:

1. **Warna menjadi `currentColor`.** Ornamen Aruna monokrom dan mengikuti palet pasangan
   (`DESIGN.md`). Warna sumber (`#483534`, `#544541`, `#ebd5c4`, `#f0e4db`) dicatat di
   `catalog.json`, dan berkas berwarna aslinya tetap utuh di `source/`.
2. **Badan daun menjadi rongga.** Daun sulur disusun sebagai siluet gelap dengan badan krem yang
   sedikit lebih kecil di atasnya — yang terlihat sebagai garis tepi sebenarnya sisa siluet di
   sekelilingnya. Dalam monokrom trik itu runtuh, dan versi pertama konverter mengeluarkan daun
   sebagai gumpalan pekat. Sekarang kedua `d` digabung jadi satu path ber-`fill-rule="evenodd"`,
   jadi badannya benar-benar berlubang. Tidak ada koordinat yang berubah.

## Kesetiaan terukur

Siluet sumber dibandingkan dengan siluet hasil konversi pada lebar render 700px. Untuk glyph
ber-rongga, badan di sisi sumber dicat warna kertas lebih dulu supaya kedua sisi sama-sama
menghasilkan cincin.

| Glyph | Path | Beda piksel | Koordinat utuh |
|---|---|---|---|
| `kayon-gunungan` | 12 | **0** / 645.400 | ya |
| `daun-sulur-kiri` | 11 | 33 / 569.800 (0,0058%) | ya |
| `daun-sulur-kanan` | 11 | 23 / 578.200 (0,004%) | ya |
| `pita-ceplok` | 4 | **0** / 37.100 | ya |

Sisa 23–33 piksel pada daun adalah antialias di tepi rongga — satu piksel tebal di sepanjang
keliling, bukan pergeseran bentuk. Peta bedanya ada di `diff/`.

*Angka daun naik tipis dari 26→33 dan 21→23 pada 2026-09-18*, ketika konverter berhenti membuang
`mask` dan pack ini dibangun ulang dengannya. Sapuan lembut di tepi kanannya sekarang membawa mask
aslinya alih-alih dicat pekat: lebih setia, bukan kurang.

## Dua rangkaian mawar tidak menjadi SVG

`rangkai-mawar-kiri` dan `rangkai-mawar-kanan` disajikan sebagai PNG + WebP ber-alpha, bukan SVG.
Alasannya ada di berkas sumbernya: **bunganya memang bitmap.** Tiap berkas berisi ~9.100 path
(itu daun dan rantingnya) ditambah enam `<image>` PNG base64 — dan bunga mawar serta bunga
putihnya seluruhnya ada di dalam `<image>` itu. Dibuktikan dengan merender ulang setelah seluruh
`<image>` dihapus: yang tersisa hanya dedaunan.

Konsekuensinya:

- Keduanya **tidak bisa** `currentColor`; ia lukisan berwarna penuh.
- `<image>` ditolak validator SVG skill ini, dengan alasan yang benar.
- Memanggangnya jadi raster ber-alpha adalah penyiapan aset mekanis, bukan konversi raster ke
  vektor. Berkas SVG sumbernya tetap ada di `source/`.
- Renderer ornamen aplikasi saat ini **hanya** menangani komponen SVG. Memasang raster butuh
  perluasan renderer yang eksplisit — lihat catatan yang sama di pack Sunda.

## Membangun ulang

```sh
rtk proxy node docs/features/ornament-builder/imported/canva-cokelat-krem/build.mjs
rtk proxy node .claude/skills/aruna-ornament-builder/scripts/validate.mjs docs/features/ornament-builder/imported/canva-cokelat-krem
```
