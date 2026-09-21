<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import type { InvitationSection } from '@aruna/contracts'
import { selectableAttire, toAttire } from '~/utils/invitation-options'

/**
 * Daftar milik bagian ekstra (cerita, rundown, dresscode) — dipindah dari cabang inline editor
 * lama. Kolom tunggalnya (judul, kicker, catatan) sudah digenerate `SectionForm`; yang tinggal
 * di sini hanya struktur berulang yang tidak bisa dinyatakan sebagai satu `FieldMeta`.
 *
 * Tiap tombol tambah/hapus menulis SALINAN array lewat `tulis`, supaya halaman memanggil
 * `checkpoint()` sekali per tindakan; suntingan di dalam baris ditulis saat `change`.
 *
 * Salinan di sini **dangkal dengan sengaja**, dan itu aman hanya karena satu hal: `rows()`
 * membaca `props.section.data`, yang reaktif, jadi `[...rows('steps'), {…}]` membawa seluruh
 * baris lama sebagai proxy Vue. Yang membersihkannya adalah `tulis()` di `editor.vue` —
 * gerbang tunggal yang dilewati semua form — lewat `bersihkan()`. Kalau suatu saat ada
 * komponen yang menulis ke dokumen TANPA melewati `tulis()`, ia wajib memanggil `bersihkan()`
 * sendiri; `document-history.spec.ts` menjelaskan kenapa.
 */
const props = defineProps<{ section: InvitationSection; invitationId: string }>()
const emit = defineEmits<{ tulis: [key: string, value: unknown]; release: [url: string] }>()

const data = computed(() => props.section.data as Record<string, unknown>)
const rows = (key: string) => (Array.isArray(data.value[key]) ? (data.value[key] as Record<string, unknown>[]) : [])

function tulisBaris(key: string, index: number, patch: Record<string, unknown>) {
  const salinan = rows(key).map(row => ({ ...row }))
  salinan[index] = { ...salinan[index], ...patch }
  emit('tulis', key, salinan)
}
function hapusBaris(key: string, index: number) {
  const salinan = rows(key).slice()
  const [dihapus] = salinan.splice(index, 1)
  emit('tulis', key, salinan)
  const foto = dihapus && typeof dihapus.image === 'string' ? dihapus.image : ''
  if (foto) emit('release', foto)
}
function tambahLangkah() {
  const steps = rows('steps')
  emit('tulis', 'steps', [...steps, { id: crypto.randomUUID(), title: '', text: '', image: '', side: steps.length % 2 === 0 ? 'kiri' : 'kanan' }])
}
function tambahRundown() {
  emit('tulis', 'items', [...rows('items'), { id: crypto.randomUUID(), time: '', title: '', description: '' }])
}
function tambahWarna() {
  emit('tulis', 'colors', [...rows('colors'), { hex: '#E8DCC8', name: '' }])
}

const attire = computed(() => toAttire(data.value.attire))
function toggleAttire(id: string, on: boolean) {
  const current = attire.value.filter(item => item !== id)
  emit('tulis', 'attire', on ? [...current, id] : current)
}
</script>

<template>
  <div v-if="section.type === 'story'" class="grid gap-3 rounded-md border border-border bg-surface p-3.5">
    <div class="grid gap-0.5">
      <p class="m-0 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-ink">Langkah cerita</p>
      <p class="m-0 text-caption text-ink-muted">Tiap langkah muncul dari sisi berbeda. Kosongkan semuanya untuk satu paragraf saja.</p>
    </div>
    <article v-for="(step, index) in rows('steps')" :key="String(step.id)" class="grid gap-3 rounded-md border border-border p-3">
      <div class="flex items-center justify-between gap-3">
        <strong class="text-ink">Langkah {{ index + 1 }}</strong>
        <button :id="`editor-story-remove-${index + 1}`" type="button" class="grid h-10 w-10 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger" :aria-label="`Hapus langkah ${index + 1}`" @click="hapusBaris('steps', index)">
          <Trash2 :size="16" aria-hidden="true" />
        </button>
      </div>
      <UiField :id="`editor-story-title-${index + 1}`" v-slot="{ id }" label="Judul langkah">
        <UiInput :id="id" :model-value="String(step.title || '')" @change="(e: Event) => tulisBaris('steps', index, { title: (e.target as HTMLInputElement).value })" />
      </UiField>
      <UiField :id="`editor-story-text-${index + 1}`" v-slot="{ id }" label="Cerita">
        <UiTextarea :id="id" rows="3" :model-value="String(step.text || '')" @change="(e: Event) => tulisBaris('steps', index, { text: (e.target as HTMLTextAreaElement).value })" />
      </UiField>
      <UiField :id="`editor-story-side-${index + 1}`" v-slot="{ id }" label="Sisi masuk">
        <UiSelect :id="id" :model-value="String(step.side || 'kiri')" @update:model-value="value => tulisBaris('steps', index, { side: value })">
          <option value="kiri">Kiri</option>
          <option value="kanan">Kanan</option>
        </UiSelect>
      </UiField>
      <DashboardPhotoField
        :id="`editor-story-image-${index + 1}`"
        :invitation-id="invitationId"
        label="Foto langkah"
        :model-value="String(step.image || '')"
        @update:model-value="value => tulisBaris('steps', index, { image: value })"
        @release="url => emit('release', url)"
      />
    </article>
    <UiButton id="editor-story-add" tone="outline" class="justify-self-start" @click="tambahLangkah">
      <Plus :size="16" aria-hidden="true" />
      Tambah langkah
    </UiButton>
  </div>

  <div v-else-if="section.type === 'rundown'" class="grid gap-3 rounded-md border border-border bg-surface p-3.5">
    <p class="m-0 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-ink">Susunan acara</p>
    <article v-for="(item, index) in rows('items')" :key="String(item.id)" class="grid gap-3 rounded-md border border-border p-3">
      <div class="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-end gap-2">
        <UiField :id="`editor-rundown-time-${index + 1}`" v-slot="{ id }" label="Waktu">
          <UiInput :id="id" :model-value="String(item.time || '')" placeholder="09.00" @change="(e: Event) => tulisBaris('items', index, { time: (e.target as HTMLInputElement).value })" />
        </UiField>
        <UiField :id="`editor-rundown-title-${index + 1}`" v-slot="{ id }" label="Kegiatan">
          <UiInput :id="id" :model-value="String(item.title || '')" @change="(e: Event) => tulisBaris('items', index, { title: (e.target as HTMLInputElement).value })" />
        </UiField>
        <button :id="`editor-rundown-remove-${index + 1}`" type="button" class="grid h-12 w-10 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger" :aria-label="`Hapus bagian ${index + 1}`" @click="hapusBaris('items', index)">
          <Trash2 :size="16" aria-hidden="true" />
        </button>
      </div>
      <UiField :id="`editor-rundown-note-${index + 1}`" v-slot="{ id }" label="Keterangan">
        <UiInput :id="id" :model-value="String(item.description || '')" placeholder="Opsional" @change="(e: Event) => tulisBaris('items', index, { description: (e.target as HTMLInputElement).value })" />
      </UiField>
    </article>
    <UiButton id="editor-rundown-add" tone="outline" class="justify-self-start" @click="tambahRundown">
      <Plus :size="16" aria-hidden="true" />
      Tambah bagian
    </UiButton>
  </div>

  <div v-else-if="section.type === 'dresscode'" class="grid gap-4 rounded-md border border-border bg-surface p-3.5">
    <fieldset class="grid gap-2 border-0 p-0">
      <legend class="mb-1 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-ink">Busana yang ditampilkan</legend>
      <div class="flex flex-wrap gap-x-5 gap-y-2">
        <label v-for="option in selectableAttire" :key="option.id" class="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.9375rem] text-ink">
          <input :id="`editor-dresscode-attire-${option.id}`" type="checkbox" class="h-4 w-4 accent-[var(--color-primary)]" :checked="attire.includes(option.id)" @change="toggleAttire(option.id, ($event.target as HTMLInputElement).checked)">
          {{ option.label }}
        </label>
      </div>
    </fieldset>
    <div class="grid gap-2">
      <p class="m-0 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-ink">Bundaran warna</p>
      <article v-for="(color, index) in rows('colors')" :key="index" class="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-end gap-2">
        <UiField :id="`editor-dresscode-color-${index + 1}`" v-slot="{ id }" label="Warna">
          <input :id="id" class="control" type="color" :value="String(color.hex || '#E8DCC8')" @change="(e: Event) => tulisBaris('colors', index, { hex: (e.target as HTMLInputElement).value })">
        </UiField>
        <UiField :id="`editor-dresscode-name-${index + 1}`" v-slot="{ id }" label="Nama warna">
          <UiInput :id="id" :model-value="String(color.name || '')" placeholder="Terakota" @change="(e: Event) => tulisBaris('colors', index, { name: (e.target as HTMLInputElement).value })" />
        </UiField>
        <button :id="`editor-dresscode-remove-${index + 1}`" type="button" class="grid h-12 w-10 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger" :aria-label="`Hapus warna ${index + 1}`" @click="hapusBaris('colors', index)">
          <Trash2 :size="16" aria-hidden="true" />
        </button>
      </article>
      <UiButton id="editor-dresscode-add" tone="outline" class="justify-self-start" @click="tambahWarna">
        <Plus :size="16" aria-hidden="true" />
        Tambah warna
      </UiButton>
    </div>
  </div>
</template>
