# Aruna Dewa — indeks keputusan

Status: spesifikasi; aplikasi dan skill belum diimplementasikan. Proyek belum merupakan repository Git. Aturan ignore disiapkan untuk inisialisasi Git berikutnya.

## Keputusan aktif — 2026-09-11

- Frontend Nuxt, Vue, TypeScript; shadcn-vue sebagai satu fondasi UI, Tailwind, Pinia, TanStack Table Vue. React/Next dan Nuxt UI tidak lagi menjadi pilihan aktif.
- Backend NestJS modular monolith; PostgreSQL/Prisma; worker pg-boss; portable Docker. Integrasi Midtrans sandbox, Google login + email/password dan impor Google Sheets/file mengikuti rencana percakapan sebelumnya.
- Builder section dengan renderer template berversi, draft/publish terpisah. Satu template original untuk milestone pertama.
- Docs lokal gitignored, riwayat append-only. Tidak ada secret dalam docs.
- Arah visual cream/ink/terracotta dari Snapture menggantikan palet coral/pink sebelumnya untuk brand dan landing. Token template undangan tetap terpisah.
- Query sapaan memakai `to` dengan URLSearchParams; ID tamu internal tidak diganti menjadi nama atau slug.

## Feature yang dirinci dalam revisi ini

- [Kelola tamu dan personalisasi](features/guests-import/README.md)
- [Landing, desain dan motion](features/landing-order/README.md)

## Backlog fondasi dari brief awal

Instal anti-slop lokal terlebih dahulu sebelum menulis UI aplikasi; buat skill aruna-feature-artifacts dan aruna-engineering-loop. Kemudian materialisasi rencana lengkap identity, billing/entitlement, builder, publishing/RSVP, media, operations dan acceptance E2E dari percakapan. Tidak menganggap dokumen ini sebagai bukti fitur sudah berjalan.

Kebutuhan yang tetap berlaku: Google callback 127.0.0.1:3001/auth/google; JWT + rotating refresh sessions; server-side permission/entitlement; role super-admin berkode internal dengan audit; data tamu terisolasi per undangan; import preview/commit idempotent; harga sandbox terkonfigurasi; aset berlisensi; empty/loading/error/success states. Kredensial hanya dalam environment server lokal saat setup.

## Arsip aset — 2026-09-11

11 screenshot pengguna dan 29 gambar fitur Katsudoto telah disimpan di sources/assets per feature; galeri terdapat pada masing-masing sources/GALLERY.md. Checksum dicatat dalam manifest. Gambar utama Snapture belum berhasil diunduh (respons kosong); kandidat foto dummy masih berupa tautan, bukan file lokal. Semua file tersebut berada dalam docs/ yang di-ignore.


## Ornament Builder — 2026-09-17

[Skill, arsip delapan referensi dan paket Sunda original](features/ornament-builder/README.md) telah diimplementasikan sebagai artefak lokal. Demo dan verifikasi tersedia; tidak memasang tema aplikasi.
