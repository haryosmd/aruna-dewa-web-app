# Memberi akses operator

`OPERATOR` adalah satu-satunya peran istimewa di sistem ini (`UserRole` di
`packages/database/prisma/schema.prisma`). Tidak ada "super admin" yang lain — yang ada cuma
`USER` dan `OPERATOR`.

## Apa yang sebenarnya dibuka

Bukan satu saklar, melainkan lima cabang terpisah di kode:

| Tempat | Yang dilewati |
|---|---|
| `payments/orders.service.ts:35` | Checkout diaktifkan tanpa pembayaran — `activateWithoutPayment`, tanpa Midtrans |
| `common/membership.service.ts:13` | Cek keanggotaan undangan dilewati seluruhnya |
| `invitations.service.ts:14` | Daftar undangan mengembalikan **semua** baris, bukan hanya miliknya |
| `invitations.service.ts:81` | Section yang diaktifkan tidak dibatasi fitur paket |
| `guests.service.ts:16-17` | Token tamu ikut terbaca, untuk setiap undangan |

Baris terakhir itu yang paling perlu disadari: **operator bisa membaca tautan personal setiap
tamu di setiap undangan milik siapa pun.** Perlakukan akunnya seperti akun basis data, bukan
seperti akun biasa yang kebetulan gratis.

## Langkah

Perintahnya menolak akun yang belum ada — itu disengaja, supaya peran tidak pernah diberikan
ke email yang salah ketik.

```bash
pnpm --filter @aruna/api operator <email>
```

Kalau akunnya memang belum ada, daftarkan dulu lewat `/register` (atau Masuk dengan Google),
baru jalankan perintah di atas.

### Di produksi

Sama persis, tapi dijalankan di mesin yang `DATABASE_URL`-nya menunjuk ke basis data produksi:

```bash
pnpm --filter @aruna/api operator <email>
```

`apps/api/package.json` memuatnya sebagai `tsx --env-file-if-exists=.env src/cli/operator.ts`,
jadi `.env` produksi harus ada di `apps/api/` saat dijalankan — atau `DATABASE_URL` diekspor
lebih dulu di shell. Perintahnya menulis `AuditEvent` bertipe `OPERATOR_GRANTED_CLI`, jadi
pemberian peran selalu meninggalkan jejak.

Mencabutnya belum ada perintahnya; untuk sekarang lewat SQL:

```sql
UPDATE "User" SET role = 'USER' WHERE email = '<email>';
```

## Password

Perintah operator **tidak** menyentuh password. Kalau akunnya dibuat lewat Google, ia memang
tidak punya password sama sekali (`passwordHash` null), dan itu tidak menghalangi peran operator
— masuk lewat Google tetap membawa perannya.

Kalau password tetap diinginkan, pakai alur reset milik aplikasi sendiri, jangan menulis hash
langsung ke basis data:

1. `POST /v1/auth/forgot-password` dengan header `Origin` yang cocok dengan `WEB_ORIGIN`
   (`OriginGuard` menolak 403 kalau tidak cocok).
2. Ambil tautannya dari email. Di lokal, SMTP loopback menulisnya sebagai `.eml` di
   `.data/mail/` — isinya quoted-printable, jadi `=3D` perlu didekode dan soft line break
   (`=` di ujung baris) disambung dulu sebelum tokennya utuh 43 karakter.
3. Buka tautannya, atau `POST /v1/auth/reset-password` dengan `{ token, password }`.

**Minimal 10 karakter**, ditegakkan di `auth.service.ts:33` (register) dan `:131` (reset).
Password 9 karakter akan ditolak keduanya — tapi `login` tidak mengecek panjang, jadi hash yang
ditulis langsung ke basis data akan "berhasil" sambil melanggar aturan aplikasinya sendiri, dan
Lupa password selamanya menolak menyetelnya kembali. Jangan tempuh jalan itu.

Akun yang punya `oauthIdentity` Google **tidak** kehilangan passwordnya saat berikutnya masuk
lewat Google: `linkGoogle` mengambil cabang `if (identity) return …` dan tidak menyentuh
`passwordHash`. Yang menghapus password hanyalah penautan Google **pertama kali** ke email yang
sudah terdaftar.

## Yang tidak boleh masuk berkas ini

Password, token reset, dan isi `.env`. Berkas ini menjelaskan caranya, bukan menyimpan
kredensialnya — termasuk untuk akun operator yang sudah terlanjur dibuat.
