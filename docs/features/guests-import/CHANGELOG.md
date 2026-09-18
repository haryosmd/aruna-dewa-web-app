# Riwayat

## REV-001 — 2026-09-11

Sumber: permintaan pengguna setelah pemilihan shadcn-vue.

Rencana percakapan sebelumnya memakai g-only untuk link tamu. Revisi ini menambahkan to-only sebagai aksi salin utama untuk sapaan, dan mempertahankan g pada aksi RSVP personal. ID database tetap immutable; kolom UI menjadi Tautan undangan. Penggunaan + dipilih melalui URLSearchParams; gelar/tanda baca dipertahankan. Tidak ada file spesifikasi terdahulu di disk untuk disnapshot. Hasil cek encoding tercantum di PLAN; implementasi belum dimulai.

## REV-002 — 2026-09-11: arsip aset

Atas permintaan pengguna, screenshot asli dan gambar fitur web disimpan dalam sources/assets. Manifest checksum dan GALLERY.md ditambahkan; docs/ tetap gitignored. Tidak ada perubahan aplikasi.

## REV-003 — 2026-09-11: implementasi frontend

Tabel tamu memakai pagination API, pencarian, nama inline, save-before-copy, tautan sapaan dan tautan RSVP personal. Paste CSV/TSV menjalankan preview sebelum commit idempoten. Data personal dibaca melalui endpoint token halaman publik dengan `no-store`.

## REV-003 — 2026-09-11: preview file dan adapter Google Sheets

Menambahkan parser CSV/XLSX dan dua route preview yang meneruskan hasil ke preview/commit tamu yang sudah ada, sehingga preview tidak menulis Guest dan commit idempotent tidak digandakan. Multipart `file-preview` membatasi file 10 MB serta data 5.000 rows; ExcelJS mempertahankan text/leading zero dan mengabaikan hasil formula. `google-sheets-preview` menerima spreadsheet ID, range, dan token akses sementara untuk request nilai selected range tanpa menyimpan token. Test parser aktual lulus untuk CSV Unicode/leading zero, formula XLSX, dan XLSX rusak. Google Picker/OAuth/API real belum diuji karena konfigurasi client belum tersedia.
