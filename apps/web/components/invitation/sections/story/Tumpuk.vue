<script setup lang="ts">
import type { Section } from '~/types/aruna'
import type { StoryStep } from '~/utils/invitation-options'

/**
 * Kartu bertumpuk: tiap langkah menahan diri di layar sementara langkah berikutnya naik
 * menimpanya.
 *
 * Gerak utamanya milik CSS — `position: sticky` pada tiap kartu, dengan `top` yang sama, jadi
 * kartu ke-n berhenti tepat di tempat kartu ke-(n−1) berhenti dan menutupinya. Itu keputusan,
 * bukan kemalasan: tumpukan yang digerakkan JavaScript akan meminta satu ScrollTrigger per
 * kartu, dan bagian ini menerima sampai dua puluh langkah dari satu anggaran 240 trigger yang
 * dipakai seluruh halaman.
 *
 * Yang tersisa untuk GSAP hanya ongkos masuknya: kartu paling atas sedikit menyusut saat
 * tertimpa, supaya tumpukannya terbaca punya kedalaman.
 */
const props = defineProps<{ section: Section; steps: StoryStep[] }>()
const { galleryImages, motionOptions } = useInvitation()

const root = ref<HTMLElement | null>(null)
const photoOf = (step: StoryStep, at: number) =>
  step.image || galleryImages.value[at % Math.max(1, galleryImages.value.length)] || ''

useArunaMotion(root, ({ gsap }) => {
  const kartu = gsap.utils.toArray<HTMLElement>('[data-story-kartu]')
  kartu.forEach((node, at) => {
    // Kartu terakhir tidak pernah tertimpa, jadi ia tidak perlu menyusut.
    if (at === kartu.length - 1) return
    gsap.to(node, {
      scale: 0.94,
      opacity: 0.55,
      ease: 'none',
      scrollTrigger: { trigger: node, start: 'top 22%', end: 'bottom 30%', scrub: 0.5 },
    })
  })
}, motionOptions)
</script>

<template>
  <div ref="root" class="iv-story-tumpuk w-full">
    <InvitationText :section="props.section" field="text" tag="p" data-iv-reveal class="iv-body m-0 mb-6" multiline />

    <ol class="m-0 grid list-none gap-5 p-0">
      <li v-for="(step, at) in props.steps" :key="step.id" data-story-kartu class="iv-story-kartu">
        <div v-if="photoOf(step, at)" class="iv-story-kartu-foto">
          <img :src="photoOf(step, at)" alt="" data-iv-photo loading="lazy" class="h-full w-full object-cover">
        </div>
        <div class="grid gap-1.5 p-5 text-left">
          <span class="iv-kicker m-0">{{ String(at + 1).padStart(2, '0') }}</span>
          <h3 v-if="step.title" class="iv-display m-0 text-[1.4rem] leading-snug">{{ step.title }}</h3>
          <p v-if="step.text" class="iv-body m-0 text-[0.9375rem]">{{ step.text }}</p>
        </div>
      </li>
    </ol>

    <InvitationOrnamen data-iv-ornament slot-id="divider" posisi="utama" class="mx-auto mt-6 h-7 w-48 opacity-65" />
  </div>
</template>

<style>
/*
 * `sticky` butuh leluhur yang menggulung dan TIDAK boleh punya `overflow: hidden` di antaranya.
 * `.iv-section` memasang `overflow: hidden` untuk ladang ornamennya, jadi kartu di sini menempel
 * pada section-nya sendiri — yang justru yang diinginkan: tumpukan berhenti begitu ceritanya
 * lewat, bukan mengikuti tamu sampai ke bagian hadiah.
 */
.iv-story-kartu {
  position: sticky;
  top: 12vh;
  overflow: hidden;
  border-radius: 1.25rem 1.25rem 0.9rem 0.9rem;
  background: color-mix(in srgb, var(--iv-orn-dark-body, #fffdf7) 10%, transparent);
  box-shadow: 0 14px 40px rgb(0 0 0 / 0.28);
  backdrop-filter: blur(2px);
  /* Ditulis di sini supaya keadaan diamnya benar sebelum GSAP tiba — dan tanpa JS sama sekali. */
  transform-origin: 50% 0%;
}
.iv-story-kartu-foto {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
@container (min-width: 40rem) {
  .iv-story-kartu-foto { aspect-ratio: 21 / 9; }
}
</style>
