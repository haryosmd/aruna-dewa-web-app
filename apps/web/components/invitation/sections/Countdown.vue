<script setup lang="ts">
import type { Section } from '~/types/aruna'

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, t } = useInvitation()
</script>

<template>
  <InvitationSection
    id="iv-countdown"
    tone="base"
    :compact="compact"
    :kicker="t('countdown.kicker')"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
  >
    <OrnamentGlyph :glyph="orn.divider" data-iv-ornament data-iv-slot="divider" class="h-7 w-48 opacity-70" :style="{ color: 'var(--iv-primary)' }" />
    <InvitationCountdown :date="text(props.section, 'date')" :arrived="t('countdown.arrived')" :tba="t('countdown.tba')" />
  </InvitationSection>
</template>
