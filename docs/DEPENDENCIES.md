# Feature dependencies

foundation → identity-access → landing-order → billing-entitlements → invitation-builder → publishing-rsvp
foundation → guests-import → publishing-rsvp
operations validates all features.



## 2026-09-17 — Ornament Builder lokal

Menggunakan dependency proyek yang ada: Playwright, sharp 0.32.6, axe-core/Playwright dan GSAP lokal 3.15.0 (versi terpasang saat pengambilan). Tidak ada perubahan package/lockfile. image_gen built-in menghasilkan dua raster original; PyYAML tersedia melalui environment sementara uv untuk validator skill resmi.


### 2026-09-18 — Bank ornamen referensi
Memakai sharp, Vue, Vitest, dan ESLint yang sudah terpasang; tanpa dependensi baru. Regenerasi aset memerlukan arsip lokal `features/ornament-builder/imported`; runtime aplikasi tidak memerlukannya.


### 2026-09-18 — Fase 59: Studio Ornamen
Tanpa dependensi baru. Memakai `reka-ui`, `lucide-vue-next`, `sharp` 0.32.6, Vitest, Playwright,
dan `@axe-core/playwright` yang sudah terpasang. Varian turunan aset referensi dibangkitkan
`sharp` dari salinan di `packs/referensi/` — tidak memerlukan arsip `docs/` yang di luar git.
