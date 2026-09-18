# Kontrak tamu dan tautan

## GUEST-01 — field dan tabel

- `id`: UUID internal immutable, primary key database; tidak ditampilkan sebagai kolom utama dan tidak diketik pengguna.
- `displayName`: nama undangan lengkap termasuk gelar depan/belakang, kapitalisasi dan tanda baca. Label UI **Nama undangan**. Jangan memisah first/last name atau mencoba menebak gelar.
- `invitation.slug`: slug pasangan, contoh fahrul-dan-chika. Ini milik undangan, bukan milik tamu.
- `guestToken`: token acak minimal 128 bit, terkait satu tamu dalam satu undangan; stabil saat nama diedit, dapat dicabut/dirotasi.
- `invitationUrl`: nilai turunan, bukan kolom tersimpan. Label UI **Tautan undangan**, dengan preview terpotong dan tombol salin berlabel aksesibel.
- Menggantikan kolom Kode/ID yang tampak di contoh dengan Tautan undangan; primary key database tetap ada.
- Nama bukan unique key. Dua orang bernama sama tetap dua record berbeda. Edit nama tidak membuat tamu baru atau mereset RSVP.

## GUEST-02 — encoding dan input

Trim spasi di tepi dan normalisasi Unicode NFC saat simpan. Pertahankan tanda baca, kapitalisasi, gelar, hyphen, ampersand dan plus literal. Nama wajib, maksimum 200 code point, single-line; tolak control character. Jangan lowercase, transliterasi atau slugify nama.

Gunakan `URL` dan `url.searchParams.set('to', displayName)`; tidak concatenate query manual dan tidak encode dua kali. URLSearchParams mengubah spasi ke +; - tetap karakter nama. URL masuk dengan %20 tetap diterima parser standar. Render decoded text melalui interpolasi Vue, tidak v-html. Query tidak valid atau terlalu panjang memakai sapaan umum tanpa memantulkan HTML.

Contoh query teruji dengan Node URLSearchParams:

| Nama | Query |
|---|---|
| Yosi Susanti | ?to=Yosi+Susanti |
| dr. Yosi Susanti, Sp.OG | ?to=dr.+Yosi+Susanti%2C+Sp.OG |
| Drs. Ahmad Hidayat, M.Pd. | ?to=Drs.+Ahmad+Hidayat%2C+M.Pd. |
| Anne-Marie & Budi | ?to=Anne-Marie+%26+Budi |
| A+B | ?to=A%2BB |

Nama berakhiran koma tidak ditambahkan otomatis. Koma pada contoh URL pengguna dianggap tanda baca pesan, kecuali benar-benar diketik sebagai bagian nama.

## GUEST-03 — dua jenis link yang jelas

Format route tetap `/i/{invitationSlug}` sesuai keputusan awal; domain contoh pengguna bukan domain deployment kita.

1. **Salin tautan** (aksi utama, sesuai permintaan): `/i/fahrul-dan-chika?to=Yosi+Susanti`. Nama mengubah sapaan saja. Tidak mencari guest by name, menandai guest tertentu sebagai opened, mengungkap kuota/acara privat, atau mengubah RSVP tamu. Tautan menampilkan acara publik dan opsi meminta tautan RSVP personal jika diperlukan.
2. **Salin tautan RSVP personal** (menu aksi): `/i/fahrul-dan-chika?to=Yosi+Susanti&g={guestToken}`. Endpoint server menyelesaikan token terhadap undangan dan mengembalikan displayName tersimpan, kuota/acara yang diizinkan dan status RSVP. Token valid membuat nama server authoritative; mengubah to tidak mengganti identitas.

Token salah/kedaluwarsa/dicabut: tampilkan undangan umum dengan pemberitahuan RSVP personal tidak tersedia; tidak downgrade menjadi pencocokan nama. Dua token untuk nama yang sama tetap terpisah. Link lama bertoken tetap valid setelah rename, menampilkan nama tersimpan terbaru.

URL tidak menjadi bukti pesan telah dikirim. Open tracking personal hanya terjadi dari token valid setelah halaman dibuka pengguna, bukan dari preview bot/link unfurl. Payload personal no-store. Canonical/OG memakai URL undangan umum tanpa to/g; redaksi query dari log analytics, Referrer-Policy no-referrer.

## GUEST-04 — ketik, simpan, salin

Preview query/link sederhana berubah langsung saat mengetik; data nama asli tetap terbaca biasa di input. Nama kosong membuat tombol copy disabled dengan hint. Saat copy dari row dirty, validasi dan simpan dahulu agar tabel konsisten; beri status Menyimpan. Jika save gagal, pertahankan input dan tampilkan error/retry, jangan toast sukses. Link personal hanya tersedia setelah record/token tersimpan. Gunakan optimistic revision untuk mencegah overwrite perubahan bersamaan.

Clipboard berhasil: toast `Tautan untuk Yosi Susanti berhasil disalin`. Clipboard gagal: dialog berisi URL read-only selectable dan petunjuk salin manual. Hindari toast tiap keystroke/autosave; autosave memakai status inline.

## GUEST-05 — import dan state

Google Sheets + paste TSV + XLSX/CSV. Mapping kolom nama ke displayName menggunakan normalisasi yang sama. Preview, error per baris, review duplikat dan commit idempotent. Nama yang sama hanya peringatan, tidak merge otomatis. Empty state menawarkan tambah manual/impor/paste/contoh file. Search, group/category/event filters, pagination server, multi-select, copy pesan dan WhatsApp manual mengikuti brief awal.

### Status implementasi GUEST-05 — 2026-09-11

- Paste tetap memakai `POST /v1/invitations/{invitationId}/imports/preview`; commit tetap satu-satunya jalur mutasi di `POST /v1/invitations/{invitationId}/imports/{jobId}/commit` dengan idempotency key.
- CSV/XLSX memakai `POST /v1/invitations/{invitationId}/imports/file-preview` dengan multipart field `file`; batas server 10 MB dan 5.000 data rows. Parser membaca nilai teks, mempertahankan leading zero, dan tidak memakai hasil formula XLSX.
- Google Sheets memakai `POST /v1/invitations/{invitationId}/imports/google-sheets-preview` dengan `{ spreadsheetId, range, accessToken }`. Token hanya dipakai untuk request `values.get` tersebut, tidak dipersist atau dilog; URL API disusun dari spreadsheet ID/range tervalidasi dan bukan input URL bebas. Nilai formula diminta sebagai formula lalu tidak diteruskan sebagai nilai impor.
- Picker/key/OAuth browser tidak tersedia dalam environment ini. UI harus menampilkan keadaan konfigurasi belum tersedia, lalu saat dikonfigurasi memperoleh token `drive.file` melalui alur OAuth terpisah dari login Google biasa dan mengirimkannya hanya ke endpoint preview. Integrasi Google belum diklaim terverifikasi.
