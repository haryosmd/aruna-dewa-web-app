<script setup lang="ts">
import { testimonials } from '~/content/social-proof'

/** Bagian testimoni baru tayang kalau ada kutipan asli untuk ditampilkan. */
const hasTestimonials = computed(() => testimonials.length > 0)

useHead({
  title: 'Aruna Dewa — Undangan pernikahan digital yang terasa seperti undangan cetak',
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
