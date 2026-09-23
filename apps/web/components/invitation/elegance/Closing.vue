<script setup lang="ts">
import type { Section } from '~/types/aruna'

/** Penutup Elegance (fase 72): foto, judul, paragraf terima kasih, nama script, salam penutup, tanggal. */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, coupleNames, initials, mode } = useInvitation()
const photo = computed(() => text(props.section, 'imageUrl'))
</script>

<template>
  <InvitationSection
    :id="sectionDomId('closing')"
    tone="base"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationSlotKosong v-if="!photo && mode === 'stage'" label="Foto penutup" hint="Unggah di tab Bagian › Penutup." />
    <div v-if="photo" data-iv-reveal class="iv-portrait iv-portrait--wide">
      <img :src="photo" :alt="`Foto ${coupleNames}`" data-iv-photo loading="lazy" class="h-full w-full object-cover">
    </div>
    <InvitationOrnamen data-iv-ornament slot-id="garland" posisi="utama" data-iv-lead class="h-14 w-64 opacity-75" :style="{ color: 'var(--iv-primary)' }" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" />
    <InvitationText :section="props.section" field="copy" tag="p" data-iv-reveal class="iv-body m-0 max-w-[30rem]" multiline />
    <InvitationText :section="props.section" field="subtitle" tag="p" data-iv-reveal :fallback="coupleNames" class="iv-display iv-script m-0 text-[clamp(2rem,8cqw,3.2rem)]" />
    <InvitationText :section="props.section" field="greeting" tag="p" data-iv-reveal class="iv-body m-0 text-[0.9375rem]" />
    <InvitationText :section="props.section" field="date" tag="p" data-iv-reveal class="iv-kicker m-0" />
    <InvitationOrnamen data-iv-ornament slot-id="monogram" posisi="utama" class="h-24 w-24 opacity-90" :initials="initials" :style="{ color: 'var(--iv-primary)' }" />
  </InvitationSection>
</template>
