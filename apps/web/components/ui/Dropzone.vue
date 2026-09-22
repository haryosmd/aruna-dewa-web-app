<script setup lang="ts">
import { formatBytes, mediaAccept, mediaRules, type MediaKind } from '@aruna/contracts'
import { ImagePlus, Loader2, Music4 } from 'lucide-vue-next'

/**
 * Area jatuh berkas.
 *
 * Rootnya `<label>` dengan `<input type="file">` sungguhan di dalamnya, bukan `<div>` ber-`role`.
 * Keyboard, pembaca layar, dan pemilih berkas ponsel semuanya bekerja tanpa satu baris pun
 * penanganan khusus — dan di ponsel, tempat menyeret berkas tidak ada, benda ini tetap masuk
 * akal sebagai tombol.
 */
const props = withDefaults(defineProps<{
  id: string
  kind?: MediaKind
  multiple?: boolean
  disabled?: boolean
  pending?: boolean
  /** Sisa kuota. `undefined` berarti tidak dibatasi di sini. */
  remaining?: number
  label?: string
}>(), { kind: 'image', multiple: false, disabled: false, pending: false, remaining: undefined, label: '' })

const emit = defineEmits<{ files: [File[]] }>()

const input = ref<HTMLInputElement | null>(null)
const errors = ref<string[]>([])

/*
 * Penghitung kedalaman, bukan boolean.
 *
 * Menyeret berkas melintasi anak elemen memicu `dragleave` di induknya lalu `dragenter` di
 * anaknya. Dengan boolean, bingkainya berkedip tiap kali kursor melewati teks di dalamnya.
 */
const depth = ref(0)
const dragging = computed(() => depth.value > 0)

const rules = computed(() => mediaRules[props.kind])
const blocked = computed(() => props.disabled || props.pending || props.remaining === 0)

const headline = computed(() => {
  if (props.label) return props.label
  if (props.kind === 'audio') return 'Jatuhkan MP3 di sini, atau pilih berkas'
  return props.multiple ? 'Jatuhkan foto di sini, atau pilih berkas' : 'Jatuhkan foto di sini, atau pilih berkas'
})

function take(list: FileList | null | undefined) {
  errors.value = []
  const incoming = Array.from(list ?? [])
  if (!incoming.length) return

  const accepted: File[] = []
  const rejected: string[] = []

  for (const file of incoming) {
    const problem = validateMediaFile(file, props.kind)
    if (problem) { rejected.push(problem); continue }
    // Kuota dihitung selagi berjalan, bukan di akhir: pasangan berhak tahu foto mana yang
    // tidak muat, bukan cuma bahwa jatuhannya terlalu banyak.
    if (props.remaining !== undefined && accepted.length >= props.remaining) {
      rejected.push(`${file.name} — kuota sudah penuh`)
      continue
    }
    accepted.push(file)
  }

  errors.value = rejected
  if (accepted.length) emit('files', props.multiple ? accepted : accepted.slice(0, 1))
}

function onDrop(event: DragEvent) {
  depth.value = 0
  if (blocked.value) return
  take(event.dataTransfer?.files)
}

function onChange(event: Event) {
  const element = event.target as HTMLInputElement
  take(element.files)
  // Dikosongkan supaya memilih berkas yang sama dua kali berturut-turut tetap memicu `change`.
  element.value = ''
}
</script>

<template>
  <div class="grid gap-2">
    <!--
      `relative` bukan hiasan. `<input class="sr-only">` di bawah ini `position: absolute`, dan
      tanpa leluhur ber-posisi containing block-nya adalah viewport: kotak 1px-nya mendarat di
      koordinat dokumen sesuai posisi statiknya, lolos dari `overflow: hidden` milik `<main>` studio,
      dan menarik `scrollHeight` dokumen ke sana (terukur 2168px pada viewport 900 di editor, fase 71).
      Kelas bug yang sama pernah kena di `.table-wrap` (main.css).
    -->
    <label
      :for="props.id"
      :class="cn(
        'relative grid justify-items-center gap-2 rounded-lg border border-dashed px-5 py-6 text-center transition-colors duration-200',
        blocked ? 'cursor-not-allowed border-border-input bg-surface-3 opacity-70' : 'cursor-pointer',
        !blocked && dragging
          ? 'border-primary bg-primary-soft/60'
          : !blocked && 'border-border-strong bg-surface hover:border-ink/40 hover:bg-surface-2',
      )"
      @dragenter.prevent="depth++"
      @dragover.prevent
      @dragleave.prevent="depth = Math.max(0, depth - 1)"
      @drop.prevent="onDrop"
    >
      <input
        :id="props.id"
        ref="input"
        class="sr-only"
        type="file"
        :accept="mediaAccept(props.kind)"
        :multiple="props.multiple"
        :disabled="blocked"
        @change="onChange"
      >

      <Loader2 v-if="props.pending" :size="22" class="animate-spin text-primary" aria-hidden="true" />
      <Music4 v-else-if="props.kind === 'audio'" :size="22" class="text-ink-subtle" aria-hidden="true" />
      <ImagePlus v-else :size="22" class="text-ink-subtle" aria-hidden="true" />

      <span class="text-ui-lg font-semibold text-ink">
        {{ props.pending ? 'Mengunggah…' : headline }}
      </span>

      <span class="text-caption text-ink-subtle">
        {{ rules.label }} · maksimal {{ formatBytes(rules.maxBytes) }}
        <template v-if="props.remaining !== undefined"> · sisa {{ props.remaining }}</template>
      </span>
    </label>

    <!--
      Satu baris per berkas yang ditolak. `role="alert"` ada di pembungkusnya, bukan di tiap
      baris: sepuluh peringatan yang diumumkan satu per satu tidak terbaca oleh siapa pun.
    -->
    <ul v-if="errors.length" role="alert" class="m-0 grid gap-1 p-0 list-none">
      <li v-for="message in errors" :key="message" class="text-caption font-medium text-danger">{{ message }}</li>
    </ul>
  </div>
</template>
