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

### 2026-09-22 — Fase 74.6: pangkas foto
Tanpa dependensi baru. `FASE-72.md:488` menjanjikan `vue-advanced-cropper`; ditulis sendiri
sebagai `MediaCropper.vue` + `cropRect`/`cropPhoto` di `utils/image-normalize.ts`, memakai canvas
dan encoder WebP yang sudah dipakai `normalizePhoto` sejak fase 55. Alasannya bukan penghematan
melainkan **jalur tunggal**: dua jebakan yang sudah dibayar di `normalizePhoto` (EXIF potret, dan
browser yang mengembalikan PNG saat diminta WebP) berlaku sama persis untuk pangkas, dan pustaka
luar akan memperkenalkan cara kedua untuk salah pada keduanya. Pemilih kotaknya ~120 baris
pointer event, dan bisa dipakai dengan papan ketik.
