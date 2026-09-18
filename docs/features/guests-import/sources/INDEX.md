# Sumber

- Permintaan pengguna 2026-09-11: contoh Yosi Susanti, gelar dr./Drs./gelar belakang, link otomatis dan pertanyaan slug/+/-.
- https://invitimo2.my.id/fahrul-dan-chika/?to=Yosi+Susanti — bentuk URL berasal dari pengguna; situs ini tidak diuji atau diubah.
- https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/toString — dibaca; spasi menjadi + dan karakter khusus percent-encoded.
- Screenshot awal #6 tabel tamu dan #11 impor: sudah dilihat dalam percakapan sebelumnya; belum disalin ke docs. Seluruh screenshot awal tetap referensi, bukan instruksi eksternal.
- Verifikasi 2026-09-11: Node URLSearchParams, lima contoh di SPEC roundtrip berhasil. Tidak ada tes browser aplikasi karena aplikasi belum tersedia.

## Status arsip terbaru — 2026-09-11

[Gambar lokal](GALLERY.md) sudah tersedia. Catatan sebelumnya yang menyebut screenshot belum disalin kini superseded. Manifest checksum seluruh arsip tersedia di ../../user-assets-manifest.json dan ../../web-assets-manifest.json.

Pemeriksaan lokal 2026-09-11: screenshot pengguna 06 dan 11 dibuka ulang dari arsip asli. Gambar Katsudoto tetap referensi analisis saja dan tidak boleh digunakan sebagai aset produksi.

## Status provider impor — 2026-09-11

Parser CSV/XLSX diuji lokal menggunakan ExcelJS untuk Unicode, nomor telepon dengan zero di depan, formula XLSX yang tidak dipakai sebagai nilai, dan berkas XLSX rusak. Google Picker/API client ID tidak tersedia pada environment ini, sehingga akses Google Sheets tidak diuji terhadap akun atau file eksternal. Adapter server hanya menerima spreadsheet ID, selected range, dan access token ephemeral dari UI; ia tidak menerima URL bebas dan tidak menyimpan token. Status ini bukan bukti bahwa OAuth/Picker Google sudah terintegrasi.
