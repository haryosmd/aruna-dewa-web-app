<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'

/** Lokasi Elegance (fase 72): kartu alamat dan satu tombol ke Google Maps. */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact } = useInvitation()
const mapUrl = computed(() => text(props.section, 'mapUrl'))
</script>

<template>
  <InvitationSection
    :id="sectionDomId('map')"
    tone="paper"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <OrnamentGlyph :glyph="orn.symbol" data-iv-ornament data-iv-lead class="h-14 w-16 opacity-80" :style="{ color: 'var(--iv-primary)' }" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(1.9rem,6.5cqw,3rem)]" />

    <div data-iv-reveal class="iv-card grid w-full max-w-[26rem] justify-items-center gap-4 rounded-md px-6 py-7">
      <span class="iv-event-badge" aria-hidden="true"><MapPin :size="24" /></span>
      <InvitationText :section="props.section" field="subtitle" tag="p" class="iv-body m-0" multiline />
      <a v-if="mapUrl" :href="mapUrl" target="_blank" rel="noreferrer" class="iv-submit">
        <MapPin :size="16" aria-hidden="true" />
        <InvitationText :section="props.section" field="buttonLabel" tag="span" fallback="Buka Google Maps" />
      </a>
    </div>
  </InvitationSection>
</template>
