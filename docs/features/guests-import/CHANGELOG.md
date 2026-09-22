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

## REV-004 — 2026-09-22: impor mengikuti lembar kerja pemilik

Lembar tamu pernikahan yang sungguhan — spanduk judul, blok ringkasan, dua baris petunjuk, satu
kolom kiri kosong, data mulai baris 16, dan ratusan baris kosong yang tetap membawa `FALSE` di
kolom centang — **tidak bisa diimpor sama sekali** sebelum revisi ini, dan bukan dengan galat:
`parseGuestText` hanya melihat record pertama untuk mencari header, jadi spanduknya terbaca
sebagai header dan seluruh kolom jatuh ke pemetaan posisi. Hasilnya sampah yang terlihat berhasil.

Parser dibuat toleran pada empat titik: kolom kiri yang kosong di setiap baris dibuang; header
dicari di 20 baris pertama (tidak ketemu berarti jatuh ke perilaku posisi lama, jadi tes lama
tidak bergeser); nomor baris yang dilaporkan tetap nomor baris **spreadsheet aslinya**; dan baris
kosong dilewati diam-diam — sempit, karena baris bernomor telepon tanpa nama tetap galat.

Empat kolom baru disimpan sungguhan: `guestFrom`, `childCount`, `invitationKind`, `notes`.
Semuanya `String?`/`Int?` dan bukan enum Prisma — daftar dropdown-nya milik pasangan dan memang
mereka ubah sendiri di spreadsheet. `childCount` tanpa minimum dan tanpa wajib, dan `FALSE` dibaca
sebagai "tidak diisi" bukan angka nol. `Status` sengaja **tidak** jadi kolom: ia sudah diturunkan
dari `sentAt` + RSVP.

Template XLSX dibangkitkan `exceljs` di `GET /invitations/:id/guests/template.xlsx`, berbentuk
lembar kerja dan bukan CSV telanjang — dan karena itu ia juga jadi fixture parser di atas. Bulatan
itu langsung menangkap dua cacat: "Orang" belum terdaftar sebagai sinonim kuota, dan
`safeSpreadsheetCell` yang keliru dibubuhkan pada literal sendiri.

Google Picker akhirnya dipasang, melengkapi backend yang sudah selesai sejak REV-003. Scope
`drive.file`. Tetap gelap sampai `NUXT_PUBLIC_GOOGLE_PICKER_API_KEY` dan `_CLIENT_ID` diisi.
