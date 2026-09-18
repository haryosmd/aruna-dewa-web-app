# Provenance `canva-sekar`

**Status: referensi studi. Tidak ada aset di folder ini yang dikirim ke produk.**

## Asal

Sembilan ekspor SVG dari template Canva, plus satu ubin damask, diserahkan pemilik akun
2026-09-18 dari akunnya sendiri. Nama berkas aslinya tercatat di `source/` (tidak terlacak git;
lihat `STUDI.md`).

## Batas yang dijaga

- **Tidak ada path yang disalin.** Pack yang tayang (`packs/sekar/`) seluruhnya dibangkitkan
  `packs/sekar/buat.mjs` dari primitif di `packs/sekar/geometri.mjs`. Menjalankan ulang
  pembangunnya menghasilkan berkas yang sama byte-per-byte, dan tidak satu pun membaca folder ini.
- **`tracedFrom` tetap `null`** di seluruh 22 entri `packs/sekar/catalog.json`, dan
  `provenance.kind` tetap `original`.
- **Yang diambil**: proporsi, rasio viewBox, kerapatan ornamen, dan ramp warna terukur.
- **Yang tidak diambil**: geometri, huruf, foto, ilustrasi figur, dan nama template.

## Kenapa jalurnya begini

Repo ini sudah punya sembilan pack impor Canva di `imported/` — 58 aset — dan **tidak satu pun
pernah dikirim ke tamu**. Tiga pack yang tayang (melati, kayon, sunda) semuanya original. Pack
`sekar` mengikuti jalur yang sama, dan itu keputusan pemilik ketika pilihannya diajukan: aset
pihak ketiga tidak terbit ke undangan pelanggan.

## Lisensi

Template Canva tunduk pada lisensi Canva, yang tidak mengizinkan elemennya diedarkan ulang
sebagai aset lepas. Karena tidak ada geometri yang menyeberang, batas itu tidak tersentuh oleh
pack yang tayang. Berkas di `source/` tetap lokal.

Diperiksa 2026-09-18.
