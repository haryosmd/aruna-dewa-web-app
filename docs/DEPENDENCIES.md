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

### 2026-09-22 — Fase 75.1: sharp di apps/api
**Satu dependensi runtime baru**, dan ini membalik arah catatan 74.6 di atas — jadi alasannya ditulis
lengkap, bukan disebut sekilas.

`@resvg/resvg-js` tidak punya dekoder WebP. Ia tidak melempar; ia menggambar kosong. Diukur lewat
satori + resvg yang sudah terpasang, foto yang sama dalam dua format: WebP → PNG 4.411 byte,
rata-rata kanal 0,0, stdev 0,0; PNG → 466.044 byte, rata-rata 102,6, stdev 51,5. Karena
`normalizePhoto` mengubah tiap foto unggahan jadi WebP, setiap kartu bagikan `backgroundMode: 'foto'`
selama ini terbit hitam.

**Kenapa tidak ditulis sendiri seperti 74.6.** Di sana mesinnya sudah ada — `normalizePhoto` sudah
memegang canvas dan encoder WebP, jadi pangkas cuma pemilih kotak di atasnya. Di sini tidak ada
dekoder WebP sama sekali di sisi server, dan menulis satu berarti menulis dekoder VP8L — bukan 120
baris pointer event.

**Kenapa `sharp`, dan kenapa murah.** Sudah ada di repo (`devDependencies` akar, dipakai
`scripts/capture-dashboard.ts`, `optimize-images.ts`, `ornament-reference`), sudah ada di
`pnpm-lock.yaml`, dan sudah terdaftar di `pnpm-workspace.yaml:onlyBuiltDependencies` sehingga skrip
install-nya boleh jalan di pnpm 10. Dipaku `0.32.6` **tanpa `^`**, sama persis dengan akar: dua versi
sharp di satu tree berarti dua binary libvips.

Yang berubah cuma satu: ia kini dependensi **produksi** `apps/api`, jadi ia selamat dari
`pnpm prune --prod` di `Dockerfile` dan ikut ke image API. Itu yang dituju.

**Yang tidak berubah:** foto tersimpan tetap WebP, dan halaman undangan tetap menerimanya apa adanya.
Yang ditranskode hanya salinan di memori untuk satu render kartu, karena pembaca kartu itu crawler
WhatsApp/Facebook lewat resvg, bukan browser.
