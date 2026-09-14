<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

const root = ref<HTMLElement | null>(null)

useArunaMotion(root, ({ revealText, revealUp, parallax, drawSvg }) => {
  revealText('[data-cta-title]', { trigger: root.value })
  revealUp('[data-cta-reveal]')
  parallax('[data-cta-photo]', { distance: 55 })
  drawSvg('[data-cta-ornament] [data-draw]', { duration: 2 })
})
</script>

<template>
  <section ref="root" class="relative isolate overflow-hidden bg-ink text-ink-inverse">
    <div class="absolute inset-0" aria-hidden="true">
      <img
        data-cta-photo
        src="/images/venue.webp"
        alt=""
        width="1000"
        height="666"
        class="h-[118%] w-full object-cover opacity-35"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/60 to-ink/90" />
    </div>

    <div class="shell relative grid justify-items-center gap-8 py-24 text-center md:py-32">
      <OrnamentGarland data-cta-ornament class="h-14 w-72 text-gold/70" />

      <h2 data-cta-title class="max-w-3xl font-display text-display-1 font-semibold">
        Mulai rangkai kabar bahagia kalian.
      </h2>

      <p data-cta-reveal class="max-w-xl text-body-lg text-ink-inverse/70">
        Gratis mulai menyusun. Semua yang kalian isi tersimpan, dan pembayaran baru diminta
        saat undangannya benar-benar siap dibagikan.
      </p>

      <div data-cta-reveal class="flex flex-wrap justify-center gap-3">
        <UiButton id="landing-cta-order" as="NuxtLink" to="/order" tone="gold" size="lg">
          Mulai buat undangan
          <ArrowRight :size="18" aria-hidden="true" />
        </UiButton>
        <UiButton
          id="landing-cta-demo"
          as="NuxtLink"
          to="/i/demo"
          size="lg"
          class="border border-ink-inverse/30 bg-transparent text-ink-inverse hover:border-ink-inverse hover:bg-ink-inverse/10 hover:shadow-none"
        >
          Buka contohnya dulu
        </UiButton>
      </div>

      <OrnamentDivider data-cta-ornament class="h-6 w-56 text-ink-inverse/40" />
    </div>
  </section>
</template>
