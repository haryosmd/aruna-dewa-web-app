<script setup lang="ts">
import { CalendarDays, Gift, Home, Images, MailCheck } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  available: string[]
  /** Struktur dokumen (fase 72): v2 menunjuk id bagian Elegance dan "Ucapan" menggantikan "RSVP". */
  version?: 1 | 2
  /**
   * Panggung editor (fase 72): dock menempel di dasar wadah gulir `.iv-root`, bukan di
   * viewport — `sticky bottom` pada anak terakhir root, jadi ia tetap tampak selagi pratinjau
   * digulung dan tidak bocor keluar bingkai ponsel.
   */
  contained?: boolean
}>(), { version: 1, contained: false })

const v1 = [
  { id: 'iv-cover', label: 'Awal', icon: Home, needs: 'cover' },
  { id: 'iv-events', label: 'Acara', icon: CalendarDays, needs: 'events' },
  { id: 'iv-gallery', label: 'Galeri', icon: Images, needs: 'gallery' },
  { id: 'iv-gift', label: 'Hadiah', icon: Gift, needs: 'gift' },
  { id: 'iv-rsvp', label: 'RSVP', icon: MailCheck, needs: 'rsvp' },
]
const v2 = [
  { id: 'iv-hero', label: 'Awal', icon: Home, needs: 'hero' },
  { id: 'iv-event', label: 'Acara', icon: CalendarDays, needs: 'event' },
  { id: 'iv-gallery', label: 'Galeri', icon: Images, needs: 'gallery' },
  { id: 'iv-gift', label: 'Hadiah', icon: Gift, needs: 'gift' },
  { id: 'iv-wishes', label: 'Ucapan', icon: MailCheck, needs: 'wishes' },
]

const items = computed(() => (props.version === 2 ? v2 : v1).filter(item => props.available.includes(item.needs)))
const active = ref(props.version === 2 ? 'iv-hero' : 'iv-cover')

onMounted(() => {
  const observer = new IntersectionObserver(
    entries => entries.forEach((entry) => { if (entry.isIntersecting) active.value = entry.target.id }),
    { rootMargin: '-45% 0px -45% 0px' },
  )
  items.value.forEach((item) => {
    const node = document.getElementById(item.id)
    if (node) observer.observe(node)
  })
  onBeforeUnmount(() => observer.disconnect())
})

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <nav
    v-if="items.length > 1"
    aria-label="Bagian undangan"
    :class="cn('iv-dock inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3', contained ? 'sticky' : 'fixed')"
  >
    <ul
      class="m-0 flex list-none items-center gap-0.5 rounded-full p-1.5 shadow-[0_12px_34px_-12px_rgb(0_0_0/0.45)] backdrop-blur-xl"
      style="background: color-mix(in srgb, var(--iv-bg) 88%, transparent); border: 1px solid color-mix(in srgb, var(--iv-fg) 12%, transparent)"
    >
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          :aria-current="active === item.id ? 'true' : undefined"
          :class="cn(
            'grid min-h-11 min-w-[3.25rem] place-items-center gap-0.5 rounded-full px-2 py-1.5 transition-colors duration-300',
            active === item.id ? 'iv-dock-active' : 'opacity-80',
          )"
          style="color: var(--iv-fg)"
          @click="go(item.id)"
        >
          <component :is="item.icon" :size="17" aria-hidden="true" />
          <span class="text-[0.625rem] font-semibold uppercase tracking-[0.08em]" style="font-family: var(--iv-body)">
            {{ item.label }}
          </span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style>
.iv-dock-active {
  background: color-mix(in srgb, var(--iv-primary) 16%, transparent);
  /* Darkened toward the body ink so 10px labels still clear 4.5:1 on the tinted pill. */
  color: color-mix(in srgb, var(--iv-primary) 65%, var(--iv-fg)) !important;
  opacity: 1;
}
</style>
