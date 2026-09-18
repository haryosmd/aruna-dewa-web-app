import tailwindcss from '@tailwindcss/vite'
import { googleWoff2 } from './providers/google-woff2'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-11',
  srcDir: '.',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxt/fonts', '@vueuse/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: {
    // Provider bawaan ikut menyertakan face woff full-range warisan yang selalu menang
    // pemilihan @font-face dan membuat woff2 hasil build tidak pernah terpakai. Alasan
    // lengkapnya di `providers/google-woff2.ts`.
    providers: { google: googleWoff2 },
    families: [
      // Ketiga keluarga ini dipakai lewat `font-family: var(--font-…)` di `main.css`, jadi
      // pemindai @nuxt/fonts menemukannya sendiri dan `global` tidak diperlukan.
      { name: 'Fraunces', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
      { name: 'Plus Jakarta Sans', provider: 'google', weights: [400, 500, 600, 700, 800] },
      { name: 'Cormorant Garamond', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },

      // SISANYA WAJIB `global: true`. Nama keluarganya hanya ada di `fontStacks`
      // (`utils/theme.ts`) dan disuntikkan saat runtime sebagai `--iv-display`/`--iv-script`.
      // Pemindai @nuxt/fonts membaca CSS, bukan JS: tanpa `global` ia tidak pernah melihat
      // keluarga ini dipakai, tidak menulis satu pun `@font-face`, dan pilihan font pasangan
      // diam-diam jatuh ke fallback Georgia/system-ui. Terbukti di `.output` build
      // 2026-09-17: hanya tiga keluarga di atas yang punya `@font-face`, dan
      // `.nuxt/nuxt-fonts-global.css` berukuran 0 byte.
      //
      // Ini murah dalam arti bandwidth font: `@font-face` tidak mengunduh apa pun sampai ada
      // glif yang benar-benar dirender. Yang bertambah CSS-nya.
      //
      // SUBSET TIDAK BISA DIBATASI DARI SINI, sudah dicoba dan gagal (2026-09-17). Baik
      // `subsets` per-keluarga maupun `defaults.subsets` diterima TypeScript — keduanya ada
      // di tipe `@nuxt/fonts` — tapi keluaran build-nya identik byte-per-byte dengan tanpa
      // keduanya, dan `unicode-range` Thai (`U+E01-E5B`) milik Charm tetap tertulis. Provider
      // Google-nya tampaknya memang tidak menyaring subset; penyebab pastinya belum ditelusuri.
      // Jangan pasang ulang opsi itu tanpa mengukur — konfigurasi mati lebih buruk dari tidak ada.
      //
      // Akibatnya seluruh subset tiap keluarga ikut ke CSS: 60 KB `@font-face` di
      // `entry.css` yang 129 KB. Tidak ada satupun yang diunduh kalau glifnya tidak dipakai,
      // jadi ini biaya CSS, bukan biaya font. Kalau suatu saat mau ditekan, jalurnya
      // menyaring di `providers/google-woff2.ts` — tempat yang sama yang sudah membuang woff.
      { name: 'Italiana', provider: 'google', weights: [400], global: true },
      { name: 'Jost', provider: 'google', weights: [300, 400, 500, 600], global: true },
      // Display tema Alba — hanya satu weight, jadi displayWeights memaksanya 400.
      { name: 'Instrument Serif', provider: 'google', weights: [400], styles: ['normal', 'italic'], global: true },
      // Aksen kaligrafi untuk nama pasangan — pembeda paling cepat terbaca dari template gratisan.
      { name: 'Parisienne', provider: 'google', weights: [400], global: true },
      // Huruf tangan, OFL, Cadson Demak. Satu-satunya script di sini yang punya bobot 700 nyata.
      { name: 'Charm', provider: 'google', weights: [400, 700], global: true },
      // Script kaligrafis untuk huruf judul, semuanya OFL dan hanya punya bobot 400 —
      // `displayWeights` memaksanya 400 supaya browser tidak membuat bold sintetis.
      { name: 'Great Vibes', provider: 'google', weights: [400], global: true },
      { name: 'Pinyon Script', provider: 'google', weights: [400], global: true },
      { name: 'Allura', provider: 'google', weights: [400], global: true },
    ],
    defaults: { fallbacks: { serif: ['Georgia', 'Times New Roman'], 'sans-serif': ['system-ui', 'Segoe UI'] } },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      ],
      meta: [
        // Tolak dulu, izinkan per halaman.
        //
        // Yang dilindungi bukan peringkat, tapi data orang: halaman undangan memuat nama
        // pasangan, tanggal, dan alamat gedung, dan URL tamu membawa nama tamu di `?to=`.
        // Bawaan "boleh indeks" berarti tiap halaman baru terindeks sampai ada yang ingat
        // melarangnya — dan yang lupa dilarang tidak pernah menimbulkan error.
        //
        // Ditimpa jadi `index, follow` hanya di `/`, `/order`, dan `/i/demo`. Kalau ketiganya
        // hilang dari indeks, itu gejala timpaannya terlepas — cutover memeriksanya.
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'theme-color', content: '#ffffff' },
        { name: 'format-detection', content: 'telephone=no' },
        { property: 'og:site_name', content: 'Aruna Dewa' },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'id_ID' },
      ],
    },
  },
  runtimeConfig: {
    apiBase: process.env.NUXT_API_BASE ?? 'http://127.0.0.1:3001/v1',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:3001/v1',
      webBase: process.env.NUXT_PUBLIC_WEB_BASE ?? 'http://127.0.0.1:3000',
      // Kontak publik. Dibiarkan kosong sampai nomor dan akun asli tersedia — lebih baik
      // barisnya hilang daripada mengirim orang ke tujuan palsu.
      whatsapp: process.env.NUXT_PUBLIC_WHATSAPP ?? '',
      instagram: process.env.NUXT_PUBLIC_INSTAGRAM ?? '',
      email: process.env.NUXT_PUBLIC_EMAIL ?? 'halo@arunadewa.id',
    },
  },
  typescript: { strict: true, typeCheck: true },
})
