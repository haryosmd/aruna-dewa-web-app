<script setup lang="ts">
import type { Section } from '~/types/aruna'
import { coverLayouts, toCoverLayout } from '~/utils/invitation-options'

const props = defineProps<{ section: Section; seed: number }>()
const invitation = useInvitation()
const { orn, intensity, compact, coupleNames, greeting, headlineDate, galleryImages } = invitation

const presentation = computed(() => themeOf(invitation.document.value.templateId))
const layout = computed(() => toCoverLayout(props.section.data.layout))
const photo = computed(() => text(props.section, 'image') || presentation.value.cover)
const title = computed(() => text(props.section, 'title', coupleNames.value))

/** Kolase memakai foto galeri; kalau pasangan belum mengunggah apa pun, fotonya diulang. */
const collage = computed(() => {
  const pool = [photo.value, ...galleryImages.value].filter(Boolean)
  return [0, 1, 2].map(at => pool[at % pool.length] ?? photo.value)
})

/** Hanya `full-bleed` yang menulis teks di atas foto, jadi hanya di sana teksnya kertas. */
const onPhoto = computed(() => layout.value === 'full-bleed')

// Dipakai hanya untuk dokumentasi tipe di editor; menjaga daftar tetap satu sumber.
void coverLayouts
</script>

<template>
  <header
    id="iv-cover"
    data-iv-section
    :data-cover-layout="layout"
    :class="cn(
      'iv-cover relative grid place-items-center overflow-hidden px-5 text-center',
      compact ? 'min-h-[26rem]' : 'min-h-[var(--iv-layar-h,92svh)]',
    )"
    :style="onPhoto ? { color: '#fffdf7' } : { background: 'var(--iv-bg)', color: 'var(--iv-fg)' }"
  >
    <!-- Full bleed: foto mengisi seluruh layar, teks ditulis di atasnya. -->
    <template v-if="layout === 'full-bleed'">
      <img
        data-iv-parallax
        data-iv-photo
        :src="photo"
        :alt="`Foto ${coupleNames}`"
        class="absolute inset-0 h-[118%] w-full object-cover"
      >
      <div class="absolute inset-0" style="background: linear-gradient(to top, rgb(0 0 0 / 0.72) 6%, rgb(0 0 0 / 0.22) 54%, rgb(0 0 0 / 0.42))" />
    </template>

    <!-- Empat komposisi lain berdiri di atas latar tema, jadi ladang ornamennya terlihat. -->
    <InvitationOrnamentField
      v-else-if="!compact"
      :set="orn"
      :intensity="intensity"
      tone="base"
      :seed="props.seed"
    />

    <div
      :class="cn(
        'relative w-full',
        layout === 'split-editorial' ? 'mx-auto grid max-w-5xl items-center gap-8 @min-[48rem]:grid-cols-2 @min-[48rem]:text-left' : 'grid justify-items-center gap-4',
      )"
    >
      <!--
        Potret berbingkai: mask arch, sudut ornamen menempel padanya.

        `data-iv-photo-frame` adalah penanda aturan 6 DESIGN.md: ornamen yang MEMBINGKAI
        sebuah foto dianimasikan dalam rentang scroll yang sama dengan fotonya. Sebelum ini
        kedua sudut hanya ber-`data-iv-ornament`, yang tidak dijaring `orchestrate()` sama
        sekali — jadi pada partitur mana pun selain `draw` mereka diam, dan satu-satunya
        alasan mereka tampak bergerak adalah karena `.iv-cover-arch` pembungkusnya yang
        bergerak. Bergerak karena ikut induk bukan animasi; itu kebetulan tata letak.
      -->
      <div v-if="layout === 'arch-potret'" data-iv-photo class="iv-cover-arch">
        <img :src="photo" :alt="`Foto ${coupleNames}`" class="h-full w-full object-cover">
        <OrnamentGlyph :glyph="orn.corner" data-iv-ornament data-iv-photo-frame class="iv-portrait-corner iv-portrait-corner--tl" aria-hidden="true" />
        <OrnamentGlyph :glyph="orn.corner" data-iv-ornament data-iv-photo-frame class="iv-portrait-corner iv-portrait-corner--br" aria-hidden="true" />
      </div>

      <!-- Kayon: foto duduk di dalam siluet bingkai milik tema. -->
      <div v-else-if="layout === 'kayon-frame'" class="iv-cover-kayon">
        <img :src="photo" :alt="`Foto ${coupleNames}`" data-iv-photo class="iv-cover-kayon-photo">
        <OrnamentGlyph :glyph="orn.frame" data-iv-ornament data-iv-photo-frame class="iv-cover-kayon-frame" aria-hidden="true" />
      </div>

      <!-- Kolase prewed: satu foto besar dan dua pendamping. -->
      <div v-else-if="layout === 'kolase-prewed'" class="iv-cover-collage">
        <img :src="collage[0]" :alt="`Foto ${coupleNames}`" data-iv-photo class="iv-cover-collage-lead">
        <img :src="collage[1]" alt="" aria-hidden="true" data-iv-photo class="iv-cover-collage-side">
        <img :src="collage[2]" alt="" aria-hidden="true" data-iv-photo class="iv-cover-collage-side">
      </div>

      <!-- Split editorial: foto satu sisi, teks di sisi lain. -->
      <div v-else-if="layout === 'split-editorial'" data-iv-photo class="iv-cover-split-photo">
        <img :src="photo" :alt="`Foto ${coupleNames}`" class="h-full w-full object-cover">
      </div>

      <div :class="cn('grid gap-4', layout === 'split-editorial' ? 'justify-items-center @min-[48rem]:justify-items-start' : 'justify-items-center')">
        <OrnamentGlyph
          v-if="layout !== 'split-editorial'"
          :glyph="orn.garland"
          data-iv-ornament
          data-iv-lead
          class="h-14 w-64"
          :class="onPhoto ? 'opacity-90' : 'opacity-80'"
          :style="onPhoto ? undefined : { color: 'var(--iv-primary)' }"
        />
        <!--
          Tanpa `opacity-90` tambahan: `.iv-kicker` sudah 0,7, dan 0,7 × 0,9 = 0,63 membuat
          "Undangan pernikahan" 11px tebal jatuh ke 3,66:1 di atas latar tema (axe, fase 62 —
          ketahuan begitu panggung editor menampilkan cover pada skala 100%).
        -->
        <p data-iv-lead class="iv-kicker m-0">{{ invitation.t('cover.kicker') }}</p>
        <component
          :is="compact ? 'h2' : 'h1'"
          data-iv-lead
          class="iv-display iv-script m-0"
          :class="'text-[clamp(3rem,13cqw,5.5rem)]'"
        >
          {{ title }}
        </component>
        <p v-if="headlineDate" class="iv-body m-0 text-[0.9375rem] opacity-90">{{ headlineDate }}</p>
        <p v-if="greeting" class="iv-body m-0 mt-6 text-[1.05rem] opacity-95">
          {{ invitation.t('gate.greeting') }} {{ greeting }}
        </p>
        <OrnamentGlyph
          :glyph="orn.symbol"
          data-iv-ornament
          class="mt-4 h-16 w-20"
          :class="onPhoto ? 'opacity-80' : 'opacity-75'"
          :style="onPhoto ? undefined : { color: 'var(--iv-primary)' }"
        />
      </div>
    </div>
  </header>
</template>

<style>
/*
 * Lima komposisi cover. Yang membedakannya bukan hiasan, melainkan bagaimana fotonya
 * diperlakukan: dilatar-belakangi, dibingkai, dipotong arch, dikolase, atau disandingkan.
 * Pasangan yang punya prewed bagus pantas mendapat komposisi yang memajangnya, bukan
 * memakainya sebagai wallpaper di balik teks.
 */
/*
 * `cqw`, bukan `vw`.
 *
 * Tiga kotak foto cover ini adalah sisa terakhir yang membaca lebar layar, bukan lebar
 * wadahnya — luput saat undangan dipindahkan ke container query. Akibatnya tidak terlihat di
 * undangan sungguhan (di sana wadahnya memang selebar layar), tapi di pratinjau perangkat
 * dasbor foto cover mengikuti lebar browser pasangan, bukan lebar ponsel yang sedang
 * disimulasikan: render "Ponsel" dan "Tablet" bisa keluar dengan foto sebesar yang sama.
 * Pratinjau yang berbohong tepat di bagian yang paling ingin dilihat pasangan.
 */
.iv-cover-arch {
  position: relative;
  width: min(78cqw, 20rem);
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 999px 999px 0.75rem 0.75rem;
  box-shadow: var(--iv-shadow-lift);
}

.iv-cover-kayon {
  position: relative;
  width: min(84cqw, 22rem);
  aspect-ratio: 300 / 420;
  display: grid;
  place-items: center;
}
.iv-cover-kayon-photo {
  position: absolute;
  inset: 12% 16% 14%;
  width: auto;
  height: auto;
  object-fit: cover;
  border-radius: 999px 999px 0.5rem 0.5rem;
}
.iv-cover-kayon-frame {
  position: relative;
  z-index: 1;
  width: 100%;
  height: auto;
  aspect-ratio: 300 / 420;
  color: var(--iv-primary);
}

.iv-cover-collage {
  display: grid;
  width: min(92cqw, 28rem);
  gap: 0.6rem;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: repeat(2, 1fr);
}
.iv-cover-collage-lead {
  grid-row: span 2;
  width: 100%;
  height: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 0.75rem;
  box-shadow: var(--iv-shadow-lift);
}
.iv-cover-collage-side {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.5rem;
  box-shadow: var(--iv-shadow-card);
}

.iv-cover-split-photo {
  width: min(80cqw, 24rem);
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: 0.75rem;
  box-shadow: var(--iv-shadow-lift);
  justify-self: center;
}
</style>
