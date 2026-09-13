<script setup lang="ts">
import type { Section } from '~/types/aruna'
import { toStorySteps } from '~/utils/invitation-options'

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, galleryImages, initials } = useInvitation()

const root = ref<HTMLElement | null>(null)

const steps = computed(() => toStorySteps(props.section.data.steps))
/** Prosa lama tetap tampil apa adanya; langkah baru hanya ditulis saat pasangan mengisinya. */
const prose = computed(() => text(props.section, 'text'))
const fallbackPhoto = computed(() => text(props.section, 'image') || galleryImages.value[1] || '')

const photoOf = (step: { image: string }, at: number) => step.image || galleryImages.value[at % Math.max(1, galleryImages.value.length)] || ''

/**
 * Rel melengkung. Dibangun sekali dari jumlah langkah, bukan digambar tangan, supaya
 * pasangan yang menulis tiga langkah dan yang menulis tujuh sama-sama mendapat lengkung
 * yang rapat. Dua ratus satuan tinggi per langkah adalah jarak yang membuat titiknya
 * bergerak terasa, tanpa membuat rel jadi garis lurus.
 */
const railHeight = computed(() => Math.max(1, steps.value.length) * 200)
const railPath = computed(() => {
  const segments = ['M50 0']
  for (let at = 0; at < Math.max(1, steps.value.length); at += 1) {
    const top = at * 200
    const bend = at % 2 === 0 ? 96 : 4
    segments.push(`C${bend} ${top + 70} ${bend} ${top + 130} 50 ${top + 200}`)
  }
  return segments.join(' ')
})

useArunaMotion(root, ({ gsap, drawSvg, travelPath }) => {
  drawSvg('[data-story-rail]', { duration: 2.2, start: 'top 72%' })
  travelPath('[data-story-rail]', '[data-story-dot]', { trigger: root.value, end: 'bottom 70%' })

  /*
   * Tiap langkah masuk dari sisinya sendiri, lalu **memudar** saat langkah berikutnya
   * masuk. Itu yang membuatnya terbaca sebagai perjalanan, bukan sebagai daftar: pada
   * satu saat hanya ada satu langkah yang terang.
   */
  gsap.utils.toArray<HTMLElement>('[data-story-step]').forEach((node, index) => {
    const fromLeft = node.dataset.side === 'kiri'
    gsap.from(node, {
      x: fromLeft ? -56 : 56,
      y: 28,
      opacity: 0,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: node, start: 'top 82%', toggleActions: 'play none none none' },
    })
    gsap.to(node, {
      opacity: 0.34,
      ease: 'none',
      scrollTrigger: { trigger: node, start: 'bottom 46%', end: 'bottom 18%', scrub: 0.6 },
    })
    void index
  })

  /*
   * Garis akhir: ilustrasi yang sepanjang cerita abu-abu akhirnya berwarna dan bersinar.
   * `filter` di-scrub, bukan di-tween sekali, supaya tamu merasa merekalah yang
   * menyalakannya dengan scroll.
   */
  gsap.fromTo(
    '[data-story-finale]',
    { filter: 'saturate(0.08) brightness(0.92)' },
    {
      filter: 'saturate(1) brightness(1.08) drop-shadow(0 0 18px color-mix(in srgb, var(--iv-primary) 55%, transparent))',
      ease: 'none',
      scrollTrigger: { trigger: '[data-story-finale]', start: 'top 88%', end: 'top 44%', scrub: 0.7 },
    },
  )
})
</script>

<template>
  <div ref="root">
    <InvitationSection
      id="iv-story"
      tone="ink"
      :compact="compact"
      kicker="Cerita kami"
      :title="text(props.section, 'title', 'Dari satu percakapan')"
      :ornaments="compact ? null : orn"
      :intensity="intensity"
      :seed="props.seed"
    >
      <!-- Tanpa langkah, section ini tetap seperti sebelumnya: satu foto dan satu paragraf. -->
      <template v-if="!steps.length">
        <div v-if="fallbackPhoto" data-iv-reveal class="iv-portrait iv-portrait--wide">
          <img :src="fallbackPhoto" alt="" data-iv-photo loading="lazy" class="h-full w-full object-cover">
        </div>
        <p v-if="prose" data-iv-reveal class="iv-body m-0">{{ prose }}</p>
        <OrnamentGlyph :glyph="orn.floralAlt" data-iv-ornament class="h-20 w-16 opacity-70" />
      </template>

      <template v-else>
        <p v-if="prose" data-iv-reveal class="iv-body m-0">{{ prose }}</p>

        <div class="iv-story" :style="{ '--story-h': `${railHeight}px` }">
          <!--
            Rel digambar pada posisi akhirnya, lalu DrawSVG menumbuhkannya. Titiknya
            berjalan lewat MotionPathPlugin mengikuti scrub — dua gerakan pada satu
            path yang sama, bukan dua animasi yang kebetulan searah.
          -->
          <svg
            class="iv-story-rail"
            :viewBox="`0 0 100 ${railHeight}`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              data-story-rail
              :d="railPath"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              vector-effect="non-scaling-stroke"
              opacity="0.55"
            />
          </svg>
          <span data-story-dot class="iv-story-dot" aria-hidden="true" />

          <ol class="iv-story-steps m-0 p-0 list-none">
            <li
              v-for="(step, at) in steps"
              :key="step.id"
              data-story-step
              :data-side="step.side"
              class="iv-story-step"
            >
              <div v-if="photoOf(step, at)" class="iv-story-photo">
                <img :src="photoOf(step, at)" alt="" data-iv-photo loading="lazy" class="h-full w-full object-cover">
              </div>
              <div class="grid gap-2">
                <h3 v-if="step.title" class="iv-display m-0 text-[1.4rem] leading-snug">{{ step.title }}</h3>
                <p v-if="step.text" class="iv-body m-0 text-[0.9375rem]">{{ step.text }}</p>
              </div>
            </li>
          </ol>
        </div>

        <!-- Garis akhir. Monogram tema, bukan foto: ini titik cerita, bukan kenangan lain. -->
        <OrnamentGlyph
          :glyph="orn.monogram"
          data-story-finale
          data-iv-ornament
          class="iv-story-finale"
          :initials="initials"
        />
        <p data-iv-reveal class="iv-body m-0 text-caption opacity-80">…dan sampailah kami di hari ini.</p>
      </template>
    </InvitationSection>
  </div>
</template>

<style>
.iv-story {
  position: relative;
  width: 100%;
  min-height: var(--story-h, 400px);
}

.iv-story-rail {
  position: absolute;
  inset-block: 0;
  left: 50%;
  width: 62%;
  height: 100%;
  transform: translateX(-50%);
  color: #fffdf7;
  pointer-events: none;
}

/* Titik penanda. Keadaan diamnya di pangkal rel, jadi tanpa JS ia tetap punya tempat. */
.iv-story-dot {
  position: absolute;
  top: 0;
  left: 50%;
  width: 0.85rem;
  height: 0.85rem;
  margin: -0.425rem 0 0 -0.425rem;
  border-radius: 999px;
  background: #fffdf7;
  box-shadow: 0 0 0 6px color-mix(in srgb, #fffdf7 22%, transparent);
  pointer-events: none;
}

.iv-story-steps {
  position: relative;
  display: grid;
  gap: 0;
}
.iv-story-step {
  display: grid;
  gap: 0.9rem;
  justify-items: center;
  padding-block: 2.25rem;
  text-align: center;
  min-height: 200px;
  align-content: center;
}
@media (min-width: 40rem) {
  /* Di layar lebar langkah benar-benar berpindah sisi, jadi relnya punya alasan melengkung. */
  .iv-story-step { width: 46%; text-align: left; justify-items: start; }
  .iv-story-step[data-side='kiri'] { justify-self: start; }
  .iv-story-step[data-side='kanan'] { justify-self: end; }
}

/*
 * Foto langkah sengaja kecil — maksimal 260px. Cerita ini dibaca, bukan ditonton;
 * foto yang lebih besar akan mengalahkan teksnya sendiri.
 */
.iv-story-photo {
  width: min(100%, 16.25rem);
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 0.75rem;
  box-shadow: var(--iv-shadow-lift);
}

.iv-story-finale {
  width: min(58%, 11rem);
  height: auto;
  aspect-ratio: 1;
  color: #fffdf7;
}
</style>
