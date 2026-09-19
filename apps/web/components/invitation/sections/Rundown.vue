<script setup lang="ts">
import { Clock3 } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, t } = useInvitation()
const items = computed(() => rows(props.section, 'items'))
</script>

<template>
  <InvitationSection
    v-if="items.length"
    id="iv-rundown"
    tone="base"
    :compact="compact"
    :kicker="t('rundown.kicker')"
    :title="t('rundown.title')"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
  >
    <ol class="iv-timeline m-0 w-full p-0 list-none text-left">
      <!-- Rel digambar di posisi akhirnya; GSAP hanya menumbuhkannya dari nol. -->
      <span class="iv-timeline-rail" data-iv-rail aria-hidden="true" />
      <li
        v-for="(item, at) in items"
        :key="String(item.id ?? at)"
        data-iv-reveal
        class="iv-timeline-row"
      >
        <span class="iv-timeline-time iv-display">
          <Clock3 :size="13" aria-hidden="true" class="opacity-60" />
          {{ String(item.time ?? '') }}
        </span>
        <span class="iv-timeline-mark" aria-hidden="true">
          <OrnamentGlyph :glyph="orn.symbol" class="h-full w-full" />
        </span>
        <span class="grid gap-1">
          <span class="iv-body text-[0.9375rem] font-semibold">{{ String(item.title ?? item.name ?? '') }}</span>
          <span v-if="item.description" class="iv-body text-caption opacity-75">{{ String(item.description) }}</span>
        </span>
      </li>
    </ol>
    <OrnamentGlyph :glyph="orn.divider" data-iv-ornament class="h-7 w-48 opacity-65" :style="{ color: 'var(--iv-primary)' }" />
  </InvitationSection>
</template>
