<script setup lang="ts">
import type { Section } from '~/types/aruna'

/** Galeri Elegance (fase 72): grid dua kolom bernomor 01–04, caption script, dan lightbox `InvitationGallery`. */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact } = useInvitation()
const images = computed(() => list(props.section, 'imageUrls'))
</script>

<template>
  <InvitationSection
    v-if="images.length"
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

    <InvitationGallery
      :images="images"
      layout="grid"
      :compact="compact"
      :view-label="text(props.section, 'viewLabel')"
      :lightbox-title="text(props.section, 'lightboxTitle')"
    />

    <InvitationText :section="props.section" field="subtitle" tag="p" data-iv-reveal class="iv-display iv-script m-0 text-[clamp(1.5rem,6cqw,2.2rem)]" />
    <OrnamentGlyph :glyph="orn.divider" data-iv-ornament class="h-7 w-48 opacity-70" :style="{ color: 'var(--iv-primary)' }" />
  </InvitationSection>
</template>
