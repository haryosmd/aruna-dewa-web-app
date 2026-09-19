<script setup lang="ts">
import { LayoutList, Palette } from 'lucide-vue-next'
import type { InspectorTab } from '~/composables/useEditorPrefs'

/**
 * Inspektor: panel kanan yang menggulung sendiri, bertab **Bagian | Tema**.
 *
 * Dua tab, bukan tiga seperti referensi ("Section / Global / Card Style") — "Card Style" tidak
 * punya padanan di sini, dan tab yang tidak berisi hanya menambah tempat tersesat.
 *
 * Kedua panel memakai `v-show`, bukan `v-if`. Form bagian memegang `<audio ref>` pratinjau musik
 * dan state internal `UiDropzone`; `v-if` akan membongkarnya tiap kali pasangan melirik tab Tema.
 * Ini juga yang membuat `aria-describedby="design-locked"` di form bagian tetap sah: targetnya
 * ada di panel Tema, dan keduanya selalu ada di DOM.
 */
defineProps<{ heading: string }>()
const tab = defineModel<InspectorTab>('tab', { default: 'bagian' })

const tabs = [
  { id: 'bagian', label: 'Bagian', icon: LayoutList },
  { id: 'tema', label: 'Tema', icon: Palette },
] as const
</script>

<template>
  <aside
    class="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 border-t border-border bg-surface px-4 py-4 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-5"
    aria-label="Pengaturan"
  >
    <div class="flex gap-1 rounded-full bg-surface-3 p-1" role="tablist" aria-label="Panel penyunting">
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
          'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[0.875rem] font-semibold transition-colors duration-200',
          tab === option.id ? 'bg-surface text-ink shadow-hairline' : 'text-ink-muted hover:text-ink',
        )"
        @click="tab = option.id"
      >
        <component :is="option.icon" :size="15" aria-hidden="true" />
        {{ option.label }}
      </button>
    </div>

    <!--
      `@container` di sini, bukan di `<aside>`: lebar panel ini datang dari jalur grid, dan
      setiap varian di dalam form wajib bertanya pada wadahnya, bukan pada layar (DESIGN.md).
    -->
    <div
      v-show="tab === 'bagian'"
      id="editor-inspector-panel-bagian"
      role="tabpanel"
      aria-labelledby="editor-inspector-bagian"
      class="@container grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5"
    >
      <div class="grid gap-1">
        <p class="eyebrow">Pengaturan bagian</p>
        <h2 class="m-0 font-display text-h3 font-semibold text-ink">{{ heading }}</h2>
      </div>
      <slot name="bagian" />
    </div>

    <div
      v-show="tab === 'tema'"
      id="editor-inspector-panel-tema"
      role="tabpanel"
      aria-labelledby="editor-inspector-tema"
      class="@container grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5"
    >
      <slot name="tema" />
    </div>
  </aside>
</template>
