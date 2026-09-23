<script setup lang="ts">
import { FolderOpen, History, Image, Keyboard, MousePointer2, PanelRightClose, PanelRightOpen, Palette, Redo2, Save, SlidersHorizontal, Sparkles, Undo2 } from 'lucide-vue-next'
import type { InspectorTab } from '~/composables/useEditorPrefs'

/**
 * Inspektor (fase 72.1): baris ikon di atas (undo · redo | pustaka · riwayat · pintasan |
 * simpan · ciut), lalu empat tab **Bagian | Global | Ornamen | Kartu** — tiga yang pertama meniru
 * referensi (Section / Global / Card Style), tab Ornamen adalah manajemen ornamen kita.
 *
 * Panel memakai `v-show`, bukan `v-if`: form bagian memegang `<audio ref>` pratinjau musik dan
 * state internal kolom-kolomnya; `v-if` akan membongkarnya tiap kali pasangan melirik tab lain.
 */
defineProps<{
  canUndo: boolean
  canRedo: boolean
  dirty: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  save: []
  pustaka: []
  riwayat: []
  pintasan: []
}>()

const tab = defineModel<InspectorTab>('tab', { default: 'bagian' })
const collapsed = defineModel<boolean>('collapsed', { default: false })

const tabs = [
  { id: 'bagian', label: 'Bagian', icon: SlidersHorizontal },
  // Fase 81: keping yang dipilih di kanvas, sebagai kontrol bernomor + daftar Lapisan.
  { id: 'elemen', label: 'Elemen', icon: MousePointer2 },
  { id: 'global', label: 'Global', icon: Palette },
  { id: 'ornamen', label: 'Ornamen', icon: Sparkles },
  { id: 'kartu', label: 'Kartu', icon: Image },
] as const
</script>

<template>
  <!--
    Dua baris di `lg`, sama seperti `SectionRail` (fase 77).

    Baris pertama diam: alat undo/redo/simpan DAN baris tab. Keduanya diminta pemilik tetap di
    tempat — menggulir form Global yang panjang dulu menghilangkan tombol Simpan berikut keempat
    tabnya, jadi jalan kembali ke tab lain adalah menggulir balik sampai atas.
  -->
  <aside
    :class="cn(
      'grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 border-t border-border bg-surface px-4 py-4',
      'lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)] lg:content-stretch lg:gap-0 lg:overflow-hidden lg:border-l lg:border-t-0 lg:px-5 lg:pb-0',
      collapsed && 'lg:px-2',
    )"
    aria-label="Pengaturan"
  >
    <div class="grid content-start gap-4 lg:pb-4">
    <div :class="cn('flex items-center gap-0.5 rounded-full border border-border bg-surface p-1 shadow-hairline', collapsed ? 'lg:flex-col lg:rounded-md' : '')" role="toolbar" aria-label="Alat editor">
      <UiButton id="editor-undo" tone="ghost" size="sm" class="h-10 w-10 rounded-full px-0" :disabled="!canUndo" aria-label="Undo perubahan (Ctrl+Z)" @click="emit('undo')">
        <Undo2 :size="16" aria-hidden="true" />
      </UiButton>
      <UiButton id="editor-redo" tone="ghost" size="sm" class="h-10 w-10 rounded-full px-0" :disabled="!canRedo" aria-label="Redo perubahan (Ctrl+Y)" @click="emit('redo')">
        <Redo2 :size="16" aria-hidden="true" />
      </UiButton>
      <span :class="cn('mx-0.5 h-5 w-px bg-border', collapsed && 'lg:hidden')" aria-hidden="true" />
      <UiButton id="editor-pustaka" tone="ghost" size="sm" class="h-10 w-10 rounded-full px-0" aria-label="Asset Manager (Kelola Foto & Musik)" @click="emit('pustaka')">
        <FolderOpen :size="16" aria-hidden="true" />
      </UiButton>
      <UiButton id="editor-riwayat" tone="ghost" size="sm" class="h-10 w-10 rounded-full px-0" aria-label="Riwayat versi" @click="emit('riwayat')">
        <History :size="16" aria-hidden="true" />
      </UiButton>
      <UiButton id="editor-pintasan" tone="ghost" size="sm" class="h-10 w-10 rounded-full px-0" aria-label="Tampilkan pintasan keyboard" @click="emit('pintasan')">
        <Keyboard :size="16" aria-hidden="true" />
      </UiButton>
      <span :class="cn('flex-1', collapsed && 'lg:hidden')" aria-hidden="true" />
      <UiButton id="editor-save" tone="ghost" size="sm" :class="cn('h-10 rounded-full px-2.5', dirty && 'text-primary')" :loading="saving" :disabled="!dirty" aria-label="Simpan perubahan" @click="emit('save')">
        <Save v-if="!saving" :size="16" aria-hidden="true" />
      </UiButton>
      <span class="mx-0.5 hidden h-5 w-px bg-border lg:block" aria-hidden="true" />
      <UiButton
        id="editor-inspector-toggle"
        tone="ghost"
        size="sm"
        class="hidden h-10 w-10 rounded-full px-0 lg:grid"
        :aria-label="collapsed ? 'Buka sidebar editor' : 'Tutup sidebar editor (Collapse ke kanan)'"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        <PanelRightOpen v-if="collapsed" :size="16" aria-hidden="true" />
        <PanelRightClose v-else :size="16" aria-hidden="true" />
      </UiButton>
    </div>

      <div :class="cn('flex gap-1 rounded-full bg-surface-3 p-1', collapsed && 'lg:hidden')" role="tablist" aria-label="Panel penyunting">
        <button
          v-for="option in tabs"
          :id="`editor-inspector-${option.id}`"
          :key="option.id"
          type="button"
          role="tab"
          :aria-selected="tab === option.id"
          :aria-controls="`editor-inspector-panel-${option.id}`"
          :tabindex="tab === option.id ? 0 : -1"
          :class="cn(
            'flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1 text-caption font-semibold transition-colors duration-200',
            tab === option.id ? 'bg-surface text-success shadow-hairline' : 'text-ink-muted hover:text-ink',
          )"
          @click="tab = option.id"
        >
          <component :is="option.icon" :size="15" aria-hidden="true" />
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Baris kedua: hanya isi panelnya yang menggulung. -->
    <div :class="cn('grid content-start gap-4 lg:min-h-0 lg:overflow-y-auto lg:pb-5', collapsed && 'lg:hidden')">
      <!-- `@container` di sini, bukan di `<aside>`: tiap varian di dalam form wajib bertanya pada wadahnya (DESIGN.md). -->
      <div v-show="tab === 'bagian'" id="editor-inspector-panel-bagian" role="tabpanel" aria-labelledby="editor-inspector-bagian" class="@container grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
        <slot name="bagian" />
      </div>
      <div v-show="tab === 'elemen'" id="editor-inspector-panel-elemen" role="tabpanel" aria-labelledby="editor-inspector-elemen" class="@container grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
        <slot name="elemen" />
      </div>
      <div v-show="tab === 'global'" id="editor-inspector-panel-global" role="tabpanel" aria-labelledby="editor-inspector-global" class="@container grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
        <slot name="global" />
      </div>
      <div v-show="tab === 'ornamen'" id="editor-inspector-panel-ornamen" role="tabpanel" aria-labelledby="editor-inspector-ornamen" class="@container grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
        <slot name="ornamen" />
      </div>
      <div v-show="tab === 'kartu'" id="editor-inspector-panel-kartu" role="tabpanel" aria-labelledby="editor-inspector-kartu" class="@container grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
        <slot name="kartu" />
      </div>
    </div>
  </aside>
</template>
