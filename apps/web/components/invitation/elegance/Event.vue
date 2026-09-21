<script setup lang="ts">
import { HeartHandshake, PartyPopper } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'

/**
 * Rangkaian acara Elegance (fase 72): kartu tanggal besar bertone primary (hari | tanggal |
 * bulan tahun), lalu dua kartu arch — akad dan resepsi — dengan ikon, waktu, dan catatan.
 * Tempatnya ada di bagian `map`, bukan di sini, persis pembagian referensi.
 */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact } = useInvitation()

const acara = computed(() => [
  { key: 'akad', title: 'akadTitle', time: 'akadTime', note: 'akadNote', icon: HeartHandshake },
  { key: 'reception', title: 'receptionTitle', time: 'receptionTime', note: 'receptionNote', icon: PartyPopper },
].filter(item => text(props.section, item.title) || text(props.section, item.time)))
</script>

<template>
  <InvitationSection
    :id="sectionDomId('event')"
    tone="tint"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latarBagian(props.section)"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="eyebrow" tag="p" data-iv-lead class="iv-kicker m-0" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" />
    <InvitationText :section="props.section" field="subtitle" tag="p" data-iv-reveal class="iv-body m-0 max-w-[30rem]" />

    <!-- Kartu tanggal: tiga sel yang dipisah garis tipis, di atas bidang primary. -->
    <div data-iv-reveal class="iv-event-date">
      <InvitationText :section="props.section" field="day" tag="span" class="iv-kicker m-0 text-[0.75rem]" />
      <InvitationText :section="props.section" field="date" tag="span" class="iv-display iv-event-date-num" />
      <InvitationText :section="props.section" field="monthYear" tag="span" class="iv-kicker m-0 text-[0.75rem]" />
    </div>

    <OrnamentGlyph :glyph="orn.divider" data-iv-ornament class="h-7 w-48 opacity-75" :style="{ color: 'var(--iv-primary)' }" />

    <ul class="iv-event-list m-0 grid w-full gap-4 p-0 list-none">
      <li v-for="item in acara" :key="item.key" data-iv-reveal class="iv-card iv-event-arch relative grid gap-2 px-6 pb-7 pt-8">
        <OrnamentGlyph :glyph="orn.corner" data-iv-ornament class="iv-event-corner iv-event-corner--tl" aria-hidden="true" />
        <OrnamentGlyph :glyph="orn.corner" data-iv-ornament class="iv-event-corner iv-event-corner--br" aria-hidden="true" />
        <span class="iv-event-badge justify-self-center" aria-hidden="true">
          <component :is="item.icon" :size="26" />
        </span>
        <InvitationText :section="props.section" :field="item.title" tag="p" class="iv-display m-0 text-[1.55rem]" />
        <InvitationText :section="props.section" :field="item.time" tag="p" class="iv-body m-0 text-[0.9375rem] font-semibold" />
        <InvitationText :section="props.section" :field="item.note" tag="p" class="iv-body m-0 text-caption" />
      </li>
    </ul>
  </InvitationSection>
</template>

<style>
/*
 * Kartu tanggal bertone primary. Tinta mengikuti `--iv-on-primary` (lihat `onPrimary()`), dan
 * ramp ornamennya tidak dipakai di sini — hanya teks, jadi tidak perlu `data-tone`.
 */
.iv-event-date {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  width: min(100%, 22rem);
  padding: 1.1rem 1.25rem;
  border-radius: 0.75rem;
  background: var(--iv-primary);
  color: var(--iv-on-primary, #fffdf7);
  box-shadow: var(--iv-shadow-lift);
}
.iv-event-date > :first-child { text-align: right; }
.iv-event-date > :last-child { text-align: left; }
.iv-event-date .iv-kicker { opacity: 1; }
.iv-event-date-num {
  font-size: clamp(2.8rem, 12cqw, 4rem);
  line-height: 1;
  padding-inline: 0.85rem;
  border-inline: 1px solid color-mix(in srgb, currentColor 45%, transparent);
}

/* Dua kartu arch berdampingan bila wadahnya cukup lebar. */
@container (min-width: 30rem) {
  .iv-event-list:has(> li + li) { grid-template-columns: 1fr 1fr; }
}
.iv-event-arch { border-radius: 999px 999px 0.75rem 0.75rem; }
</style>
