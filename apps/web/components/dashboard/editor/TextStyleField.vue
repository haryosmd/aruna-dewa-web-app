<script setup lang="ts">
import { Bold, ChevronDown, Italic, Lock, RotateCcw, Type } from 'lucide-vue-next'
import type { FieldMeta, FontChoice, TextStyle } from '@aruna/contracts'

/**
 * Satu kolom teks bagian + panel lipat "Gaya teks" (fase 72.4), persis referensi: label tebal,
 * input, baris "T Gaya teks ⌄" yang membuka font · warna · ukuran px · tebal · miring · reset.
 *
 * Nilai teks ditulis saat `change` (blur/Enter), bukan tiap ketikan — satu tulisan satu langkah
 * undo, pola yang sama dengan `CopyFields` fase 71. Gaya ditulis langsung saat dipilih karena
 * tiap pilihannya sudah satu keputusan.
 *
 * Font yang ditawarkan **milik tema**, bukan seluruh `fontChoices`: huruf judul, huruf paragraf,
 * dan kaligrafi. Untuk kolom paragraf kaligrafi tidak ditawarkan — aturan DESIGN.md "script bukan
 * untuk paragraf" ditegakkan di pemilih, bukan diharapkan dari pasangan.
 */
const props = withDefaults(defineProps<{
  id: string
  field: FieldMeta
  modelValue: string
  style?: TextStyle
  /** Font yang boleh dipilih, sudah disaring pemanggil menurut tema. */
  fonts: { id: FontChoice; label: string; script?: boolean }[]
  /** Warna bawaan kolom (untuk swatch saat belum diubah). */
  defaultColor: string
  terkunci?: boolean
  lockedBy?: string
}>(), { style: undefined, terkunci: false, lockedBy: '' })

const emit = defineEmits<{
  'update:modelValue': [string]
  'update:style': [TextStyle | null]
}>()

const draft = ref(props.modelValue)
watch(() => props.modelValue, next => { draft.value = next })

const terbuka = ref(false)
const diubah = computed(() => Boolean(props.style && Object.keys(props.style).length))

function simpan() {
  const nilai = draft.value.trim().slice(0, props.field.max ?? 240)
  draft.value = nilai
  if (nilai !== props.modelValue) emit('update:modelValue', nilai)
}

function tulisGaya(patch: Partial<TextStyle>) {
  const berikut: TextStyle = { ...(props.style ?? {}), ...patch }
  for (const key of Object.keys(berikut) as (keyof TextStyle)[]) if (berikut[key] === undefined) delete berikut[key]
  emit('update:style', Object.keys(berikut).length ? berikut : null)
}

const fontsUntukKolom = computed(() => props.field.kind === 'paragraf' ? props.fonts.filter(font => !font.script) : props.fonts)
</script>

<template>
  <div class="grid gap-2 rounded-md border border-border bg-surface p-3.5">
    <UiField :id="id" v-slot="{ id: fieldId }" :label="field.label">
      <UiTextarea
        v-if="field.kind === 'paragraf'"
        :id="fieldId"
        v-model="draft"
        class="min-h-24"
        :maxlength="field.max ?? 600"
        :style="{ textAlign: style?.textAlign }"
        @change="simpan"
      />
      <UiInput
        v-else
        :id="fieldId"
        v-model="draft"
        :maxlength="field.max ?? 120"
        @change="simpan"
      />
    </UiField>

    <button
      :id="`${id}-gaya`"
      type="button"
      class="flex min-h-10 items-center justify-between gap-2 rounded-md px-1 text-ui text-ink-muted transition-colors duration-200 hover:text-ink"
      :aria-expanded="terbuka"
      :aria-controls="`${id}-gaya-panel`"
      @click="terbuka = !terbuka"
    >
      <span class="flex items-center gap-1.5">
        <Type :size="15" aria-hidden="true" />
        Gaya teks
        <span v-if="diubah" class="rounded-full bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">diubah</span>
      </span>
      <ChevronDown :size="16" :class="cn('transition-transform duration-200', terbuka && 'rotate-180')" aria-hidden="true" />
    </button>

    <div v-show="terbuka" :id="`${id}-gaya-panel`" class="grid gap-3 border-t border-border pt-3">
      <p v-if="terkunci" class="m-0 flex items-start gap-2 text-caption text-ink-muted">
        <Lock :size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
        <span>Gaya teks terkunci pada preset undangan ini. <span v-if="lockedBy" class="text-ink">{{ lockedBy }}</span></span>
      </p>

      <UiField :id="`${id}-font`" v-slot="{ id: selectId }" label="Font teks">
        <UiSelect
          :id="selectId"
          :model-value="style?.fontFamily ?? ''"
          :disabled="terkunci"
          @update:model-value="value => tulisGaya({ fontFamily: value ? (value as FontChoice) : undefined })"
        >
          <option value="">Bawaan template</option>
          <option v-for="font in fontsUntukKolom" :key="font.id" :value="font.id">{{ font.label }}</option>
        </UiSelect>
      </UiField>

      <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3">
        <UiField :id="`${id}-warna`" v-slot="{ id: colorId }" label="Warna">
          <input
            :id="colorId"
            type="color"
            class="control h-12 w-16 cursor-pointer p-1 disabled:cursor-not-allowed disabled:opacity-60"
            :value="style?.color ?? defaultColor"
            :disabled="terkunci"
            @input="tulisGaya({ color: ($event.target as HTMLInputElement).value })"
          >
        </UiField>
        <UiField :id="`${id}-ukuran`" v-slot="{ id: sizeId }" label="Ukuran">
          <div class="flex items-center gap-2">
            <UiInput
              :id="sizeId"
              type="number"
              min="10"
              max="96"
              :aria-label="`Ukuran ${field.label}`"
              :model-value="style?.fontSize ? String(style.fontSize) : ''"
              placeholder="Bawaan"
              :disabled="terkunci"
              @change="(event: Event) => { const angka = Number((event.target as HTMLInputElement).value); tulisGaya({ fontSize: Number.isFinite(angka) && angka >= 10 ? Math.min(96, Math.round(angka)) : undefined }) }"
            />
            <span class="text-caption text-ink-subtle">px</span>
          </div>
        </UiField>
        <div class="flex gap-1 pb-0.5" role="group" :aria-label="`Ketebalan ${field.label}`">
          <button
            :id="`${id}-tebal`"
            type="button"
            :aria-pressed="style?.fontWeight === 'bold'"
            :aria-label="`Bold ${field.label}`"
            :disabled="terkunci"
            :class="cn('grid h-12 w-11 place-items-center rounded-md border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60', style?.fontWeight === 'bold' ? 'border-ink bg-ink text-ink-inverse' : 'border-border-input text-ink hover:bg-surface-3')"
            @click="tulisGaya({ fontWeight: style?.fontWeight === 'bold' ? undefined : 'bold' })"
          >
            <Bold :size="16" aria-hidden="true" />
          </button>
          <button
            :id="`${id}-miring`"
            type="button"
            :aria-pressed="style?.fontStyle === 'italic'"
            :aria-label="`Italic ${field.label}`"
            :disabled="terkunci"
            :class="cn('grid h-12 w-11 place-items-center rounded-md border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60', style?.fontStyle === 'italic' ? 'border-ink bg-ink text-ink-inverse' : 'border-border-input text-ink hover:bg-surface-3')"
            @click="tulisGaya({ fontStyle: style?.fontStyle === 'italic' ? undefined : 'italic' })"
          >
            <Italic :size="16" aria-hidden="true" />
          </button>
        </div>
      </div>

      <UiButton
        v-if="diubah"
        :id="`${id}-reset-gaya`"
        tone="quiet"
        size="sm"
        class="justify-self-start"
        :disabled="terkunci"
        @click="emit('update:style', null)"
      >
        <RotateCcw :size="15" aria-hidden="true" />
        Reset gaya teks
      </UiButton>
    </div>
  </div>
</template>
