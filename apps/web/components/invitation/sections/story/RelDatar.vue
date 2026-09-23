<script setup lang="ts">
import type { Section } from '~/types/aruna'
import type { StoryStep } from '~/utils/invitation-options'

/**
 * Geser ke samping: langkah berjajar mendatar, digulir satu per satu dengan snap.
 *
 * Pola strip-nya diambil dari layout `rail` galeri — `scroll-snap-type: x mandatory` dengan
 * kartu selebar 72% wadah, jadi kartu berikutnya selalu mengintip dan tamu tahu ada lanjutannya.
 *
 * **Tidak memakai scroll horizontal yang digerakkan gulir vertikal** (pola "pin lalu scrub" yang
 * biasa dipakai untuk ini). Di ponsel — tempat undangan ini sebenarnya dibaca — mem-pin satu
 * bagian selama beberapa layar berarti merebut gulir tamu, dan tamu yang ingin melewati bagian
 * ini jadi tidak bisa. Di sini gulir vertikal tetap milik halaman; yang mendatar digeser jari.
 */
const props = defineProps<{ section: Section; steps: StoryStep[] }>()
const { galleryImages, motionOptions } = useInvitation()

const root = ref<HTMLElement | null>(null)
const photoOf = (step: StoryStep, at: number) =>
  step.image || galleryImages.value[at % Math.max(1, galleryImages.value.length)] || ''

useArunaMotion(root, ({ revealUp }) => {
  revealUp('[data-story-geser]', { y: 24, start: 'top 84%' })
}, motionOptions)
</script>

<template>
  <div ref="root" class="w-full">
    <InvitationText :section="props.section" field="text" tag="p" data-iv-reveal class="iv-body m-0 mb-6" multiline />

    <!--
      `tabindex="0"` bukan hiasan: wadah yang bisa digulir wajib bisa dicapai keyboard, kalau
      tidak langkah kedua dan seterusnya tidak pernah terjangkau tanpa tetikus.
    -->
    <ol
      data-story-geser
      class="iv-story-geser m-0 list-none p-0"
      tabindex="0"
      role="group"
      aria-label="Langkah cerita, geser ke samping"
    >
      <li v-for="(step, at) in props.steps" :key="step.id" class="iv-story-geser-kartu">
        <div v-if="photoOf(step, at)" class="iv-story-geser-foto">
          <img :src="photoOf(step, at)" alt="" data-iv-photo loading="lazy" class="h-full w-full object-cover">
        </div>
        <div class="grid gap-1.5 pt-3 text-left">
          <span class="iv-kicker m-0">{{ String(at + 1).padStart(2, '0') }}</span>
          <h3 v-if="step.title" class="iv-display m-0 text-[1.3rem] leading-snug">{{ step.title }}</h3>
          <p v-if="step.text" class="iv-body m-0 text-[0.9375rem]">{{ step.text }}</p>
        </div>
      </li>
    </ol>

    <InvitationOrnamen data-iv-ornament slot-id="divider" posisi="utama" class="mx-auto mt-6 h-7 w-48 opacity-65" />
  </div>
</template>

<style>
.iv-story-geser {
  display: flex;
  gap: 1rem;
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 0.75rem;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 0.25rem;
}
.iv-story-geser-kartu {
  flex: 0 0 auto;
  width: min(72%, 17rem);
  scroll-snap-align: center;
  scroll-margin-inline: 0.5rem;
}
.iv-story-geser-foto {
  width: 100%;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: 0.9rem;
  box-shadow: var(--iv-shadow-lift);
}
@container (min-width: 40rem) {
  .iv-story-geser-kartu { width: 15rem; }
}
</style>
