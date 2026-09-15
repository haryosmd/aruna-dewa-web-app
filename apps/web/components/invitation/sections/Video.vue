<script setup lang="ts">
import { ExternalLink, PlayCircle } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, pauseMusic } = useInvitation()
const url = computed(() => text(props.section, 'url'))
</script>

<template>
  <InvitationSection
    v-if="url"
    id="iv-video"
    tone="ink"
    :compact="compact"
    kicker="Saksikan bersama"
    :title="text(props.section, 'title', 'Live streaming')"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
  >
    <OrnamentGlyph :glyph="orn.symbol" data-iv-ornament class="h-16 w-20 opacity-75" />
    <!--
      Musik dijeda di dalam klik, sebelum tab siaran terbuka. Tab undangan yang tersembunyi
      tetap berbunyi kalau tidak diminta berhenti — dan yang ditimpanya adalah ijab kabul.
    -->
    <a :href="url" target="_blank" rel="noreferrer" class="iv-chip" @click="pauseMusic">
      <PlayCircle :size="16" aria-hidden="true" /> Buka siaran
      <ExternalLink :size="13" aria-hidden="true" />
    </a>
  </InvitationSection>
</template>
