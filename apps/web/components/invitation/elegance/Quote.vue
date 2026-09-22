<script setup lang="ts">
import type { Section } from '~/types/aruna'

/**
 * Kutipan Elegance (fase 72): ayat atau kalimat pilihan di atas foto bertabir (bila ada foto)
 * atau bidang tint tema. Tone-nya ikut ada-tidaknya foto: teks terang di atas foto gelap,
 * tinta tema di atas tint.
 */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact } = useInvitation()

const photo = computed(() => text(props.section, 'imageUrl'))
const latar = computed(() => {
  const dasar = latarBagian(props.section) ?? {}
  return photo.value ? { ...dasar, imageUrl: photo.value, overlay: dasar.overlay ?? 0.62, color: dasar.color ?? '#17110d' } : dasar
})
</script>

<template>
  <InvitationSection
    :id="sectionDomId('quote')"
    :tone="photo ? 'ink' : 'tint'"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latar"
    :motion="gerakBagian(props.section)"
  >
    <OrnamentGlyph :glyph="orn.divider" data-iv-ornament data-iv-slot="divider" data-iv-lead class="h-7 w-48 opacity-80" :style="photo ? undefined : { color: 'var(--iv-primary)' }" />
    <InvitationText :section="props.section" field="title" tag="blockquote" data-iv-lead class="iv-display m-0 max-w-[34rem] text-[clamp(1.25rem,4.6cqw,1.7rem)] font-normal italic leading-relaxed" multiline />
    <InvitationText :section="props.section" field="subtitle" tag="p" data-iv-reveal class="iv-kicker m-0" />
  </InvitationSection>
</template>
