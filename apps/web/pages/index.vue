<script setup lang="ts">
import { testimonials } from '~/content/social-proof'

/** Bagian testimoni baru tayang kalau ada kutipan asli untuk ditampilkan. */
const hasTestimonials = computed(() => testimonials.length > 0)

useHead({
  title: 'Aruna Dewa — Undangan pernikahan digital yang terasa seperti undangan cetak',
  link: [
    /*
     * Foto hero adalah elemen LCP halaman ini, dan tanpa baris ini browser baru
     * menemukannya saat parser sampai ke `<img>`-nya — lalu menahannya di prioritas rendah
     * di belakang puluhan chunk JS dan berkas font. Terukur di produksi: request-nya baru
     * dikirim 2436 ms setelah gambarnya ditemukan.
     *
     * Berpasangan dengan `fetchpriority="high"` di `components/landing/Hero.vue`; keduanya
     * harus menunjuk berkas yang sama persis, kalau tidak preload-nya justru menambah satu
     * unduhan yang tidak terpakai.
     */
    { rel: 'preload', as: 'image', href: '/images/hero-landing.webp', type: 'image/webp', fetchpriority: 'high' },
  ],
  meta: [
    // Menimpa `noindex` bawaan di `nuxt.config.ts`. Beranda adalah satu dari tiga halaman yang
    // memang dicari orang.
    { name: 'robots', content: 'index, follow' },
    { name: 'description', content: 'Undangan pernikahan digital yang digarap seperti undangan cetak. Setiap tamu dapat tautannya sendiri; doa dan konfirmasi kehadiran mereka berkumpul di satu daftar. Sekali bayar mulai Rp279.000, aktif 12 bulan.' },
    { property: 'og:title', content: 'Aruna Dewa — Undangan pernikahan yang pantas untuk hari sebesar itu' },
    { property: 'og:description', content: 'Pilih tema, isi detail acara, bagikan ke tamu. Doa dan konfirmasi kehadiran mereka berkumpul di satu tempat.' },
  ],
})
</script>

<template>
  <div>
    <LandingHero />
    <LandingThemes />
    <LandingFeatures />
    <LandingDashboard />
    <LandingDemo />
    <LandingSteps />
    <LandingPricing />
    <LandingTestimonials v-if="hasTestimonials" />
    <LandingFaq />
    <LandingCta />
  </div>
</template>
