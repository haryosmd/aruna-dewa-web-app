# Execution ledger: 2026-09-11

Authority: ORIGINAL-PLAN.md with docs/README.md and latest feature SPEC overriding superseded frontend, palette and guest links. User explicitly requested execution.

## Preflight decisions
| Tasks/interfaces | Finding and ruling |
| --- | --- |
| Foundation/frontend | Next/React superseded by Nuxt 4/Vue/shadcn-vue; keep Nest/Postgres. |
| Landing/renderer | Shared InvitationDocument and original Aruna Bloom; competitor assets only in docs. |
| Billing/builder | Server owns price and entitlement; never activate on redirect. |
| Guests/publishing | `to` greeting only; `g` opaque token controls RSVP. |
| Docs/source | docs ignored, source plan sanitized; credentials only server .env. |
| Identity/frontend | Cookie sessions; API origin 3001 and web 3000. |
| All tasks | No Git repository exists; work in the explicitly requested isolated project folder. |

## Work
1. Source intake and local skills: installed; reference review in progress.
2. Contracts and foundation: in progress.
3. API/database/worker: implemented locally. Prisma schema/models, Nest modules, pg-boss worker, local/S3-compatible media storage and server-side catalog/payment workflow are present. External Midtrans, Google OAuth, SMTP and S3 endpoint credentials require runtime verification.
4. Web/editor/public renderer: pending.
5. Integration and acceptance: in progress. API smoke checks have demonstrated core local behavior; external-provider success remains unverified.

## Frontend implementation

- `apps/web` menggunakan Nuxt 4/Vue, Pinia, Reka UI primitive lokal, TanStack Vue Table, GSAP, dan vue-sonner.
- Halaman tersedia: landing, login/register, order empat tahap, dashboard, editor, kelola tamu/import, RSVP/ucapan, pesanan, serta undangan publik.
- Editor memakai contract `InvitationDocument`, revision draft, publish terpisah, event, galeri media, rundown, token visual, reorder, enabled state, dan mobile preview. **Autosave dihapus di fase 18** (lihat `docs/ROADMAP.md`): simpan hanya berangkat lewat tombol, keadaan tersimpan tertulis di header, dan halaman yang ditinggalkan dengan perubahan belum tersimpan memunculkan `AtomicPopup`.
- API request SSR meneruskan cookie request ke API; browser memakai credentials include. Endpoint tamu personal memakai `no-store`; canonical publik tidak memuat query.

External integration success must be reported separately from local fixture tests.


## 2026-09-17 — Ornament Builder

Selesai: skill lokal aruna-ornament-builder, arsip delapan situs, metadata/font/motion, enam SVG dan dua raster original Sunda, demo GSAP offline. Validasi dan keterbatasan tercatat di [hasil verifikasi](features/ornament-builder/verification/RESULTS.md). Renderer/API/backend tidak diubah.


### 2026-09-18 — Bank ornamen referensi
65 aset SVG/PNG dan renderer palet tetap ditambahkan; skill Codex/Claude sinkron. Lihat `features/ornament-builder/verification/reference/results.json`.


### 2026-09-18 — Fase 59: Studio Ornamen

Pemilih ornamen layar penuh di editor: sembilan slot skalar + lima jangkar ladang dari bank 328
keping, enam ubin latar, dan huruf paragraf. Kolam terkurasi tetap ada sebagai tab "Disarankan";
tab "Semua" membuka bank penuh dengan lencana ber-kalimat. `designFingerprint()` menggantikan
perbandingan `JSON.stringify(tokens)` yang peka urutan key di gerbang entitlement, dan
`ornamentOverrides` ikut digerbangi `design`.

Aset referensi mendapat varian `web` 960px dan ubin 240px: 24,11 MB → 3,34 MB untuk yang dikirim
tamu. Sebelum fase ini tidak satu pun dari 65 aset itu bisa dicapai pasangan, jadi beratnya belum
pernah sampai ke seorang tamu.

Hasil: 1024 tes unit hijau, `lint` dan `typecheck` hijau, e2e Studio hijau di mobile/tablet/desktop
termasuk axe pada dialog terbuka. **Tiga kegagalan e2e yang sudah ada sebelumnya tidak diperbaiki
di fase ini** dan terbukti tidak berhubungan — dibandingkan langsung dengan perubahan di-stash,
angkanya identik. Rinciannya di `features/invitation-builder/CHANGELOG.md`.
