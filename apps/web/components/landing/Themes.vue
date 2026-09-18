<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { ornament, type OrnamentSet } from '~/utils/ornaments'
import { ornamentRamp, rampStyle } from '~/utils/ornament-palette'

const root = ref<HTMLElement | null>(null)
const themes = invitationThemes

/**
 * Pancingan per kartu, diturunkan dari data — bukan kalimat pemasaran yang ditulis
 * tangan lalu basi begitu bank ornamen berubah. Set sebuah tema berisi delapan glyph,
 * lima layer, dan satu segel; jumlahnya dihitung unik supaya tetap jujur kalau ada slot
 * yang kebetulan memakai ornamen yang sama.
 */
function teaser(set: OrnamentSet) {
  const unique = new Set<string>([
    set.frame, set.divider, set.corner, set.floral, set.floralAlt,
    set.monogram, set.motif, set.symbol, set.garland, set.seal,
    ...set.layers,
  ])
  return `${unique.size} ornamen khas · amplop ${ornament(set.seal).name.toLowerCase()}`
}

useArunaMotion(root, ({ revealText, revealUp, bloomIn, cascadeIn }) => {
  revealText('[data-themes-title]', { trigger: root.value })
  revealUp('[data-themes-intro]')
  revealUp('[data-theme-card]', { y: 40, stagger: 0.1 })

  /*
   * Ornamen kartu bergerak dari jangkarnya sendiri saat kartu masuk viewport: rumpun
   * mekar dari bawah, untaian jatuh dari atas. Inilah yang membuat koleksi terlihat
   * sekaya halaman undangannya sendiri — dulu tiap kartu hanya membawa satu glyph kecil.
   */
  bloomIn('[data-theme-card] [data-layer-slot="bloom"], [data-theme-card] [data-layer-slot="crown"], [data-theme-card] [data-layer-slot="swag"]', { stagger: 0.1 })
  cascadeIn('[data-theme-card] [data-layer-slot="cascade"], [data-theme-card] [data-layer-slot="cluster"]', { stagger: 0.08 })
})
</script>

<template>
  <section id="tema" ref="root" class="section grain bg-surface-2">
    <div class="shell grid gap-12">
      <header class="grid max-w-2xl gap-5">
        <p class="eyebrow" data-themes-intro>Koleksi tema</p>
        <h2 data-themes-title class="font-display text-display-2 font-semibold text-ink">
          Pilih suasana yang paling terasa seperti kalian.
        </h2>
        <p data-themes-intro class="text-body-lg text-ink-muted">
          Setiap tema membawa ornamennya sendiri — bingkai, pemisah, sudut, motif, sampai segel
          amplopnya. Bukan tiga warna yang ditukar, melainkan wajah yang benar-benar berbeda.
        </p>
      </header>

      <UiCarousel label="Tema undangan" align="start" control-id="landing-themes">
        <article
          v-for="(theme, index) in themes"
          :key="theme.id"
          data-theme-card
          class="group min-w-0 shrink-0 basis-[76%] sm:basis-[46%] lg:basis-[calc(25%-1rem)]"
        >
          <div
            class="grid h-full overflow-hidden rounded-xl border border-border bg-surface shadow-lift transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1.5 hover:shadow-veil"
          >
            <!--
              Contoh hidup: palet, font, dan ladang ornamen milik tema itu sendiri, bukan
              tangkapan layar. `--iv-primary` dipasang di sini karena `OrnamentField`
              mewarnai kepingnya dari variabel tema undangan, yang tidak ada di landing.

              Sejak ornamen punya ramp empat tingkat, `--iv-primary` saja tidak cukup: tanpa
              `rampStyle()` keping di kartu ini jatuh ke `currentColor` dan tetap satu warna,
              jadi pasangan memilih tema dari kartu yang tidak menunjukkan warnanya.
            -->
            <div
              class="relative aspect-[4/5] overflow-hidden"
              :style="{
                background: theme.tokens.background,
                color: theme.tokens.foreground,
                '--iv-primary': theme.tokens.primary,
                ...rampStyle(ornamentRamp(theme.tokens, theme.accent)),
              }"
            >
              <!--
                `loading="lazy"` wajib: section ini di bawah lipatan dan kartunya bergulir
                mendatar, jadi enam berkas cover dulu ikut antre di muat pertama dan merebut
                giliran dari foto hero yang justru elemen LCP.

                Tanpa `width`/`height` dengan sengaja. Geometrinya sudah dikunci
                `aspect-[4/5]` di pembungkus, dan gambarnya absolut memenuhi kotak itu, jadi
                atribut ini tidak bisa mempengaruhi tata letak — sementara keenam berkasnya
                punya rasio yang berbeda-beda, jadi angka tunggal apa pun di sini bohong.
              -->
              <img
                :src="theme.cover"
                :alt="`Pratinjau tema ${theme.name}`"
                loading="lazy"
                decoding="async"
                class="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-700 ease-out-expo group-hover:scale-105"
              >
              <div class="absolute inset-0" :style="{ background: `linear-gradient(to top, ${theme.tokens.background} 10%, transparent 66%)` }" />

              <!--
                Tidak ada pengali di sini: ladangnya sendiri yang mengukur lebar kartu
                lewat container query, sama seperti saat ia mengisi section selebar layar.
              -->
              <!--
                `seed` = indeks kartu, bukan 1 untuk semuanya. `OrnamentField` memilih satu
                dari empat resep jangkar lewat `seed % 4`, jadi seed yang dipatok membuat
                keempat kartu memasang kepingnya di koordinat yang sama persis — hanya
                bentuknya yang berganti. Berderet-deret, itu terbaca sebagai satu kartu yang
                diulang empat kali, bukan empat tema.
              -->
              <InvitationOrnamentField
                :set="theme.ornaments"
                intensity="seimbang"
                tone="base"
                :seed="index"
              />

              <div class="absolute inset-x-0 bottom-0 grid gap-1 p-4 text-center">
                <p class="m-0 text-[0.5625rem] font-semibold uppercase tracking-[0.22em] opacity-70">Undangan pernikahan</p>
                <p class="m-0 text-[1.65rem] leading-none" :style="{ fontFamily: fontStack(theme.tokens.font) }">Aruna &amp; Dewa</p>
                <p class="m-0 text-[0.6875rem] opacity-75">18 . 10 . 2026</p>
              </div>
            </div>

            <div class="grid content-start gap-2.5 p-5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="m-0 font-display text-h3 font-semibold text-ink">{{ theme.name }}</h3>
                <span class="flex gap-1" aria-hidden="true">
                  <span class="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink/10" :style="{ background: theme.tokens.background }" />
                  <span class="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink/10" :style="{ background: theme.tokens.primary }" />
                  <span class="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink/10" :style="{ background: theme.accent }" />
                </span>
              </div>

              <p class="m-0 text-caption text-ink-subtle">{{ theme.mood }}</p>
              <p class="m-0 text-caption font-semibold text-primary">{{ teaser(theme.ornaments) }}</p>

              <!--
                Enam tautan yang semuanya bernama "Buka tema ini" tidak bisa dibedakan
                pembaca layar, jadi nama temanya ikut masuk ke accessible name — tetap
                memuat teks yang terlihat, sesuai WCAG "Label in Name".
              -->
              <NuxtLink
                :id="`landing-theme-${theme.id}`"
                :to="`/i/demo?tema=${theme.id}`"
                class="mt-1 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border-strong px-4 text-[0.875rem] font-semibold text-ink no-underline transition-colors duration-200 hover:border-primary hover:text-primary"
              >
                Buka tema ini<span class="sr-only"> — {{ theme.name }}</span>
                <ArrowUpRight :size="15" aria-hidden="true" />
              </NuxtLink>
            </div>
          </div>
        </article>
      </UiCarousel>
    </div>
  </section>
</template>
