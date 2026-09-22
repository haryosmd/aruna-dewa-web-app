<script setup lang="ts">
import { FolderOpen, ImagePlus, X } from 'lucide-vue-next'

/**
 * Kartu "FOTO KOMPONEN" (fase 72.8), persis referensi: label kapital, nama berkas, pratinjau 16:9
 * dengan tombol ✕ di pojok, tombol hijau muda "Ganti dari Asset Saya"; kosong = ilustrasi +
 * "Belum ada gambar terpilih" + "Pilih dari Asset Saya". Pemilihan berkas — unggah, cari, hapus —
 * seluruhnya hidup di modal Pustaka (`useMediaLibrary`), bukan di tiap kartu.
 *
 * Penghapusan **tidak** dikerjakan komponen ini: hanya pemanggil yang tahu apakah URL yang sama
 * masih dipakai di bagian lain dokumen. Yang dikerjakan di sini adalah mengosongkan nilainya lalu
 * memberi tahu (`release`).
 */
const props = withDefaults(defineProps<{
  id: string
  invitationId: string
  modelValue: string
  label?: string
  hint?: string
  /** Konteks untuk header pustaka, mis. nama bagian. */
  konteks?: string
}>(), { label: 'Foto komponen', hint: '', konteks: '' })

const emit = defineEmits<{ 'update:modelValue': [string]; release: [string] }>()

const { pilih } = useMediaLibrary()

const namaBerkas = computed(() => props.modelValue.split('/').pop() ?? '')

async function buka() {
  const hasil = await pilih({ judul: [props.label, props.konteks].filter(Boolean).join(' · ') })
  const url = hasil?.[0]
  if (!url || url === props.modelValue) return
  const previous = props.modelValue
  emit('update:modelValue', url)
  if (previous) emit('release', previous)
}

function clear() {
  const previous = props.modelValue
  emit('update:modelValue', '')
  if (previous) emit('release', previous)
}
</script>

<template>
  <div class="grid gap-2.5 rounded-md border border-border bg-surface p-3.5">
    <div class="grid gap-0.5">
      <p class="m-0 text-ui-label font-bold uppercase tracking-[0.12em] text-ink-muted">{{ props.label }}</p>
      <p v-if="props.modelValue" class="m-0 truncate text-caption text-ink-muted" :title="props.modelValue">{{ namaBerkas }}</p>
      <p v-else-if="props.hint" class="m-0 text-caption text-ink-subtle">{{ props.hint }}</p>
    </div>

    <div v-if="props.modelValue" class="relative overflow-hidden rounded-md bg-surface-2">
      <img :src="props.modelValue" alt="" class="aspect-video w-full object-cover">
      <button
        :id="`${props.id}-remove`"
        type="button"
        class="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-ink/70 text-ink-inverse shadow-lift transition-colors duration-200 hover:bg-danger"
        :aria-label="`Hapus ${props.label.toLowerCase()}`"
        @click="clear"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>
    <div v-else class="grid justify-items-center gap-1.5 rounded-md border border-dashed border-border bg-surface-2 px-4 py-6 text-center">
      <ImagePlus :size="28" class="text-ink-subtle" aria-hidden="true" />
      <p class="m-0 text-caption text-ink-muted">Belum ada gambar terpilih</p>
    </div>

    <UiButton :id="`${props.id}-pilih`" tone="outline" class="border-primary/40 bg-primary-soft/40 text-primary hover:bg-primary-soft" @click="buka">
      <FolderOpen :size="16" aria-hidden="true" />
      {{ props.modelValue ? 'Ganti dari Asset Saya' : 'Pilih dari Asset Saya' }}
    </UiButton>
  </div>
</template>
