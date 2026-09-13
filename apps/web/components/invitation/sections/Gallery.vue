<script setup lang="ts">
import type { Section } from '~/types/aruna'
import { toGalleryMotion } from '~/utils/invitation-options'
import type { GalleryLayout } from '~/utils/theme'

const props = defineProps<{ section: Section; seed: number }>()
const invitation = useInvitation()
const { orn, intensity, compact } = invitation

const images = computed(() => list(props.section, 'images'))
const themeLayout = computed(() => themeOf(invitation.document.value.templateId).gallery)

/** `tema` berarti watak tema yang memilih — itulah perilaku sebelum field ini ada. */
const motion = computed(() => toGalleryMotion(props.section.data.motion))
const layout = computed<GalleryLayout | 'spotlight'>(() => {
  switch (motion.value) {
    case 'kolase': return 'masonry'
    case 'rel': return 'rail'
    case 'satu-per-satu': return 'spotlight'
    default: return themeLayout.value
  }
})
</script>

<template>
  <InvitationSection
    v-if="images.length"
    id="iv-gallery"
    tone="paper"
    :compact="compact"
    kicker="Potret bahagia"
    title="Momen yang kami simpan"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
  >
    <InvitationGallery :images="images" :layout="layout" :compact="compact" />
    <OrnamentGlyph :glyph="orn.divider" data-iv-ornament class="h-7 w-48 opacity-70" :style="{ color: 'var(--iv-primary)' }" />
  </InvitationSection>
</template>
