<script setup lang="ts">
import { Lock, RotateCcw } from 'lucide-vue-next'
import type { CopyKey, InvitationCopy } from '@aruna/contracts'
import { copyLimit } from '@aruna/contracts'
import { copyClustersFor, copyDefaults, copyKeysFor, jumlahCopyDiubahDi, type CopySection } from '~/utils/invitation-copy'

/**
 * Kolom tulisan satu bagian, di tab Bagian (fase 71).
 *
 * Menggantikan `CopyForm.vue` fase 69 yang menumpuk 44 kolom sebagai accordion "Kata-kata" di
 * tab Tema. Pemilik menolak dua hal sekaligus: namanya ("Kata-kata" tidak menjelaskan apa-apa)
 * dan tempatnya (memilih "RSVP" di rail semestinya membawa semua yang mengubah RSVP). Maka di
 * sini **tidak ada judul payung** — yang ada sub-blok per fungsi ("Pilihan jawaban", "Tombol"),
 * dan tiap kolom dinamai menurut apa yang ia ubah di mata tamu.
 *
 * Placeholder tiap kolom adalah bawaan temanya: pasangan melihat kalimat yang akan tampil kalau
 * ia tidak menulis apa-apa, dan mengosongkan kolom berarti kembali ke sana. Nilai ditulis saat
 * `change` (blur/Enter), bukan tiap ketikan — tiap tulisan satu checkpoint undo.
 *
 * Catatan kunci ditaruh di sini, bukan hanya di `#design-locked` panel Tema: pasangan sedang
 * melihat tab Bagian, dan penjelasan di panel yang tersembunyi tidak menjelaskan apa pun.
 */
const props = defineProps<{
  section: CopySection
  copy: InvitationCopy | undefined
  terkunci: boolean
  lockedBy?: string
}>()

const emit = defineEmits<{
  tulis: [key: CopyKey, value: string]
  kembalikan: []
}>()

const clusters = computed(() => copyClustersFor(props.section))
const keys = computed(() => copyKeysFor(props.section))

const draft = reactive<Record<string, string>>({})
watch([() => props.copy, () => props.section], ([copy]) => {
  for (const key of keys.value) draft[key] = copy?.[key] ?? ''
}, { immediate: true, deep: true })

const diubah = computed(() => jumlahCopyDiubahDi(props.copy, keys.value))
const idKolom = (key: CopyKey) => `editor-copy-${key.replace('.', '-')}`

function simpan(key: CopyKey) {
  const nilai = (draft[key] ?? '').trim().slice(0, copyLimit(key))
  draft[key] = nilai
  emit('tulis', key, nilai)
}
</script>

<template>
  <div :id="`editor-copy-${section}`" class="card grid gap-5 p-5">
    <p v-if="terkunci" id="editor-copy-locked" class="m-0 flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3 text-[0.8125rem] text-ink-muted">
      <Lock :size="15" class="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
      <span>
        Mengubah tulisan bagian terkunci pada preset undangan ini.
        <span v-if="lockedBy" class="text-ink">{{ lockedBy }}</span>
      </span>
    </p>

    <!--
      Satu kalimat untuk seluruh kartu, bukan hint per kolom: pada RSVP ada tiga belas kolom, dan
      "Kosongkan untuk kembali ke bawaan" yang diulang tiga belas kali menenggelamkan labelnya.
      Batas karakter tidak ditulis — `maxlength` yang menjaganya, dan angka itu bukan keputusan
      yang perlu diambil pasangan sebelum mengetik.
    -->
    <p class="m-0 text-caption text-ink-subtle">
      Tulisan samar di dalam kolom adalah bawaan tema; kosongkan kolom untuk kembali ke sana.
    </p>

    <fieldset
      v-for="(cluster, index) in clusters"
      :key="cluster.judul"
      class="m-0 grid min-w-0 gap-4 border-0 p-0"
    >
      <legend class="contents">
        <span class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <span class="eyebrow">{{ cluster.judul }}</span>
          <span v-if="index === 0 && diubah" :id="`editor-copy-${section}-diubah`" class="rounded-full bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">
            {{ diubah }} diubah
          </span>
        </span>
      </legend>

      <UiField
        v-for="field in cluster.fields"
        :id="idKolom(field.key)"
        :key="field.key"
        :label="field.label"
      >
        <template #default="{ id, describedBy }">
          <UiTextarea
            v-if="field.multiline"
            :id="id"
            v-model="draft[field.key]"
            class="min-h-20"
            :placeholder="copyDefaults[field.key]"
            :maxlength="copyLimit(field.key)"
            :disabled="terkunci"
            :aria-describedby="[describedBy, terkunci ? 'editor-copy-locked' : null].filter(Boolean).join(' ') || undefined"
            @change="simpan(field.key)"
          />
          <UiInput
            v-else
            :id="id"
            v-model="draft[field.key]"
            :placeholder="copyDefaults[field.key]"
            :maxlength="copyLimit(field.key)"
            :disabled="terkunci"
            :aria-describedby="[describedBy, terkunci ? 'editor-copy-locked' : null].filter(Boolean).join(' ') || undefined"
            @change="simpan(field.key)"
          />
        </template>
      </UiField>
    </fieldset>

    <UiButton
      v-if="diubah"
      :id="`editor-copy-kembalikan-${section}`"
      tone="quiet"
      size="sm"
      class="justify-self-start"
      :disabled="terkunci"
      @click="emit('kembalikan')"
    >
      <RotateCcw :size="15" aria-hidden="true" />
      Kembalikan tulisan bawaan bagian ini
    </UiButton>
  </div>
</template>
