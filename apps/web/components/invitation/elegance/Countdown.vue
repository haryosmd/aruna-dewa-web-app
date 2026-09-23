<script setup lang="ts">
import { CalendarPlus } from 'lucide-vue-next'
import type { Section } from '~/types/aruna'

/**
 * Hitung mundur Elegance (fase 72): latar foto (`backgroundImageUrl`) bertabir gelap, label,
 * judul, empat kotak angka, dan tombol "Simpan Tanggal" — ke `calendarUrl` bila pasangan
 * mengisinya, atau ke Google Calendar yang dibangun dari `targetDate`.
 */
const props = defineProps<{ section: Section; seed: number }>()
const { orn, intensity, compact, coupleNames } = useInvitation()

const targetDate = computed(() => text(props.section, 'targetDate'))
const labels = computed(() => ({
  days: text(props.section, 'daysLabel'), hours: text(props.section, 'hoursLabel'),
  minutes: text(props.section, 'minutesLabel'), seconds: text(props.section, 'secondsLabel'),
}))

/**
 * Foto latar bagian ini punya kolomnya sendiri (`backgroundImageUrl`, seperti referensi) dan
 * menang atas `background.imageUrl`; tabirnya lebih pekat dari bawaan karena angka besar di atas
 * foto butuh bidang yang benar-benar tenang.
 */
const latar = computed(() => {
  const dasar = latarBagian(props.section) ?? {}
  const foto = text(props.section, 'backgroundImageUrl') || dasar.imageUrl
  return foto ? { ...dasar, imageUrl: foto, overlay: dasar.overlay ?? 0.6, color: dasar.color ?? '#17110d' } : dasar
})

/** Google Calendar terbuka andal di Android maupun iOS, tidak seperti berkas .ics yang diunduh. */
const calendarHref = computed(() => {
  const milik = text(props.section, 'calendarUrl')
  if (milik) return milik
  const start = Date.parse(targetDate.value)
  const params = new URLSearchParams({ action: 'TEMPLATE', text: `Pernikahan ${coupleNames.value}` })
  if (Number.isFinite(start)) {
    const stamp = (value: number) => new Date(value).toISOString().replace(/[-:]|\.\d{3}/g, '')
    params.set('dates', `${stamp(start)}/${stamp(start + 3 * 3600_000)}`)
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`
})
</script>

<template>
  <InvitationSection
    :id="sectionDomId('countdown')"
    tone="ink"
    :compact="compact"
    :ornaments="compact ? null : orn"
    :intensity="intensity"
    :seed="props.seed"
    :background="latar"
    :motion="gerakBagian(props.section)"
  >
    <InvitationText :section="props.section" field="subtitle" tag="p" data-iv-lead class="iv-kicker m-0" />
    <InvitationText :section="props.section" field="title" tag="h2" data-iv-lead class="iv-display m-0 text-[clamp(2.1rem,7cqw,3.4rem)]" />
    <InvitationOrnamen data-iv-ornament slot-id="divider" posisi="utama" class="h-7 w-48 opacity-80" />

    <InvitationCountdown :date="targetDate" :labels="labels" />

    <a v-if="text(props.section, 'buttonLabel')" data-iv-reveal :href="calendarHref" target="_blank" rel="noreferrer" class="iv-chip">
      <CalendarPlus :size="15" aria-hidden="true" />
      <InvitationText :section="props.section" field="buttonLabel" tag="span" />
    </a>
  </InvitationSection>
</template>
