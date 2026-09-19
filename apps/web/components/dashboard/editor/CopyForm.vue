<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next'
import type { CopyKey, InvitationCopy } from '@aruna/contracts'
import { copyLimit } from '@aruna/contracts'
import { copyDefaults, copyGroups, jumlahCopyDiubah } from '~/utils/invitation-copy'

/**
 * Form "Kata-kata" di tab Tema (fase 69): 44 kalimat sistem undangan yang dulu ditulis mati.
 *
 * Satu `<details>` per bagian, dilipat: dibuka semua, form ini setinggi tiga layar dan
 * mengubur kontrol warna di atasnya. Placeholder tiap kolom adalah bawaan temanya — pasangan
 * melihat kalimat yang akan tampil kalau ia tidak menulis apa-apa, dan mengosongkan kolom
 * berarti kembali ke sana. Nilai ditulis saat `change` (blur/Enter), bukan tiap ketikan:
 * tiap tulisan adalah satu checkpoint undo, dan undo per huruf tidak berguna bagi siapa pun.
 */
const props = defineProps<{
  copy: InvitationCopy | undefined
  terkunci: boolean
}>()

const emit = defineEmits<{
  tulis: [key: CopyKey, value: string]
  kembalikan: []
}>()

const draft = reactive<Record<string, string>>({})
watch(() => props.copy, (copy) => {
  for (const group of copyGroups) for (const field of group.fields) draft[field.key] = copy?.[field.key] ?? ''
}, { immediate: true, deep: true })

const diubah = computed(() => jumlahCopyDiubah(props.copy))
const jumlahDiGrup = (keys: CopyKey[]) => keys.filter(key => props.copy?.[key] !== undefined && props.copy[key] !== copyDefaults[key]).length

function simpan(key: CopyKey) {
  const nilai = (draft[key] ?? '').trim().slice(0, copyLimit(key))
  draft[key] = nilai
  emit('tulis', key, nilai)
}
</script>

<template>
  <div class="grid gap-3">
    <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
      <div class="flex flex-wrap items-baseline gap-x-2">
        <span id="editor-copy-label" class="text-[0.8125rem] font-medium text-ink">Kata-kata</span>
        <span class="text-caption text-ink-subtle">Kicker, judul, dan tombol yang dibaca tamu. Kosongkan untuk kembali ke bawaan.</span>
      </div>
      <span v-if="diubah" class="text-caption text-ink-muted">{{ diubah }} diubah dari bawaan</span>
    </div>

    <div class="grid gap-1.5" role="group" aria-labelledby="editor-copy-label">
      <details
        v-for="group in copyGroups"
        :key="group.section"
        class="rounded-md border border-border bg-surface"
      >
        <summary class="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[0.8125rem] font-medium text-ink">
          {{ group.label }}
          <span v-if="jumlahDiGrup(group.fields.map(f => f.key))" class="rounded-full bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">
            {{ jumlahDiGrup(group.fields.map(f => f.key)) }} diubah
          </span>
        </summary>
        <div class="grid gap-3 p-3 pt-0">
          <UiField
            v-for="field in group.fields"
            :id="`editor-copy-${field.key.replace('.', '-')}`"
            :key="field.key"
            :label="field.label"
            :hint="`Maksimal ${copyLimit(field.key)} karakter.`"
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
                :aria-describedby="[describedBy, terkunci ? 'design-locked' : null].filter(Boolean).join(' ') || undefined"
                @change="simpan(field.key)"
              />
              <UiInput
                v-else
                :id="id"
                v-model="draft[field.key]"
                :placeholder="copyDefaults[field.key]"
                :maxlength="copyLimit(field.key)"
                :disabled="terkunci"
                :aria-describedby="[describedBy, terkunci ? 'design-locked' : null].filter(Boolean).join(' ') || undefined"
                @change="simpan(field.key)"
              />
            </template>
          </UiField>
        </div>
      </details>
    </div>

    <UiButton
      v-if="diubah"
      id="editor-copy-kembalikan"
      tone="quiet"
      size="sm"
      class="justify-self-start"
      :disabled="terkunci"
      @click="emit('kembalikan')"
    >
      <RotateCcw :size="15" aria-hidden="true" />
      Kembalikan kata-kata tema
    </UiButton>
  </div>
</template>
