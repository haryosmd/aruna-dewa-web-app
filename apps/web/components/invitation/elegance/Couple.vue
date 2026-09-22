<script setup lang="ts">
import type { Section } from '~/types/aruna'

/**
 * Mempelai Elegance (fase 72): bismillah, salam, kalimat pengantar, satu potret arch, lalu
 * mempelai wanita dan pria berurutan — label, nama script, urutan anak, orang tua.
 */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, coupleNames } = useInvitation()

const photo = computed(() => text(props.section, 'imageUrl'))
const entrance = computed(() => ['rise', 'sweep-left', 'sweep-right', 'iris'][Math.abs(props.seed) % 4])
</script>

<template>
  <InvitationSection
    :id="sectionDomId('couple')"
    tone="paper"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="bismillah" tag="p" data-iv-lead class="iv-display m-0 text-[1.5rem] leading-relaxed" dir="auto" />
    <InvitationText :section="props.section" field="greeting" tag="p" data-iv-lead class="iv-display m-0 text-[1.05rem]" />
    <InvitationText :section="props.section" field="subtitle" tag="p" data-iv-reveal class="iv-body m-0 max-w-[32rem]" multiline />

    <OrnamentGlyph :glyph="orn.floral" data-iv-ornament data-iv-slot="floral" class="h-24 w-20 opacity-80" :style="{ color: 'var(--iv-primary)' }" />

    <div v-if="photo" data-iv-reveal class="iv-portrait" :data-entrance="entrance">
      <img :src="photo" :alt="`Potret ${coupleNames}`" data-iv-photo loading="lazy" class="h-full w-full object-cover">
      <OrnamentGlyph :glyph="orn.corner" data-iv-ornament data-iv-slot="corner" class="iv-portrait-corner iv-portrait-corner--tl" aria-hidden="true" />
      <OrnamentGlyph :glyph="orn.corner" data-iv-ornament data-iv-slot="corner" class="iv-portrait-corner iv-portrait-corner--br" aria-hidden="true" />
    </div>

    <div data-iv-reveal class="grid justify-items-center gap-1.5">
      <InvitationText :section="props.section" field="brideLabel" tag="p" class="iv-kicker m-0" />
      <InvitationText :section="props.section" field="brideName" tag="h2" class="iv-display iv-script m-0 text-[clamp(2.2rem,9cqw,3.6rem)]" />
      <InvitationText :section="props.section" field="brideOrder" tag="p" class="iv-body m-0 text-[0.9375rem]" />
      <InvitationText :section="props.section" field="brideParents" tag="p" class="iv-body m-0 text-[0.9375rem] font-semibold" multiline />
    </div>

    <OrnamentGlyph :glyph="orn.divider" data-iv-ornament data-iv-slot="divider" class="h-7 w-52 opacity-75" :style="{ color: 'var(--iv-primary)' }" />

    <div data-iv-reveal class="grid justify-items-center gap-1.5">
      <InvitationText :section="props.section" field="groomLabel" tag="p" class="iv-kicker m-0" />
      <InvitationText :section="props.section" field="groomName" tag="h2" class="iv-display iv-script m-0 text-[clamp(2.2rem,9cqw,3.6rem)]" />
      <InvitationText :section="props.section" field="groomOrder" tag="p" class="iv-body m-0 text-[0.9375rem]" />
      <InvitationText :section="props.section" field="groomParents" tag="p" class="iv-body m-0 text-[0.9375rem] font-semibold" multiline />
    </div>
  </InvitationSection>
</template>
