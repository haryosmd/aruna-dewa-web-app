<script setup lang="ts">
import { ArrowRight, Play } from 'lucide-vue-next'
import { heroStats } from '~/content/social-proof'

const root = ref<HTMLElement | null>(null)

useArunaMotion(root, ({ gsap, revealText, parallax }) => {
  revealText('[data-hero-title]')

  gsap.from('[data-hero-step]', {
    opacity: 0,
    y: 20,
    duration: 0.8,
    delay: 0.35,
    stagger: 0.09,
    ease: 'power3.out',
  })

  gsap.from('[data-hero-frame]', {
    opacity: 0,
    y: 48,
    scale: 0.96,
    duration: 1.2,
    delay: 0.2,
    ease: 'expo.out',
  })

  // The photo drifts slightly slower than the page, so the arch reads as a window.
  parallax('[data-hero-photo]', { distance: 60 })

  gsap.to('[data-hero-sprig]', {
    rotate: 4,
    yPercent: -6,
    duration: 5,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    stagger: 0.8,
  })
})

const stats = heroStats
</script>

<template>
  <section ref="root" class="relative overflow-hidden bg-surface pt-10 pb-16 md:pt-16 md:pb-24">
    <!-- Warm wash behind the headline, kept well under text contrast thresholds. -->
    <div class="pointer-events-none absolute -left-40 -top-40 h-[38rem] w-[38rem] rounded-full bg-primary-soft blur-3xl opacity-70" aria-hidden="true" />
    <div class="pointer-events-none absolute -right-32 top-40 h-[26rem] w-[26rem] rounded-full bg-gold-soft blur-3xl opacity-60" aria-hidden="true" />

    <div class="shell relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
      <div class="grid content-start gap-7">
        <p class="eyebrow" data-hero-step>
          <OrnamentBloom class="h-4 w-3.5" />
          Undangan pernikahan digital
        </p>

        <h1 data-hero-title class="font-display text-display-1 font-semibold text-ink">
          Hari yang kalian tunggu bersama. Undangannya jangan seadanya.
        </h1>

        <p data-hero-step class="max-w-xl text-body-lg text-ink-muted">
          Kalian sudah cukup sibuk mengurus hari itu. Biar undangannya yang mengurus dirinya sendiri:
          setiap tamu dapat tautannya sendiri, jawaban mereka masuk rapi ke satu daftar, dan kalian
          tinggal membagikannya.
        </p>

        <div data-hero-step class="flex flex-wrap items-center gap-3">
          <UiButton id="landing-hero-order" as="NuxtLink" to="/order" size="lg">
            Mulai buat undangan
            <ArrowRight :size="18" aria-hidden="true" />
          </UiButton>
          <UiButton id="landing-hero-demo" as="NuxtLink" to="/i/demo" tone="outline" size="lg">
            <Play :size="16" aria-hidden="true" />
            Buka contohnya
          </UiButton>
        </div>

        <p data-hero-step class="text-caption text-ink-subtle">
          Gratis mulai menyusun · bayar saat siap terbit · Mulai dari Rp279.000 untuk 12 bulan
        </p>

        <dl data-hero-step class="mt-2 grid grid-cols-3 gap-6 border-t border-border pt-7">
          <div v-for="[value, label] in stats" :key="label" class="grid gap-1">
            <dt class="font-display text-h3 font-semibold text-ink">{{ value }}</dt>
            <dd class="m-0 text-caption text-ink-muted">{{ label }}</dd>
          </div>
        </dl>
      </div>

      <div data-hero-frame class="relative mx-auto w-full max-w-md lg:max-w-none">
        <OrnamentSprig data-hero-sprig class="absolute -left-6 top-10 z-10 hidden h-40 w-28 text-sage/70 sm:block" />
        <OrnamentSprig data-hero-sprig class="absolute -right-6 bottom-16 z-10 hidden h-36 w-24 -scale-x-100 text-primary/45 sm:block" />

        <!-- Arch window: the single most legible "wedding" shape there is. -->
        <div class="relative overflow-hidden rounded-t-[999px] rounded-b-xl bg-surface-3 shadow-veil">
          <div class="aspect-[3/4] overflow-hidden">
            <!--
              Satu-satunya gambar di halaman ini yang dimuat eager, dan elemen LCP-nya.
              `fetchpriority="high"` dipasangkan dengan `rel="preload"` di `pages/index.vue`:
              tanpa keduanya browser menemukan berkas ini lewat parser lalu menahannya di
              prioritas rendah sampai puluhan chunk JS dan berkas font selesai — terukur
              2436 ms sebelum request-nya dikirim sama sekali.

              Berkasnya varian 900 px dari `scripts/optimize-images.ts`, bukan
              `/images/hero.webp` yang 1600 px. Yang asli tetap dipakai undangan demo.
            -->
            <img
              data-hero-photo
              src="/images/hero-landing.webp"
              alt="Pasangan pengantin berdiri di taman botani"
              width="900"
              height="600"
              fetchpriority="high"
              class="h-[118%] w-full object-cover"
            >
          </div>
          <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />

          <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
            <div class="grid gap-1 text-ink-inverse">
              <p class="m-0 font-display text-[1.75rem] leading-none">Aruna &amp; Dewa</p>
              <p class="m-0 text-caption text-ink-inverse/75">18 Oktober 2026 · Pendopo Aruna</p>
            </div>
            <OrnamentMonogram class="h-14 w-14 text-ink-inverse/85" initials="AD" />
          </div>
        </div>

        <div class="absolute -bottom-5 -left-4 hidden rounded-lg border border-border bg-surface px-4 py-3 shadow-float sm:block">
          <p class="m-0 text-caption font-semibold text-ink">Yosi Susanti · Hadir</p>
          <p class="m-0 text-caption text-ink-subtle">2 orang · baru saja RSVP</p>
        </div>
      </div>
    </div>
  </section>
</template>
