<script setup lang="ts">
import type { Section } from '~/types/aruna'
import type { StoryStep } from '~/utils/invitation-options'

/**
 * Satu foto, satu paragraf.
 *
 * Wajah paling lama bagian ini, dan sampai fase 79 ia tidak pernah bisa dipilih: ia cabang
 * `v-if="!steps.length"` yang muncul hanya karena pasangan belum menulis langkah. Sekarang ia
 * pilihan sadar — dan tetap jadi tempat jatuh untuk varian berlangkah yang belum punya langkah,
 * karena bidang kosong bukan jawaban yang lebih baik.
 */
const props = defineProps<{ section: Section; steps: StoryStep[] }>()
const { galleryImages } = useInvitation()

/** Foto sendiri kalau ada; kalau tidak, foto kedua galeri — bukan yang pertama, yang biasanya cover. */
const foto = computed(() => text(props.section, 'image') || galleryImages.value[1] || '')
</script>

<template>
  <div v-if="foto" data-iv-reveal class="iv-portrait iv-portrait--wide">
    <img :src="foto" alt="" data-iv-photo loading="lazy" class="h-full w-full object-cover">
  </div>
  <InvitationText :section="props.section" field="text" tag="p" data-iv-reveal class="iv-body m-0" multiline />
  <InvitationOrnamen data-iv-ornament slot-id="floralAlt" posisi="utama" class="h-20 w-16 opacity-70" />
</template>
