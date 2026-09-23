<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'

/** Unduh mantu Elegance (fase 72): acara tambahan pihak pria — keterangan, nama, tanggal, alamat, tombol Maps. */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact } = useInvitation()
const mapUrl = computed(() => text(props.section, 'mapUrl'))
</script>

<template>
  <InvitationSection
    :id="sectionDomId('unduh-mantu')"
    tone="tint"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="kicker" tag="p" data-iv-lead class="iv-kicker m-0" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" />
    <InvitationOrnamen data-iv-ornament slot-id="symbol" posisi="utama" class="h-12 w-14 opacity-80" :style="{ color: 'var(--iv-primary)' }" />

    <div data-iv-reveal class="iv-card grid w-full max-w-[26rem] justify-items-center gap-3 rounded-md px-6 py-7">
      <InvitationText :section="props.section" field="subtitle" tag="p" class="iv-display m-0 text-[1.25rem]" />
      <InvitationText :section="props.section" field="address" tag="p" class="iv-body m-0 text-[0.9375rem]" multiline />
      <a v-if="mapUrl" :href="mapUrl" target="_blank" rel="noreferrer" class="iv-chip mt-1">
        <MapPin :size="15" aria-hidden="true" />
        <InvitationText :section="props.section" field="buttonLabel" tag="span" fallback="Buka Google Maps" />
      </a>
    </div>
  </InvitationSection>
</template>
