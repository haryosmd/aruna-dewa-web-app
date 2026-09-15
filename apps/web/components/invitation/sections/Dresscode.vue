<script setup lang="ts">
import type { Section } from '~/types/aruna'
import { toAttire, toDresscodeColors } from '~/utils/invitation-options'

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact } = useInvitation()

const attire = computed(() => toAttire(props.section.data.attire))
const colors = computed(() => toDresscodeColors(props.section.data.colors))
const note = computed(() => text(props.section, 'text'))
</script>

<template>
  <InvitationSection
    id="iv-dresscode"
    tone="tint"
    :compact="compact"
    kicker="Dresscode"
    title="Yang kami harapkan dikenakan"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
  >
    <!-- Busana berjejer dulu: tamu memutuskan pakai apa jauh sebelum membaca nama warnanya. -->
    <ul v-if="attire.length" class="iv-attire-row m-0 p-0 list-none">
      <li v-for="id in attire" :key="id" data-iv-reveal class="iv-attire-item">
        <OrnamentGlyph :glyph="id" data-iv-ornament class="iv-attire-art" />
        <span class="iv-body text-caption">{{ ornament(id).name }}</span>
      </li>
    </ul>
    <OrnamentGlyph
      v-else
      :glyph="orn.floralAlt"
      data-iv-ornament
      class="h-24 w-20 opacity-80"
      :style="{ color: 'var(--iv-primary)' }"
    />

    <!--
      Bundaran warna selalu membawa namanya tertulis. Warna saja bukan penanda yang bisa
      diakses: tamu dengan buta warna, atau yang membaca lewat pembaca layar, tidak
      mendapat apa-apa dari lingkaran tanpa label.
    -->
    <ul v-if="colors.length" class="iv-swatch-row m-0 p-0 list-none">
      <li v-for="color in colors" :key="color.hex" data-iv-reveal class="iv-swatch">
        <span class="iv-swatch-dot" :style="{ background: color.hex }" aria-hidden="true" />
        <span class="iv-body text-caption">{{ color.name }}</span>
      </li>
    </ul>

    <p v-if="note" data-iv-reveal class="iv-body m-0 max-w-md">{{ note }}</p>
    <p v-else-if="!attire.length && !colors.length" data-iv-reveal class="iv-display m-0 text-[clamp(1.6rem,6cqw,2.4rem)]">
      Kenakan yang membuat Anda nyaman.
    </p>
  </InvitationSection>
</template>

<style>
.iv-attire-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.25rem 1.75rem;
}
.iv-attire-item {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  width: 4.5rem;
}
.iv-attire-art {
  width: 100%;
  height: auto;
  aspect-ratio: 120 / 180;
  color: var(--iv-primary);
  opacity: 0.85;
}

.iv-swatch-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem 1.5rem;
}
.iv-swatch {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  width: 5rem;
}
.iv-swatch-dot {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  /* Cincin tipis supaya warna sepucat krem pun tetap punya tepi di atas latar tint. */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 30%, transparent), var(--iv-shadow-card);
}
</style>
