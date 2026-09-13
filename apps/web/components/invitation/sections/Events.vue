<script setup lang="ts">
import { CalendarPlus, Church, MapPin, PartyPopper } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'
import { toVenueIllustration } from '~/utils/invitation-options'

const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, coupleNames } = useInvitation()

const events = computed(() => rows(props.section, 'events'))
const venue = computed(() => toVenueIllustration(props.section.data.venueIllustration))

/**
 * Akad dan resepsi punya watak berbeda, dan tamu membacanya berbeda. Ikonnya diturunkan
 * dari nama acara, bukan dari urutannya — pasangan bebas menamai dan menambah acara.
 */
function icon(name: string) {
  return /akad|pemberkatan|nikah|misa/i.test(name) ? Church : PartyPopper
}

/** Google Calendar opens reliably on both Android and iOS, unlike a downloaded .ics. */
function calendarUrl(event: Record<string, unknown>) {
  const start = Date.parse(String(event.date ?? ''))
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${String(event.name ?? 'Acara')} — ${coupleNames.value}`,
    location: String(event.venue ?? ''),
  })
  if (Number.isFinite(start)) {
    const stamp = (value: number) => new Date(value).toISOString().replace(/[-:]|\.\d{3}/g, '')
    params.set('dates', `${stamp(start)}/${stamp(start + 3 * 3600_000)}`)
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
</script>

<template>
  <InvitationSection
    id="iv-events"
    tone="tint"
    :compact="compact"
    kicker="Rangkaian acara"
    title="Akad & Resepsi"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
  >
    <!-- Ilustrasi gedung berdiri di atas kartu, jadi tamu tahu bentuk tempatnya sebelum membaca alamat. -->
    <OrnamentGlyph
      v-if="venue"
      :glyph="venue"
      data-iv-ornament
      data-iv-lead
      class="h-28 w-42 opacity-85"
      :style="{ color: 'var(--iv-primary)' }"
    />

    <ul class="m-0 grid w-full gap-4 p-0 list-none">
      <li
        v-for="event in events"
        :key="String(event.id)"
        data-iv-reveal
        class="iv-card relative grid gap-3 rounded-md px-6 py-8"
      >
        <OrnamentGlyph :glyph="orn.corner" data-iv-ornament class="iv-event-corner iv-event-corner--tl" aria-hidden="true" />
        <OrnamentGlyph :glyph="orn.corner" data-iv-ornament class="iv-event-corner iv-event-corner--br" aria-hidden="true" />

        <p class="iv-display m-0 flex items-center justify-center gap-2.5 text-[1.65rem]">
          <component :is="icon(String(event.name ?? ''))" :size="22" aria-hidden="true" class="shrink-0 opacity-70" />
          {{ String(event.name ?? '') }}
        </p>
        <p class="iv-body m-0 text-[0.9375rem]">
          {{ String(event.date ?? '') }}<template v-if="event.time"> · {{ String(event.time) }}</template>
        </p>
        <p v-if="event.venue" class="iv-body m-0 text-[0.9375rem] font-semibold">{{ String(event.venue) }}</p>
        <p v-if="event.address" class="iv-body m-0 text-caption">{{ String(event.address) }}</p>

        <div class="mt-2 flex flex-wrap justify-center gap-2">
          <a
            v-if="event.mapUrl"
            :href="String(event.mapUrl)"
            target="_blank"
            rel="noreferrer"
            class="iv-chip"
          >
            <MapPin :size="15" aria-hidden="true" /> Buka peta
          </a>
          <a :href="calendarUrl(event)" target="_blank" rel="noreferrer" class="iv-chip">
            <CalendarPlus :size="15" aria-hidden="true" /> Simpan ke kalender
          </a>
        </div>
      </li>
    </ul>
  </InvitationSection>
</template>

<style>
/*
 * Sudut kartu acara. Dulu `h-10 w-10` dari viewBox 170 pada opacity 0,35 — stroke efektif
 * 0,31px, praktis hantu, dan itulah keluhan "garis tipis" dalam bentuk paling murni.
 * Sekarang ornamennya bermassa dan kepingnya dibesarkan ke 3,25rem pada opacity penuh.
 */
.iv-event-corner {
  position: absolute;
  width: 3.25rem;
  height: auto;
  aspect-ratio: 1;
  color: var(--iv-primary);
  opacity: 0.7;
  pointer-events: none;
}
.iv-event-corner--tl { top: 0.5rem; left: 0.5rem; }
.iv-event-corner--br { bottom: 0.5rem; right: 0.5rem; transform: rotate(180deg); }
</style>
