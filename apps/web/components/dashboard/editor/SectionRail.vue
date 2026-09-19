<script setup lang="ts">
import type { Component } from 'vue'
import {
  ArrowDown, ArrowUp, BookHeart, CalendarDays, Gift, Heart, Image, Images, ListOrdered, Lock,
  MailCheck, MessageSquareHeart, Music, PanelLeftClose, PanelLeftOpen, Search, Shirt, Sparkles,
  Timer, Video, X,
} from 'lucide-vue-next'
import { sectionRequirement, type SectionEntry } from '~/utils/editor-sections'

/**
 * Rail struktur undangan: daftar bagian, sakelar tampil, panah urut, pencarian.
 *
 * Komponen ini tidak memutasi dokumen. Checkbox-nya `:checked` + `@change`, bukan `v-model`
 * ke `section.enabled` — `section` datang dari prop, dan `vue/no-mutating-props` benar
 * menolaknya. Halaman yang menulis, dan karena itu halaman pula yang bisa memanggil
 * `checkpoint()` lebih dulu supaya sakelarnya bisa di-undo (sebelum fase 62 tidak bisa).
 */
const props = defineProps<{
  /** Sudah tersaring oleh halaman; `index` adalah indeks di dokumen, bukan di daftar ini. */
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
  toggle: [id: string, enabled: boolean]
}>()

const query = defineModel<string>('query', { default: '' })
const collapsed = defineModel<boolean>('collapsed', { default: false })

const filtering = computed(() => query.value.trim().length > 0)

/** Ikon per bagian — yang tersisa terlihat saat rail diciutkan. */
const icons: Record<string, Component> = {
  cover: Image, couple: Heart, events: CalendarDays, countdown: Timer, gallery: Images,
  story: BookHeart, rundown: ListOrdered, dresscode: Shirt, video: Video, gift: Gift,
  rsvp: MailCheck, wishes: MessageSquareHeart, closing: Sparkles, music: Music,
}

const labelOf = (type: string) => props.labels[type] ?? type
</script>

<template>
  <aside
    :class="cn(
      'grid min-w-0 content-start gap-3 border-b border-border bg-surface-2 px-4 py-4 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r',
      collapsed && 'lg:px-2',
    )"
    aria-label="Struktur undangan"
  >
    <div :class="cn('flex items-center justify-between gap-2', collapsed && 'lg:justify-center')">
      <div :class="cn('grid gap-0.5', collapsed && 'lg:hidden')">
        <p class="eyebrow">Struktur undangan</p>
        <p id="editor-section-count" class="m-0 text-caption text-ink-subtle" aria-live="polite">
          {{ visible }} dari {{ total }} tampil
        </p>
      </div>

      <UiTooltip :content="collapsed ? 'Lebarkan struktur' : 'Ciutkan struktur'" side="right" :side-offset="10">
        <button
          id="editor-rail-toggle"
          type="button"
          class="hidden h-11 w-11 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors duration-200 hover:bg-surface-3 hover:text-ink lg:grid"
          :aria-label="collapsed ? 'Lebarkan struktur' : 'Ciutkan struktur'"
          :aria-expanded="!collapsed"
          @click="collapsed = !collapsed"
        >
          <PanelLeftOpen v-if="collapsed" :size="18" aria-hidden="true" />
          <PanelLeftClose v-else :size="18" aria-hidden="true" />
        </button>
      </UiTooltip>
    </div>

    <UiField id="editor-section-search" v-slot="{ id }" label="Cari bagian" :class="cn(collapsed && 'lg:hidden')">
      <div class="relative">
        <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
        <!--
          Input polos, bukan `UiInput`: tingginya 44px dan padding kirinya memberi ruang ikon,
          dan kelas dari luar yang bertabrakan dengan kelas bawaan `UiInput` diputuskan oleh
          urutan stylesheet — bukan oleh siapa yang memanggil.
        -->
        <input
          :id="id"
          v-model="query"
          type="search"
          autocomplete="off"
          placeholder="Akad, galeri, hadiah…"
          class="min-h-11 w-full rounded-md border border-border-input bg-surface pl-9 pr-10 text-[0.875rem] text-ink placeholder:text-ink-subtle/80 transition-[border-color,box-shadow] duration-200 hover:border-ink/60 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)] focus:outline-none"
        >
        <button
          v-if="filtering"
          id="editor-section-search-clear"
          type="button"
          class="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-ink-subtle hover:bg-surface-3 hover:text-ink"
          aria-label="Hapus pencarian"
          @click="query = ''"
        >
          <X :size="15" aria-hidden="true" />
        </button>
      </div>
    </UiField>

    <p v-if="!canEditDesign" id="design-locked-order" :class="cn('m-0 flex items-start gap-1.5 text-caption text-ink-muted', collapsed && 'lg:hidden')">
      <Lock :size="13" class="mt-0.5 shrink-0" aria-hidden="true" />
      <span>Urutan bagian mengikuti tema. Lihat tab Tema.</span>
    </p>

    <p v-if="filtering" class="sr-only" aria-live="polite">{{ entries.length }} bagian cocok</p>

    <ul class="m-0 grid gap-1 p-0 list-none">
      <li
        v-for="{ section, index } in entries"
        :key="section.id"
        :class="cn(
          'grid items-center gap-1 rounded-md border px-1 transition-colors duration-200',
          collapsed ? 'grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1' : 'grid-cols-[minmax(0,1fr)_auto]',
          selectedId === section.id ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-surface-3',
        )"
      >
        <!-- Tooltip hanya saat ciut (fase 67): saat lebar labelnya sudah terbaca di sebelah ikon. -->
        <UiTooltip :content="labelOf(section.type)" side="right" :side-offset="10" :disabled="!collapsed">
          <button
            :id="`editor-section-${section.id}`"
            type="button"
            :class="cn(
              'flex min-h-11 min-w-0 items-center gap-2.5 rounded-md px-1.5 text-left text-ink',
              collapsed && 'lg:justify-center lg:px-0',
            )"
            :aria-label="collapsed ? labelOf(section.type) : undefined"
            :aria-current="selectedId === section.id ? 'true' : undefined"
            @click="emit('select', section.id)"
          >
            <component
              :is="icons[section.type] ?? Image"
              :size="17"
              :class="cn('shrink-0', section.enabled ? 'text-ink-muted' : 'text-border-strong')"
              aria-hidden="true"
            />
            <!--
              Sub-label hanya untuk yang wajib. Menulis "Opsional" di sebelas baris lainnya cuma
              mengulang apa yang sudah dikatakan checkbox yang hidup di sebelahnya.
            -->
            <span :class="cn('grid min-w-0 gap-px', collapsed && 'lg:hidden')">
              <span class="text-[0.875rem] font-medium leading-snug">{{ labelOf(section.type) }}</span>
              <!-- `ink-muted`, bukan `ink-subtle`: di atas `primary-soft` baris terpilih, ink-subtle hanya 4,35:1 (axe, 2026-09-19). -->
              <span v-if="sectionRequirement(section.type) === 'wajib'" class="text-[0.6875rem] uppercase tracking-[0.08em] text-ink-muted">
                Wajib
              </span>
            </span>
          </button>
        </UiTooltip>

        <!-- Target sentuh tetap 44px tingginya; yang dirapikan lebarnya, bukan jangkauannya. -->
        <div :class="cn('flex items-center', collapsed && 'lg:hidden')">
          <label class="grid h-11 w-9 shrink-0 cursor-pointer place-items-center">
            <input
              :id="`editor-section-toggle-${section.id}`"
              type="checkbox"
              class="h-4 w-4 accent-[var(--color-primary)] disabled:cursor-not-allowed"
              :checked="section.enabled"
              :disabled="sectionRequirement(section.type) === 'wajib'"
              :aria-describedby="sectionRequirement(section.type) === 'wajib' ? 'editor-section-wajib' : undefined"
              @change="emit('toggle', section.id, ($event.target as HTMLInputElement).checked)"
            >
            <span class="sr-only">Tampilkan {{ labelOf(section.type) }}</span>
          </label>

          <button
            :id="`editor-section-up-${section.id}`"
            type="button"
            class="grid h-11 w-7 shrink-0 place-items-center rounded-md text-ink-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            :disabled="!canEditDesign || filtering || index === 0"
            :aria-label="`Naikkan ${labelOf(section.type)}`"
            :aria-describedby="canEditDesign ? undefined : 'design-locked-order'"
            @click="emit('move', index, -1)"
          >
            <ArrowUp :size="15" aria-hidden="true" />
          </button>
          <button
            :id="`editor-section-down-${section.id}`"
            type="button"
            class="grid h-11 w-7 shrink-0 place-items-center rounded-md text-ink-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            :disabled="!canEditDesign || filtering || index === total - 1"
            :aria-label="`Turunkan ${labelOf(section.type)}`"
            :aria-describedby="canEditDesign ? undefined : 'design-locked-order'"
            @click="emit('move', index, 1)"
          >
            <ArrowDown :size="15" aria-hidden="true" />
          </button>
        </div>
      </li>
    </ul>

    <p v-if="filtering && !entries.length" class="m-0 text-caption text-ink-muted">
      Tidak ada bagian bernama “{{ query.trim() }}”.
    </p>

    <p id="editor-section-wajib" class="sr-only">Bagian inti selalu tampil di undangan.</p>
  </aside>
</template>
