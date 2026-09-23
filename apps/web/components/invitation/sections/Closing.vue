<script setup lang="ts">
import type { Section } from '~/types/aruna'

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, coupleNames, initials } = useInvitation()
</script>

<template>
  <InvitationSection
    id="iv-closing"
    tone="base"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
  >
    <InvitationOrnamen
      data-iv-ornament
      slot-id="monogram" posisi="utama"
      data-iv-lead
      class="h-32 w-32 opacity-90"
      :initials="initials"
      :style="{ color: 'var(--iv-primary)' }"
    />
    <p data-iv-reveal class="iv-body m-0">
      {{ text(props.section, 'text', 'Merupakan kebahagiaan bagi kami atas kehadiran dan doa Anda.') }}
    </p>
    <p data-iv-reveal class="iv-display iv-script m-0 text-[clamp(2rem,8cqw,3.2rem)]">{{ coupleNames }}</p>
    <InvitationOrnamen data-iv-ornament slot-id="garland" posisi="utama" class="h-14 w-64 opacity-75" :style="{ color: 'var(--iv-primary)' }" />
  </InvitationSection>
</template>
