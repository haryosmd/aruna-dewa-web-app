<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import type { ImportPreviewResult } from '@aruna/contracts/api'
import { Sheet, Upload, X } from 'lucide-vue-next'

/**
 * Alur impor yang sudah ada (tinjau dulu, baru simpan), dipindah dari badan halaman ke dialog
 * dengan dua pintu masuk sesuai referensi: "Import Excel / CSV" (berkas) dan "Tempel Teks".
 * Jalur API-nya tidak berubah: preview → daftar baris → commit dengan idempotency key.
 */
const props = defineProps<{
  open: boolean
  mode: 'file' | 'text'
  invitationId: string
}>()
const emit = defineEmits<{ 'update:open': [boolean]; imported: [number] }>()

const toast = useToast()
const guestsApi = useGuests()

const previewText = ref('')
const preview = ref<ImportPreviewResult | null>(null)
const importError = ref('')
const importing = ref(false)

watch(() => props.open, (open) => { if (open) { preview.value = null; importError.value = ''; previewText.value = '' } })

async function makePreview() {
  importError.value = ''
  preview.value = null
  try {
    preview.value = await guestsApi.previewText(props.invitationId, { text: previewText.value, format: previewText.value.includes('\t') ? 'tsv' : 'csv' })
  } catch (cause) {
    importError.value = apiErrorMessage(cause)
  }
}

async function previewFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importError.value = ''
  preview.value = null
  try {
    const data = new FormData()
    data.append('file', file)
    preview.value = await guestsApi.previewFile(props.invitationId, data)
  } catch (cause) {
    importError.value = apiErrorMessage(cause)
  } finally {
    (event.target as HTMLInputElement).value = ''
  }
}

const picker = useGoogleSheetPicker()
const memilihSheet = ref(false)

/**
 * Impor langsung dari Google Sheets. Tombolnya hanya ada kalau kuncinya dikonfigurasi — lihat
 * `useGoogleSheetPicker`. Sesudah pratinjau datang, alurnya menyatu dengan dua pintu lain:
 * tinjau dulu, baru commit dengan idempotency key.
 */
async function previewSheet() {
  importError.value = ''
  preview.value = null
  memilihSheet.value = true
  try {
    const dipilih = await picker.pilih()
    if (!dipilih) return // ditutup tanpa memilih — bukan galat
    preview.value = await guestsApi.previewGoogleSheet(props.invitationId, dipilih)
  } catch (cause) {
    importError.value = cause instanceof Error ? cause.message : apiErrorMessage(cause)
  } finally {
    memilihSheet.value = false
  }
}

async function commitImport() {
  if (!preview.value) return
  importing.value = true
  try {
    const outcome = await guestsApi.commitImport(props.invitationId, preview.value.id, crypto.randomUUID())
    toast.success(`${outcome.imported} tamu diimpor.`)
    emit('imported', outcome.imported)
    emit('update:open', false)
  } catch (cause) {
    importError.value = apiErrorMessage(cause)
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="value => emit('update:open', value)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[var(--z-overlay)] bg-ink/45 backdrop-blur-sm" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-[var(--z-modal)] grid max-h-[calc(100svh-2rem)] w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl bg-surface p-6 shadow-[var(--shadow-veil)] focus:outline-none"
        @escape-key-down="emit('update:open', false)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="grid gap-1">
            <DialogTitle class="m-0 font-display text-h3 font-semibold text-ink">{{ mode === 'file' ? 'Import Excel / CSV' : 'Tempel teks' }}</DialogTitle>
            <DialogDescription class="m-0 text-caption text-ink-muted">
              Tinjau dulu, baru simpan. Kolom: nama, nomor WA, kategori, kuota, dari, anak, jenis undangan, catatan — hanya nama yang wajib.
              Lembar berspanduk dan berbaris petunjuk boleh diunggah apa adanya; barisnya dicari sendiri. Nama yang sama diberi peringatan dan tetap dibuat sebagai tamu terpisah.
            </DialogDescription>
          </div>
          <DialogClose id="guest-import-close" class="grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink" aria-label="Tutup">
            <X :size="18" aria-hidden="true" />
          </DialogClose>
        </div>

        <div v-if="mode === 'text'" class="grid gap-3">
          <label class="sr-only" for="guest-import-text">Tempel data tamu</label>
          <textarea
            id="guest-import-text"
            v-model="previewText"
            class="control font-mono text-ui"
            rows="7"
            placeholder="Nama undangan&#9;Telepon&#9;Kategori&#10;Yosi Susanti&#9;0812…&#9;Keluarga"
          />
          <UiButton id="guest-import-preview-text" tone="outline" class="justify-self-start" :disabled="!previewText.trim()" @click="makePreview">
            <Upload :size="17" aria-hidden="true" />
            Tinjau teks
          </UiButton>
        </div>

        <div v-else class="grid gap-3">
          <label class="button button-secondary cursor-pointer justify-self-start">
            <Upload :size="17" aria-hidden="true" />
            Pilih berkas CSV atau XLSX
            <input id="guest-import-file" class="sr-only" type="file" accept=".csv,.xlsx" @change="previewFile">
          </label>
          <UiButton v-if="picker.tersedia.value" id="guest-import-sheets" tone="outline" class="justify-self-start" :loading="memilihSheet" @click="previewSheet">
            <Sheet :size="17" aria-hidden="true" />
            Ambil dari Google Sheets
          </UiButton>
          <p class="m-0 text-caption text-ink-subtle">
            Maksimal 10 MB.
            <template v-if="picker.tersedia.value">Google Sheets membaca hanya berkas yang kalian pilih sendiri.</template>
            <template v-else>Impor Google Sheets memerlukan konfigurasi khusus dan belum aktif di lingkungan ini.</template>
          </p>
        </div>

        <p v-if="importError" class="error m-0" role="alert">{{ importError }}</p>

        <div v-if="preview" class="grid gap-3 rounded-md border border-gold/40 bg-gold-soft p-4">
          <p class="m-0 text-ui-lg">
            <strong class="text-ink">{{ preview.validCount }} baris siap diimpor.</strong>
            {{ preview.rows.length - preview.validCount }} baris perlu perhatian.
          </p>
          <ul class="m-0 grid list-disc gap-1.5 pl-5 text-ui text-ink-muted">
            <li v-for="row in preview.rows.slice(0, 10)" :key="row.row">
              <strong>Baris {{ row.row }}:</strong> {{ row.displayName || 'Nama kosong' }}
              <span v-if="row.errors.length" class="text-danger">— {{ row.errors.join(', ') }}</span>
              <span v-else-if="row.warnings.length">— {{ row.warnings.join(', ') }}</span>
            </li>
          </ul>
          <UiButton id="guest-import-commit" class="justify-self-start" :disabled="importing || preview.validCount === 0" :loading="importing" @click="commitImport">
            {{ importing ? 'Mengimpor…' : 'Konfirmasi impor' }}
          </UiButton>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
