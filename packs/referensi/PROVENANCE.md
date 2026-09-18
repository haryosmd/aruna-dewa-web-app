# Referensi pemilik

65 aset: 58 aset dari sembilan ekspor Canva milik pengguna, ditambah tujuh varian
warna yang mengikuti empat PNG kiriman pengguna pada 2026-09-18. Pengguna meminta
integrasi ke bank ornamen dan menyetujui bitmap tetap PNG transparan.

Geometri vektor yang tersedia dipertahankan, bukan digambar ulang atau diklaim sebagai
karya original. Metadata editor dan identifier ekspor dibersihkan dari SVG hasil;
asal aset, checksum masukan/hasil, dan pemetaan warna disimpan dalam `catalog.json`.
Penghapusan metadata tidak mengubah status hak cipta. Lisensi sumber tidak diverifikasi
secara independen.

41 SVG memakai path asli; 24 PNG mempertahankan medium raster. Dua rangkaian mawar dan
rumah joglo dirender dari komposit sumber dengan kanvas utuh agar posisi dan skala
sesuai PNG. PNG lainnya disalin secara lossless tanpa perubahan piksel. Bidang krem
dan bayangan daun adalah varian terpisah; warna aset ini tidak mengikuti palet tema.

`pnpm ornament:reference` membangun keluaran dari arsip lokal
`docs/features/ornament-builder/imported/`. Aplikasi menggunakan salinan mandiri di
`apps/web/public/ornaments/referensi/`, dengan registry `ornament-reference.ts` yang
digabung ke `ornamentBank`. SVG eksternal dirender sebagai gambar untuk mengisolasi
ID mask/clip antar-instance; PNG tidak disamarkan sebagai SVG.

`pnpm ornament:reference:verify` memeriksa path/piksel, salinan produksi, alpha,
serta menghasilkan lembar terang/gelap, overlay, dan diff empat referensi dalam
`docs/features/ornament-builder/verification/reference/`. Nilai beda piksel mengukur
seluruh lembar termasuk latar; bukan persentase akurasi objek. Selisih renderer dan
antialias tetap ada, sehingga hasil tidak diklaim identik piksel 100%.
