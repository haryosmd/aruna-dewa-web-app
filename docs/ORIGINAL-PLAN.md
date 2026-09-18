# Aruna Dewa — Fondasi Platform Wedding Invitation

## 1. Hasil dan keputusan utama

Bangun proyek di `/Users/slametharyosamudro/Documents/personal/aruna-dewa` dengan satu alur yang berfungsi:

**Landing → daftar/login → order → pembayaran sandbox → dashboard → editor undangan → impor tamu → publish → undangan personal → RSVP.**

Keputusan yang sudah disepakati:

- Editor berbasis section.
- Satu template original lengkap untuk implementasi pertama.
- Impor Google Sheets, paste tabel, XLSX, dan CSV.
- Login Google serta email/password.
- Midtrans sandbox.
- Deployment portable melalui Docker.
- URL awal `/i/{slug}` dengan token tamu acak.
- Harga demo tersimpan di database.
- Artefak feature lokal, gitignored, dengan riwayat revisi.

Rencana ini belum menulis file atau memasang skill karena sesi masih dalam Plan Mode.

## 2. Arsitektur dan kontrak teknis

### Stack

| Bagian | Pilihan dan tanggung jawab |
|---|---|
| Monorepo | pnpm workspace + Turborepo + TypeScript strict |
| Frontend | Next.js App Router: landing, order, dashboard, editor, halaman undangan |
| Backend | NestJS dengan modul bisnis terpisah dan REST API |
| Database | PostgreSQL + Prisma; transaksi untuk pembayaran, entitlement, dan publish |
| Background worker | pg-boss berbasis PostgreSQL untuk impor, pemrosesan media, dan rekonsiliasi pembayaran |
| UI | Tailwind CSS, shadcn/ui, Lucide |
| Form dan kontrak | React Hook Form + Zod |
| Data dashboard | TanStack Query dan TanStack Table |
| Editor | dnd-kit untuk urutan section; renderer milik aplikasi |
| Animasi | Motion, CSS transform/opacity, Intersection Observer |
| Spreadsheet | Google Picker + Sheets API; ExcelJS untuk XLSX, parser CSV terpisah |
| Pengujian | Vitest, integration test PostgreSQL, Playwright, axe |
| Operasional | Docker Compose, health/readiness checks, structured logs |

Next.js mendukung deployment Node/Docker. Backend modular dipilih untuk menjaga logika pembayaran, akses, dan impor terpisah dari rendering. [Next.js](https://nextjs.org/docs/app/guides/self-hosting), [NestJS](https://docs.nestjs.com/security/authentication)

Popularitas menjadi salah satu bukti pemilihan: saat diperiksa, shadcn/ui sekitar 123,5 ribu stars, NestJS 76,6 ribu, Prisma 47,6 ribu, Motion 33,6 ribu, dan TanStack Table 28,4 ribu. Versi stabil kompatibel akan dikunci dalam lockfile; stars tidak menggantikan pemeriksaan lisensi dan pemeliharaan. [shadcn/ui](https://github.com/shadcn-ui/ui), [NestJS](https://github.com/nestjs/nest), [Prisma](https://github.com/prisma/orm), [Motion](https://github.com/motiondivision/motion), [TanStack Table](https://github.com/TanStack/table)

### Batas aplikasi dan data

- Aplikasi: `web`, `api`, dan `worker`.
- Package bersama: kontrak API, design system, schema undangan, template renderer, serta database khusus server.
- Browser tidak mengakses database langsung.
- API menggunakan `/v1`, OpenAPI, validasi input, pagination, dan error terstruktur dengan `code`, `message`, `fieldErrors`, serta `requestId`.
- Modul backend: identity, invitations, catalog, orders, payments, entitlements, guests, imports, media, publishing, RSVP, wishes, operations.
- Penyimpanan lokal memakai filesystem adapter; deployment mendukung S3-compatible storage melalui adapter yang sama.

Entitas utama:

- User, OAuthIdentity, Session, Role, Permission.
- Invitation, InvitationMember, Event.
- TemplateVersion, InvitationDraft, PublishedRevision.
- Package, Feature, PackageFeature, Order, OrderItem, PaymentEvent, Entitlement.
- Guest, GuestEvent, RSVP, Wish, ImportJob, MediaAsset, AuditEvent.

Data yang memerlukan relasi, pencarian, dan transaksi disimpan sebagai tabel. Konten builder memakai JSONB tervalidasi dan berversi. Semua data milik undangan diperiksa terhadap membership pengguna.

### Autentikasi dan hak akses

- Frontend lokal `http://127.0.0.1:3000`; backend `http://127.0.0.1:3001`.
- Callback Google tetap persis `http://127.0.0.1:3001/auth/google`; endpoint memulai login dibuat terpisah.
- OAuth memakai authorization-code flow, state sekali pakai, dan verifikasi identitas Google.
- Client ID dan secret yang diberikan hanya masuk environment lokal server yang gitignored. `.env.example` berisi placeholder; secret tidak disalin ke artefak, log, atau bundle frontend.
- Access token JWT berumur 15 menit; refresh token acak, di-hash dalam database, kedaluwarsa 30 hari, dirotasi setiap refresh.
- Cookie HttpOnly, Secure pada produksi, SameSite, pemeriksaan Origin/CSRF, logout/revoke session, serta deteksi penggunaan ulang refresh token.
- Password memakai Argon2id; email verification dan reset password memakai token sekali pakai serta SMTP adapter. Mailpit digunakan untuk pengujian lokal.
- Akun baru menuju order; pengguna dengan undangan aktif menuju dashboard.
- Role super-admin memakai kode internal `r_7c91`, ditetapkan melalui CLI berdasarkan user ID. Tidak ada elevasi role dari form registrasi.
- Super-admin dapat melewati pembayaran dan batas entitlement untuk seluruh fitur yang sudah tersedia. Setiap override tercatat di audit log.

### Draft, publish, dan personalisasi

- `InvitationDocument` memuat `schemaVersion`, `templateId`, `templateVersion`, tokens, dan section dengan ID stabil.
- Editor dan halaman publik menggunakan renderer yang sama.
- Autosave dengan revision number; konflik perubahan menghasilkan respons 409 dan pilihan memuat ulang atau mempertahankan salinan.
- Publish memvalidasi konten serta entitlement, lalu membuat snapshot immutable dan mengganti pointer revision aktif secara atomik.
- Edit berikutnya tidak mengubah undangan publik sampai dipublish.
- URL tamu `/i/{slug}?g={opaqueToken}`; token minimal 128-bit acak, bukan nomor urut atau nama.
- Konten umum dapat di-cache; sapaan dan akses RSVP diperoleh dari endpoint personal yang `no-store`.
- Token hanya membuka akses tamu tersebut. Daftar tamu, kontak, dan dashboard tidak pernah menjadi payload publik.
- Token invalid menampilkan sapaan umum tanpa akses RSVP personal. Tidak ada pembuatan aplikasi atau build terpisah untuk setiap tamu.

## 3. Perilaku produk dan UI

### Landing dan order

Landing berisi hero original, demo template yang benar-benar tersedia, carousel fitur dengan kontrol keyboard, penjelasan proses, perbandingan paket, FAQ, dan CTA mulai membuat undangan. Screenshot kompetitor menjadi bukti riset dalam docs, bukan aset pemasaran Aruna Dewa.

Stepper order:

1. Nama pasangan, judul, slug, tanggal, dan kesiapan acara.
2. Lokasi, nama tempat, perkiraan tamu; lokasi boleh “belum ditentukan”.
3. Template, paket, serta toggle add-on dengan ringkasan harga.
4. Review dan pembayaran.

Draft order tersimpan untuk dilanjutkan. Harga dihitung ulang di server; order menyimpan snapshot harga dan fitur.

Seed sandbox:

- **Mula — Rp149.000:** informasi pasangan/acara, cover, countdown, kalender, maps, 15 foto, tamu personal, impor, RSVP, ucapan.
- **Mekar — Rp249.000:** Mula ditambah cerita, hadiah, rundown, video/live-stream link, serta kontrol warna/font/urutan.
- Add-on tersedia dari fitur Mekar, Rp25.000 per fitur, hanya jika belum termasuk paket.
- Masa aktif demo 12 bulan sejak aktivasi; semua angka berlabel sandbox dan dapat diedit operator.

Aktivasi dilakukan setelah webhook/status Midtrans diverifikasi, termasuk jumlah transaksi dan identitas order. Duplicate webhook, urutan notifikasi berbeda, pembayaran pending/gagal/kedaluwarsa, dan retry tidak menggandakan entitlement. Redirect browser tidak dianggap bukti pembayaran. [Midtrans](https://docs.midtrans.com/docs/https-notification-webhooks)

### Dashboard dan editor

Navigasi utama: Ringkasan, Edit Undangan, Fitur, Kelola Tamu, RSVP & Ucapan, Media, serta Pesanan.

Editor desktop terdiri dari daftar section, panel pengaturan, dan live preview. Pada mobile, ketiganya menjadi tab dengan tombol preview yang mudah dijangkau.

Implementasi pertama mencakup:

- Cover pembuka, header, informasi mempelai, beberapa acara.
- Countdown, calendar download, alamat dan tautan maps.
- Foto/galeri, musik setelah interaksi pengguna, kontrol mute.
- Cerita cinta, rundown, dresscode, video/live-stream link.
- Informasi hadiah/rekening dan alamat kirim.
- RSVP, ucapan dengan moderasi, penutup.
- Toggle section, pengurutan, warna, typography, reset preset, undo/redo selama sesi, dan preview ukuran perangkat.

Bedakan tiga kondisi fitur: dimiliki dan aktif, dimiliki tetapi dimatikan, atau perlu upgrade. Backend memvalidasi semuanya. Fitur yang belum dibangun tidak boleh dijual atau ditampilkan seolah-olah berfungsi.

### Kelola tamu dan spreadsheet

Tabel menyediakan pencarian, filter, sorting, pagination server, pemilihan kolom, bulk selection, edit, hapus dengan konfirmasi, copy link, copy pesan, dan buka WhatsApp manual.

Kolom: nama, grup, kategori, kontak opsional, acara yang diundang, kuota orang, status dibuka, RSVP, serta waktu ditambahkan. Status pesan dikirim dipisahkan dari status tautan dibuka.

Alur impor:

**Pilih sumber → pilih sheet/range → mapping kolom → preview → perbaiki error/duplikat → konfirmasi → laporan hasil.**

- Google Sheets menggunakan izin file yang dipilih melalui Picker; login Google biasa tidak meminta izin spreadsheet. [Google scopes](https://developers.google.com/workspace/sheets/api/scopes)
- Paste TSV dari Google Sheets/Excel; XLSX/CSV sebagai alternatif.
- Nama wajib; nomor telepon, email, kategori, grup, kuota, dan acara opsional.
- Normalisasi nomor Indonesia, pertahankan Unicode dan angka telepon sebagai teks.
- Duplikat disarankan berdasarkan kontak; nama yang sama tidak otomatis digabung.
- Batas awal 5.000 baris per impor, 10 MB file, dengan pembatasan ukuran hasil ekstraksi.
- Formula tidak dieksekusi; ekspor diamankan dari formula injection.
- Preview tidak menulis tamu; commit idempotent dan error per baris dapat diunduh.
- Empty state menawarkan tambah manual, impor Sheets, paste tabel, dan download contoh.

### Design system dan performa

Arah desain: editorial wedding modern, ruang lega, fotografi terkurasi, ornamen botanical terbatas, dan formulir yang jelas.

| Token | Nilai awal |
|---|---|
| Brand coral | `#F47768` |
| Primary action | `#B83F50` |
| Background ivory | `#FFF9F3` |
| Surface | `#FFFFFF` |
| Sage | `#DCE8D8` |
| Text | `#302B29` |

Tokens memiliki lapisan primitive → semantic → component. Gunakan DM Sans untuk aplikasi dan Cormorant Garamond untuk heading wedding, dengan font berlisensi dan self-hosted.

Template pertama bernama **Aruna Bloom**: ivory/coral/sage, cover fotografi, botanical ringan, dan struktur responsif. Aset gratis harus memiliki catatan sumber dan lisensi; aset kompetitor tidak digunakan ulang. [Unsplash](https://unsplash.com/license)

Animasi menggunakan reveal 300–600 ms, stagger pendek, dan parallax dekoratif terbatas. Hormati reduced motion, hindari scroll hijacking, dan jangan menunggu seluruh galeri selesai dimuat untuk membuka undangan. [Motion](https://motion.dev/docs/react-scroll-animations), [Reduced motion](https://www.motion.dev/docs/react-motion-config)

## 4. Skill dan artefak feature

Instalasi anti-slop dilakukan pertama pada fase implementasi, khusus proyek: core beserta UI, copywriting, human, mobile-layout, dan code. Catat sumber serta revision upstream, pertahankan lisensi, dan tambahkan pointer dari instruksi proyek. [Panduan anti-slop](https://github.com/miqdadbadjuber/anti-slop/blob/main/GUIDE.md)

Buat dua skill lokal:

- **aruna-feature-artifacts:** intake, requirement IDs, kontrak FE/BE, sumber, rencana, revisi, verification, dan handoff.
- **aruna-engineering-loop:** tujuan terukur → eksplorasi → perubahan terbatas → pengujian → review → pembaruan artefak; graph dependensi feature dan lessons learned berbukti.

Pola loop terinspirasi prinsip Karpathy dan eksperimen terukur; tidak mengklaim rangkaian “Agents → Loops → Graphs” sebagai framework resmi. Perbaikan skill mengikuti bukti kegagalan, tanpa proses background atau perubahan aturan otomatis. [Karpathy autoresearch](https://github.com/karpathy/autoresearch)

Folder feature: foundation, identity-access, landing-order, billing-entitlements, invitation-builder, guests-import, publishing-rsvp, dan operations.

Setiap folder `docs/features/{feature}` berisi:

- `README.md`: status, cakupan, dependensi, langkah berikutnya.
- `SPEC.md`: requirement, acceptance criteria, perilaku FE/BE dan permission.
- `PLAN.md`: task berurutan, kontrak, file terdampak, serta verifikasi.
- `UI-BRIDGE.md`: screenshot → kebutuhan → perbaikan desain.
- `CHANGELOG.md`: perubahan append-only.
- `sources/INDEX.md`: provenance dan status akses.
- `revisions/`: snapshot sebelum keputusan besar diganti.
- Bukti preview dan pengujian hanya setelah benar-benar diperoleh.

Indeks sumber mencakup seluruh 11 screenshot, landing, enam demo, anti-slop, dan referensi teknis. Gambar stepper dipetakan ke order; menu ke dashboard/entitlement; tabel dan modal ke impor; editor ke builder/tokens. Screenshot web dan slide fitur disimpan saat implementasi dengan tanggal serta viewport.

Fitur lanjutan tetap tercatat: template tambahan, subdomain, RSVP custom, QR check-in, table/souvenir management, guest-registration form, layar sapa, e-invitation, reminder, pengiriman WhatsApp resmi, dan planner. Masing-masing diberi status roadmap, bukan acceptance milestone pertama.

## 5. Urutan implementasi dan penerimaan

1. **Skill, sumber, dan fondasi:** artefak lengkap, workspace, Docker, database, kontrak, tokens, CI.
2. **Identity:** email/Google login, refresh rotation, membership, role operator.
3. **Order dan billing:** stepper tersimpan, katalog sandbox, checkout, webhook, entitlement.
4. **Builder:** Aruna Bloom, editor section, media, autosave, preview, publish.
5. **Tamu dan RSVP:** seluruh jalur impor, personal link, copy pesan, RSVP, moderasi.
6. **Verifikasi dan handoff:** bukti alur, runbook, backup/restore, konfigurasi integrasi eksternal.

Acceptance utama:

- Dua akun tidak dapat membaca atau mengubah undangan satu sama lain.
- Refresh token lama tidak dapat digunakan ulang; logout mencabut session.
- Modifikasi harga atau toggle lewat request tidak melewati entitlement.
- Super-admin dapat menyelesaikan alur tanpa pembayaran.
- Draft tidak bocor ke halaman publik; publish gagal tetap mempertahankan revision sebelumnya.
- Tamu A/B melihat sapaan dan RSVP masing-masing, tanpa cache tertukar.
- Impor menangani duplikat, Unicode, leading zero, formula, file invalid, serta retry.
- RSVP mematuhi kuota, acara, dan deadline.
- Alur utama diuji pada viewport 360, 768, dan 1440 px, keyboard, serta reduced motion.
- Target pengujian performa: LCP ≤2,5 detik, CLS ≤0,1, dan respons interaksi ≤200 ms pada profil perangkat/jaringan yang dicatat.
- Typecheck, lint, build, integration test, dan E2E memiliki hasil aktual dalam artefak.

Kredensial Midtrans, Google Picker/API configuration, SMTP produksi, domain, dan penyimpanan produksi merupakan kebutuhan environment. Uji lokal dapat berjalan dengan fixture yang diberi label; keberhasilan integrasi eksternal hanya dinyatakan setelah benar-benar diuji. Deployment produksi berada di luar milestone fondasi ini.
