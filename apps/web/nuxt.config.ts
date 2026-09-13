import tailwindcss from '@tailwindcss/vite'

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
    families: [
      { name: 'Fraunces', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
      { name: 'Plus Jakarta Sans', provider: 'google', weights: [400, 500, 600, 700, 800] },
      { name: 'Cormorant Garamond', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
      { name: 'Italiana', provider: 'google', weights: [400] },
      { name: 'Jost', provider: 'google', weights: [300, 400, 500, 600] },
      // Display tema Alba — hanya satu weight, jadi displayWeights memaksanya 400.
      { name: 'Instrument Serif', provider: 'google', weights: [400], styles: ['normal', 'italic'] },
      // Aksen kaligrafi untuk nama pasangan — pembeda paling cepat terbaca dari template gratisan.
      { name: 'Parisienne', provider: 'google', weights: [400] },
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
