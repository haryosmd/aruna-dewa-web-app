<script setup lang="ts">
import type { Section } from '~/types/aruna'

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, coupleNames, galleryImages, t } = useInvitation()

const photo = computed(() => text(props.section, 'image') || galleryImages.value[0] || '')

/**
 * Foto pasangan tidak lagi masuk dengan satu reveal seragam. Arah, skala, dan asal mask
 * diambil dari indeks section — deterministik, jadi render server dan klien sepakat, tapi
 * cukup berbeda untuk membuat tiap undangan terbaca punya ritmenya sendiri.
 */
const entrance = computed(() => ['rise', 'sweep-left', 'sweep-right', 'iris'][Math.abs(props.seed) % 4])
</script>

<template>
  <InvitationSection
    id="iv-couple"
    tone="paper"
    :compact="compact"
    :kicker="t('couple.kicker')"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
  >
    <InvitationOrnamen data-iv-ornament slot-id="floral" posisi="utama" class="h-24 w-20 opacity-80" :style="{ color: 'var(--iv-primary)' }" />

    <!--
      Ornamen menempel pada fotonya, bukan berdiri sendiri: gerakannya dijalankan dalam
      rentang scroll yang sama dengan fade foto, jadi dua gerakan itu menyatu alih-alih
      bertabrakan.
    -->
    <div v-if="photo" data-iv-reveal class="iv-portrait" :data-entrance="entrance">
      <img :src="photo" :alt="`Potret ${coupleNames}`" data-iv-photo loading="lazy" class="h-full w-full object-cover">
      <InvitationOrnamen data-iv-ornament slot-id="corner" posisi="tl" class="iv-portrait-corner iv-portrait-corner--tl" aria-hidden="true" />
      <InvitationOrnamen data-iv-ornament slot-id="corner" posisi="br" class="iv-portrait-corner iv-portrait-corner--br" aria-hidden="true" />
    </div>

    <h2 data-iv-reveal class="iv-display iv-script m-0" :class="'text-[clamp(2.4rem,9cqw,4rem)]'">
      {{ coupleNames }}
    </h2>
    <p data-iv-reveal class="iv-body m-0">
      {{ text(props.section, 'description', 'Untuk hadir dan menjadi bagian dari hari bahagia kami.') }}
    </p>
    <InvitationOrnamen data-iv-ornament slot-id="divider" posisi="utama" class="h-7 w-52 opacity-75" :style="{ color: 'var(--iv-primary)' }" />
  </InvitationSection>
</template>
