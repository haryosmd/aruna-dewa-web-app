<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'

/**
 * Satu foto: pratinjau, area jatuh, hapus, dan kotak URL sebagai jalan keluar.
 *
 * Sebelum ini foto cover — gambar pertama yang dilihat tamu — hanya bisa diisi dengan mengetik
 * URL di kotak teks fallback yang berlabel "URL foto". Bentuknya sama persis untuk cover,
 * mempelai, dan tiap langkah Cerita, jadi ia hidup sekali di sini.
 *
 * Penghapusan **tidak** dikerjakan komponen ini: hanya pemanggil yang tahu apakah URL yang sama
 * masih dipakai di bagian lain dokumen. Yang dikerjakan di sini adalah mengosongkan nilainya
 * lalu memberi tahu.
 */
const props = withDefaults(defineProps<{
  id: string
  invitationId: string
  modelValue: string
  label?: string
  hint?: string
}>(), { label: 'Foto', hint: '' })

const emit = defineEmits<{ 'update:modelValue': [string]; release: [string] }>()

const { pending, failures, upload } = useMediaUploads(() => props.invitationId)

async function onFiles(files: File[]) {
  const [url] = await upload(files)
  if (url) emit('update:modelValue', url)
}

function clear() {
  const previous = props.modelValue
  emit('update:modelValue', '')
  if (previous) emit('release', previous)
}
</script>

<template>
  <div class="grid gap-2.5">
    <p class="m-0 text-[0.8125rem] font-semibold text-ink">{{ props.label }}</p>

    <div v-if="props.modelValue" class="card flex items-center gap-3 p-2.5">
      <img :src="props.modelValue" alt="" class="h-16 w-16 shrink-0 rounded-md object-cover">
      <p class="m-0 min-w-0 flex-1 truncate text-caption text-ink-muted">{{ props.modelValue }}</p>
      <button
        :id="`${props.id}-remove`"
        type="button"
        class="grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
        :aria-label="`Hapus ${props.label.toLowerCase()}`"
        @click="clear"
      >
        <Trash2 :size="16" aria-hidden="true" />
      </button>
    </div>

    <UiDropzone :id="`${props.id}-drop`" kind="image" :pending="pending" @files="onFiles" />

    <ul v-if="failures.length" role="alert" class="m-0 grid gap-1 p-0 list-none">
      <li v-for="message in failures" :key="message" class="text-caption font-medium text-danger">{{ message }}</li>
    </ul>

    <UiField :id="props.id" v-slot="{ id: fieldId }" label="atau tempel URL foto" :hint="props.hint">
      <UiInput
        :id="fieldId"
        type="url"
        placeholder="https://…"
        :model-value="props.modelValue"
        @update:model-value="next => emit('update:modelValue', next ?? '')"
      />
    </UiField>
  </div>
</template>
