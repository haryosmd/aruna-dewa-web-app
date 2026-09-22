<script setup lang="ts">
import type { Component } from 'vue'
import {
  BookHeart, CalendarDays, Eye, EyeOff, Gift, GripVertical, Heart, Image, Images, Layers, ListOrdered, Lock,
  Mail, MapPin, MessageSquareHeart, PanelLeftClose, PanelLeftOpen, Quote, Search, Shirt, Sparkles, Timer, Video, X,
} from 'lucide-vue-next'
import { sectionRequirement, type SectionEntry } from '~/utils/editor-sections'

/**
 * Rail "Struktur Undangan" (fase 72.1), meniru referensi: judul + "Geser section untuk mengatur
 * urutan." + lencana jumlah + tombol ciut; pencarian; kartu bagian dengan pegangan ⠿, ikon, nama,
 * sub-label **Wajib/Opsional**; kartu aktif berbingkai hijau; bagian tersembunyi bergaris putus-
 * putus dengan nama dicoret dan tombol mata-coret kuning.
 *
 * Urutan digeser dengan drag-and-drop HTML5 pada pegangannya (tanpa pustaka tambahan), dan tetap
 * bisa dari keyboard: fokus pegangan lalu ↑/↓. Komponen ini tidak memutasi dokumen — ia emit
 * `select`/`move`/`toggle`/`reorder`, halaman yang menulis lewat `checkpoint()`.
 */
const props = defineProps<{
  entries: SectionEntry[]
  selectedId: string
  labels: Readonly<Record<string, string>>
  canEditDesign: boolean
  total: number
  visible: number
}>()

const emit = defineEmits<{
  select: [id: string]
  move: [index: number, direction: -1 | 1]
  reorder: [from: number, to: number]
  toggle: [id: string, enabled: boolean]
}>()

const query = defineModel<string>('query', { default: '' })
const collapsed = defineModel<boolean>('collapsed', { default: false })

const filtering = computed(() => query.value.trim().length > 0)

const icons: Record<string, Component> = {
  'cover': Image, 'opening-envelope': Mail, 'hero': Heart, 'couple': Heart, 'events': CalendarDays, 'event': CalendarDays,
  'countdown': Timer, 'map': MapPin, 'unduh-mantu': Layers, 'quote': Quote, 'gallery': Images, 'story': BookHeart,
  'rundown': ListOrdered, 'dresscode': Shirt, 'video': Video, 'gift': Gift, 'rsvp': MessageSquareHeart,
  'wishes': MessageSquareHeart, 'closing': Sparkles, 'music': Layers,
}

const labelOf = (type: string) => props.labels[type] ?? type

/*
 * Rail mengikuti sorot (fase 76).
 *
 * Sejak panggung bisa menyorot balik bagian yang sedang digulir, sorotan bisa mendarat di bawah
 * lipatan rail — tanda aktif yang tidak terlihat sama saja tidak ada. `block: 'nearest'` supaya
 * rail tidak melompat saat item yang dituju memang sudah tampak.
 *
 * `behavior` dibaca dari `prefers-reduced-motion`, dan bukan hanya demi aturan motion: gulir halus
 * membuat pengukuran e2e mendarat di tengah animasi, cacat yang sudah pernah memakan satu fase.
 */
const daftar = ref<HTMLElement | null>(null)
watch(() => props.selectedId, async (id) => {
  if (!id) return
  await nextTick()
  const item = daftar.value?.querySelector<HTMLElement>(`#editor-section-${CSS.escape(id)}`)
  if (!item) return
  const halus = typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches
  item.scrollIntoView({ block: 'nearest', behavior: halus ? 'smooth' : 'instant' })
})

/* ── Drag-and-drop ──────────────────────────────────────────────────────────── */
const dragging = ref<number | null>(null)
const over = ref<number | null>(null)

function onDragStart(index: number, event: DragEvent) {
  if (!props.canEditDesign || filtering.value) { event.preventDefault(); return }
  dragging.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function onDragOver(index: number, event: DragEvent) {
  if (dragging.value === null) return
  event.preventDefault()
  over.value = index
}
function onDrop(index: number) {
  const from = dragging.value
  dragging.value = null
  over.value = null
  if (from === null || from === index) return
  emit('reorder', from, index)
}
function onDragEnd() { dragging.value = null; over.value = null }

function onHandleKey(index: number, event: KeyboardEvent) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  event.preventDefault()
  emit('move', index, event.key === 'ArrowUp' ? -1 : 1)
}
</script>

<template>
  <!--
    Dua baris di `lg`, bukan satu penggulung (fase 77).

    Sebelumnya `<aside>` ini satu-satunya yang menggulung dan judul, lencana, serta kotak cari
    adalah saudara kandung daftarnya — jadi menggulir ke bagian ke-14 berarti kehilangan kotak
    cari. `sticky` bisa menutupinya, tapi ia menuntut latar buram dan z-index sendiri dan tetap
    bisa tertindih cincin fokus; dua baris tidak punya keadaan yang salah.

    Hanya di `lg`: di bawah itu halaman yang menggulung dan panel-panel bertumpuk, dan `overflow`
    di sini justru akan memotong daftarnya.
  -->
  <aside
    :class="cn(
      'grid min-w-0 content-start gap-3 border-b border-border bg-surface-2 px-4 py-4',
      'lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)] lg:content-stretch lg:gap-0 lg:overflow-hidden lg:border-b-0 lg:border-r lg:pb-0',
      collapsed && 'lg:px-2',
    )"
    aria-label="Struktur undangan"
  >
    <div class="grid content-start gap-3 lg:pb-3">
    <div :class="cn('flex items-start justify-between gap-2', collapsed && 'lg:justify-center')">
      <div :class="cn('grid gap-0.5', collapsed && 'lg:hidden')">
        <!-- `0.06em`, bukan `0.12em`: pada rail 17rem, tracking penuh membuat labelnya pecah dua baris. -->
        <p class="m-0 text-ui-label font-bold uppercase tracking-[0.06em] text-ink-muted">Struktur Undangan</p>
        <p class="m-0 text-caption text-ink-muted">Geser section untuk mengatur urutan.</p>
        <p id="editor-section-count" class="sr-only" aria-live="polite">{{ visible }} dari {{ total }} tampil</p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <span :class="cn('rounded-full bg-success-soft px-2 py-0.5 text-ui-label font-bold text-success', collapsed && 'lg:hidden')" aria-hidden="true">{{ total }}</span>
        <UiTooltip :content="collapsed ? 'Lebarkan struktur' : 'Tutup sidebar struktur (Zen Mode)'" side="right" :side-offset="10">
          <button
            id="editor-rail-toggle"
            type="button"
            class="hidden h-10 w-10 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors duration-200 hover:bg-surface-3 hover:text-ink lg:grid"
            :aria-label="collapsed ? 'Lebarkan struktur' : 'Tutup sidebar struktur (Zen Mode)'"
            :aria-expanded="!collapsed"
            @click="collapsed = !collapsed"
          >
            <PanelLeftOpen v-if="collapsed" :size="18" aria-hidden="true" />
            <PanelLeftClose v-else :size="18" aria-hidden="true" />
          </button>
        </UiTooltip>
      </div>
    </div>

    <UiField id="editor-section-search" v-slot="{ id }" label="Cari section" :class="cn('[&>span]:sr-only', collapsed && 'lg:hidden')">
      <div class="relative">
        <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
        <input
          :id="id"
          v-model="query"
          type="search"
          autocomplete="off"
          placeholder="Cari section (Akad, Galeri…)"
          class="min-h-11 w-full rounded-md border border-border-input bg-surface pl-9 pr-10 text-body text-ink placeholder:text-ink-subtle/80 transition-[border-color,box-shadow] duration-200 hover:border-ink/60 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)] focus:outline-none"
        >
        <button v-if="filtering" id="editor-section-search-clear" type="button" class="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-ink-subtle hover:bg-surface-3 hover:text-ink" aria-label="Hapus pencarian" @click="query = ''">
          <X :size="15" aria-hidden="true" />
        </button>
      </div>
    </UiField>

    <p v-if="!canEditDesign" id="design-locked-order" :class="cn('m-0 flex items-start gap-1.5 text-caption text-ink-muted', collapsed && 'lg:hidden')">
      <Lock :size="13" class="mt-0.5 shrink-0" aria-hidden="true" />
      <span>Urutan bagian mengikuti tema. Lihat tab Global.</span>
    </p>

    <p v-if="filtering" class="sr-only" aria-live="polite">{{ entries.length }} bagian cocok</p>
    </div>

    <!-- Baris kedua: hanya daftarnya yang menggulung. -->
    <div ref="daftar" class="grid content-start gap-3 lg:min-h-0 lg:overflow-y-auto lg:pb-4">
    <ul class="m-0 grid gap-1.5 p-0 list-none">
      <li
        v-for="{ section, index } in entries"
        :key="section.id"
        :class="cn(
          'grid items-center gap-1 rounded-lg border px-1 transition-colors duration-200',
          collapsed ? 'grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-cols-1' : 'grid-cols-[auto_minmax(0,1fr)_auto]',
          selectedId === section.id ? 'border-success bg-success-soft/60' : section.enabled ? 'border-transparent hover:bg-surface-3' : 'border-dashed border-border bg-surface/60',
          over === index && dragging !== null && dragging !== index && 'ring-2 ring-primary/50',
          dragging === index && 'opacity-50',
        )"
        @dragover="onDragOver(index, $event)"
        @drop="onDrop(index)"
      >
        <button
          :id="`editor-section-handle-${section.id}`"
          type="button"
          :class="cn('grid h-11 w-6 shrink-0 cursor-grab place-items-center rounded-md text-ink-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 active:cursor-grabbing', collapsed && 'lg:hidden')"
          :draggable="canEditDesign && !filtering"
          :disabled="!canEditDesign || filtering"
          :aria-label="`Geser ${labelOf(section.type)}`"
          :aria-describedby="canEditDesign ? 'editor-section-drag-hint' : 'design-locked-order'"
          @dragstart="onDragStart(index, $event)"
          @dragend="onDragEnd"
          @keydown="onHandleKey(index, $event)"
        >
          <GripVertical :size="15" aria-hidden="true" />
        </button>

        <UiTooltip :content="labelOf(section.type)" side="right" :side-offset="10" :disabled="!collapsed">
          <button
            :id="`editor-section-${section.id}`"
            type="button"
            :class="cn('flex min-h-12 min-w-0 items-center gap-2.5 rounded-md px-1 text-left', collapsed && 'lg:justify-center lg:px-0')"
            :aria-label="collapsed ? labelOf(section.type) : undefined"
            :aria-current="selectedId === section.id ? 'true' : undefined"
            @click="emit('select', section.id)"
          >
            <component :is="icons[section.type] ?? Image" :size="17" :class="cn('shrink-0', section.enabled ? 'text-ink-muted' : 'text-border-strong')" aria-hidden="true" />
            <span :class="cn('grid min-w-0 gap-px', collapsed && 'lg:hidden')">
              <!-- `ink-muted`, bukan `ink-subtle`: dicoret di atas kartu putus-putus, ink-subtle hanya 4,4:1 (axe, fase 72). -->
              <span :class="cn('text-ui font-semibold leading-snug', section.enabled ? 'text-ink' : 'text-ink-muted line-through')">{{ labelOf(section.type) }}</span>
              <span class="text-ui-label text-ink-muted">{{ sectionRequirement(section.type) === 'wajib' ? 'Wajib' : 'Opsional' }}</span>
            </span>
          </button>
        </UiTooltip>

        <div :class="cn('flex items-center', collapsed && 'lg:hidden')">
          <button
            v-if="sectionRequirement(section.type) !== 'wajib'"
            :id="`editor-section-toggle-${section.id}`"
            type="button"
            :class="cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-md border transition-colors duration-200',
              section.enabled ? 'border-transparent text-ink-subtle hover:bg-surface-3 hover:text-ink' : 'border-warning/40 bg-gold-soft text-warning',
            )"
            :aria-pressed="!section.enabled"
            :aria-label="`${section.enabled ? 'Sembunyikan' : 'Tampilkan'} ${labelOf(section.type)}`"
            @click="emit('toggle', section.id, !section.enabled)"
          >
            <EyeOff v-if="!section.enabled" :size="16" aria-hidden="true" />
            <Eye v-else :size="16" aria-hidden="true" />
          </button>
          <span v-else class="grid h-10 w-10 place-items-center text-border-strong" aria-hidden="true">
            <Lock :size="13" />
          </span>
        </div>
      </li>
    </ul>

    <p v-if="filtering && !entries.length" class="m-0 text-caption text-ink-muted">Tidak ada bagian bernama “{{ query.trim() }}”.</p>
    </div>

    <p id="editor-section-drag-hint" class="sr-only">Seret untuk mengubah urutan, atau tekan panah atas dan bawah.</p>
    <p id="editor-section-wajib" class="sr-only">Bagian inti selalu tampil di undangan.</p>
  </aside>
</template>
