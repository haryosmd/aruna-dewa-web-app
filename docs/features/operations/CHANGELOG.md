# Revision history

## 2026-09-11: execution started

Materialized approved plan; current frontend decisions override earlier React choices.

## 2026-09-18: media pindah ke object storage (Fase 56)

Foto dan lagu pelanggan berhenti bergantung pada disk satu VPS. Provider IDCloudHost IS3
(`https://is3.cloudhost.id`, path-style), bucket privat, media tetap disajikan lewat proxy API.

Tiga lubang yang ditutup, ketiganya sudah ditandai di komentar kodenya sendiri sejak Fase 19:

- **Jalur baca mengabaikan `MediaAsset.provider`.** `storageForAsset()` sekarang memilih
  penyimpanan dari kolom, bukan dari `MEDIA_PROVIDER` global. Tanpa ini, flip ke S3 membuat tiap
  foto lama dicari di bucket yang tidak pernah memilikinya — boot bersih, `/ready` hijau, dan
  undangan yang sudah terbit kehilangan gambarnya. Dipakai juga oleh `sweepOrphanAssets`.
- **`/ready` berhenti memeriksa pada `s3`.** `MediaStorage` dapat `probe()`: lokal tetap
  tulis-baca-hapus, S3 jadi `HeadBucket`. Cabang yang `return` diam hilang bersama alasannya.
- **Backup media akan berhenti diam-diam.** `backup.sh` membaca dua sumber (bucket + volume
  warisan) dan gagal keras kalau `MEDIA_REMOTE` kosong; `drill.sh` assertion-d melepas filter
  `provider = 'LOCAL'` yang setelah flip memeriksa himpunan kosong sambil tetap lulus.

Ditambah: `S3_*` wajib kapan pun `MEDIA_PROVIDER=s3` (bentuknya mengikuti `cookieDomainProblems`),
`MEDIA_PROVIDER` masuk `PRODUCTION_REQUIRED`, dan `S3Client` tidak lagi dibangun ulang tiap
operasi di lima call site.

Baru: `pnpm media:check` (membuktikan bucket dengan kode yang sama yang dipakai API, termasuk
bahwa ia **menolak pembacaan anonim**) dan `ops/media-migrate.sh` (`--copy` yang memverifikasi
tiap kunci benar-benar ada di bucket, `--status`, `--flip` yang sengaja terpisah).

Pipeline media di `backup.sh` pindah dari `sh -c` ke `bash -c` dengan `pipefail`: tanpa itu hanya
perintah terakhir yang menentukan kode keluar, dan `age` yang mati di tengah tetap berakhir dengan
objek terenkripsi-kosong yang terlihat seperti backup.

Langkah 0 lulus terhadap IS3 sungguhan (bucket `aruna-media`, path-style, `us-east-1`, anonim 403,
`If-None-Match: *` dijawab 412 — jadi `S3MediaStorage.put` kini menulis bersyarat seperti jalur
lokal). Belum berlaku di produksi. Yang wajib sebelum merge tinggal `S3_*` di `/srv/aruna/api.env` —
`--copy` tidak perlu, karena aset `LOCAL` dibaca dari volume lewat `storageForAsset()`. Backup
off-site belum pernah terpasang (ditunda sejak awal sampai ada bucket), jadi cakupan backup media
nol sebelum maupun sesudah pindah; keputusan pemilik: flip dulu, backup menyusul, dan `--flip`
baris DB tidak dijalankan sampai backup ada. Urutan lengkapnya di `ops/README.md`.
