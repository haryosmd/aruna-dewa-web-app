# Command lokal — fungsi tiap command

Referensi cepat untuk menjalankan & memverifikasi stack `aruna-dewa` di lokal. Lihat `README.md` ("Local development") untuk urutan lengkap.

| Command | Fungsi |
|---|---|
| `pnpm install` | Install semua dependency workspace (root + `apps/*` + `packages/*`) |
| `pnpm db:local` | Menyalakan Postgres lokal native (`embedded-postgres`) di `.data/postgres`, listen di port **54329**. Alternatif dari `docker compose up postgres` |
| `pnpm mail:local` | Menyalakan SMTP loopback sederhana yang nulis email keluar sebagai file `.eml` ke `.data/mail/` — pengganti Mailpit kalau tanpa Docker |
| `pnpm db:generate` | Generate Prisma client dari schema di `packages/database` (harus dijalankan tiap kali schema berubah) |
| `pnpm db:migrate` | Menjalankan migration Prisma ke database (bikin/update tabel sesuai schema) |
| `pnpm db:seed` | Isi data awal/dummy ke database (kalau ada seed script) |
| `pnpm --filter @aruna/api dev` | Jalankan API NestJS dalam mode dev (watch mode) di port **3001** |
| `pnpm --filter @aruna/worker dev` | Jalankan worker (pg-boss queue) — proses background untuk job seperti reconcile pembayaran Midtrans tiap 60 detik |
| `pnpm --filter @aruna/web dev --host 127.0.0.1 --port 3000` | Jalankan web Nuxt dalam mode dev di port **3000**. `--host 127.0.0.1` wajib supaya origin match dengan `WEB_ORIGIN` API (kalau tidak, kena 403 `OriginGuard`) |
| `docker compose up -d postgres mailpit` | (Opsi Docker) nyalakan container Postgres + Mailpit di background |
| `pnpm test` | Unit test (vitest) |
| `pnpm typecheck` | Cek tipe TypeScript semua package (`turbo typecheck`) |
| `pnpm lint` | ESLint |
| `pnpm build` | Build production semua app (`turbo build`) |
| `pnpm test:integration` | Smoke test API terhadap DB/SMTP lokal beneran |
| `pnpm exec playwright test` | E2E test browser |

## Lihat isi database — DBeaver

Connection string sama persis baik pakai Docker maupun `pnpm db:local` (port & kredensial hardcode sama di keduanya):

```
Host: 127.0.0.1
Port: 54329
Database: aruna
User: aruna
Password: aruna-local-only
```

Tutor singkat:

1. Buka DBeaver → **Database** menu → **New Database Connection**
2. Pilih **PostgreSQL** → Next
3. Isi form: Host `127.0.0.1`, Port `54329`, Database `aruna`, Username `aruna`, Password `aruna-local-only` (centang "Save password")
4. Klik **Test Connection** — kalau DBeaver minta download driver PostgreSQL, izinkan (sekali saja)
5. Test berhasil → **Finish**
6. Pastikan `pnpm db:local` (atau `docker compose up -d postgres`) **sedang jalan** sebelum connect — kalau tidak, DBeaver gagal connect (connection refused)
7. Di panel kiri, expand `aruna` → `Schemas` → `public` → `Tables` untuk lihat isi tabel (user, invitation, order, dll — sesuai schema Prisma di `packages/database`)

Password ini hanya untuk lokal (`aruna-local-only`), bukan credential produksi.
