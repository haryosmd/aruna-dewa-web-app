<script setup lang="ts">
import type { Section } from '~/types/aruna'

/** Galeri Elegance (fase 72): grid dua kolom bernomor 01–04, caption script, dan lightbox `InvitationGallery`. */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, mode } = useInvitation()
const images = computed(() => list(props.section, 'imageUrls'))
/**
 * Galeri tanpa foto: di panggung ia tetap berdiri, di halaman tamu ia tetap hilang.
 *
 * `gallery` menyala di tiap undangan baru dengan `imageUrls: []`, jadi sebelum fase 78 rail
 * editor menampilkan satu bagian ber-status "Tampil" yang tidak menghasilkan apa pun di layar.
 */
const panggung = computed(() => mode.value === 'stage')
const tampil = computed(() => images.value.length > 0 || panggung.value)
</script>

<template>
  <InvitationSection
    v-if="tampil"
    :id="sectionDomId('gallery')"
    tone="paper"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="eyebrow" tag="p" data-iv-lead class="iv-kicker m-0" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" />

    <InvitationSlotKosong
      v-if="!images.length"
      label="Galeri menunggu foto"
      hint="Tambahkan foto di tab Bagian › Galeri. Tamu tidak melihat kotak ini."
      tinggi="12rem"
    />
    <InvitationGallery
      v-else
      :images="images"
      layout="grid"
      :compact="compact"
      :view-label="text(props.section, 'viewLabel')"
      :lightbox-title="text(props.section, 'lightboxTitle')"
    />

    <InvitationText :section="props.section" field="subtitle" tag="p" data-iv-reveal class="iv-display iv-script m-0 text-[clamp(1.5rem,6cqw,2.2rem)]" />
    <InvitationOrnamen data-iv-ornament slot-id="divider" posisi="utama" class="h-7 w-48 opacity-70" :style="{ color: 'var(--iv-primary)' }" />
  </InvitationSection>
</template>
