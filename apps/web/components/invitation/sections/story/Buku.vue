<script setup lang="ts">
import type { Section } from '~/types/aruna'
import type { StoryStep } from '~/utils/invitation-options'

/**
 * Halaman berselang: foto di satu sisi, cerita di sisi lain, bergantian seperti membuka buku.
 *
 * Wajah paling tenang dari kelimanya, dan satu-satunya yang tidak menggambar apa pun di antara
 * langkah — tanpa rel, tanpa tumpukan. Untuk cerita panjang berfoto banyak itu keuntungan:
 * yang membawa mata turun adalah pergantian sisi, bukan garis yang harus ikut diikuti.
 *
 * Di bawah 40rem kedua sisi melebur jadi satu kolom. Selang-selingnya tetap dihormati lewat
 * urutan baca, bukan lewat posisi.
 */
const props = defineProps<{ section: Section; steps: StoryStep[] }>()
const { galleryImages, motionOptions } = useInvitation()

const root = ref<HTMLElement | null>(null)
const photoOf = (step: StoryStep, at: number) =>
  step.image || galleryImages.value[at % Math.max(1, galleryImages.value.length)] || ''

useArunaMotion(root, ({ gsap }) => {
  gsap.utils.toArray<HTMLElement>('[data-story-halaman]').forEach(node => {
    gsap.from(node, {
      x: node.dataset.side === 'kiri' ? -44 : 44,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: node, start: 'top 84%', toggleActions: 'play none none none' },
    })
  })
}, motionOptions)
</script>

<template>
  <div ref="root" class="w-full">
    <InvitationText :section="props.section" field="text" tag="p" data-iv-reveal class="iv-body m-0 mb-7" multiline />

    <ol class="m-0 grid list-none gap-10 p-0">
      <li
        v-for="(step, at) in props.steps"
        :key="step.id"
        data-story-halaman
        :data-side="step.side"
        class="iv-story-halaman"
      >
        <div v-if="photoOf(step, at)" class="iv-story-halaman-foto">
          <img :src="photoOf(step, at)" alt="" data-iv-photo loading="lazy" class="h-full w-full object-cover">
        </div>
        <div class="grid content-center gap-2 text-left">
          <span class="iv-kicker m-0">{{ String(at + 1).padStart(2, '0') }}</span>
          <h3 v-if="step.title" class="iv-display m-0 text-[1.5rem] leading-snug">{{ step.title }}</h3>
          <p v-if="step.text" class="iv-body m-0 text-[0.9375rem]">{{ step.text }}</p>
        </div>
      </li>
    </ol>

    <InvitationOrnamen data-iv-ornament slot-id="floralAlt" posisi="utama" class="mx-auto mt-8 h-20 w-16 opacity-70" />
  </div>
</template>

<style>
.iv-story-halaman {
  display: grid;
  gap: 1rem;
  align-items: center;
}
.iv-story-halaman-foto {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 0.9rem;
  box-shadow: var(--iv-shadow-lift);
}
@container (min-width: 40rem) {
  .iv-story-halaman { grid-template-columns: 1fr 1fr; gap: 2rem; }
  /*
   * Sisi ditentukan `grid-row: 1` pada foto, bukan `order`: `order` memindahkan urutan BACA
   * pembaca layar juga, dan cerita yang dibacakan terbalik-balik bukan cerita.
   */
  .iv-story-halaman[data-side='kanan'] .iv-story-halaman-foto { grid-column: 2; grid-row: 1; }
  .iv-story-halaman[data-side='kanan'] > :last-child { grid-column: 1; grid-row: 1; }
}
</style>
