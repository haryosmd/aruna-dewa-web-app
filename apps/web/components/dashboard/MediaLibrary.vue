<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { Check, CloudUpload, Crop, Images, Search, Trash2, X } from 'lucide-vue-next'
import { formatBytes, mediaRules } from '@aruna/contracts'
import type { MediaUploadResult } from '@aruna/contracts/api'

/**
 * Modal "Pustaka Saya" (fase 72.8), persis referensi: header ikon + judul + sub "Foto & gambar
 * undangan" + pencarian nama, dropzone hijau putus-putus "Upload Foto / Gambar Baru", grid empat
 * kolom kartu (thumbnail, nama berkas, tanggal, "✓ Pilih", hapus), kartu terpilih berbingkai.
 *
 * Dialog reka-ui, alasan yang sama dengan Studio Ornamen: focus trap dan kunci scroll mahal kalau
 * ditulis tangan. Daftar aset diminta saat dialog dibuka, bukan saat halaman dimuat.
 */
const props = defineProps<{ invitationId: string }>()

const { state, selesai } = useMediaLibrary()
const { listMedia, deleteMedia } = useInvitations()
const unggah = useMediaUploads(() => props.invitationId)
const { confirm } = usePopup()

const daftar = ref<MediaUploadResult[]>([])
const memuat = ref(false)
const galat = ref('')
const query = ref('')
const terpilih = ref<string[]>([])
const input = ref<HTMLInputElement | null>(null)

const jenis = computed(() => state.value.request.kind ?? 'image')
const multiple = computed(() => Boolean(state.value.request.multiple))
const sisa = computed(() => state.value.request.remaining)

watch(() => state.value.open, async (open) => {
  if (!open) return
  terpilih.value = []
  query.value = ''
  await muat()
})

async function muat() {
  memuat.value = true
  galat.value = ''
  try { daftar.value = await listMedia(props.invitationId, jenis.value) }
  catch (cause) { galat.value = apiErrorMessage(cause) }
  finally { memuat.value = false }
}

const namaBerkas = (item: MediaUploadResult) => (item as { originalName?: string }).originalName || item.publicUrl.split('/').pop() || 'berkas'
const tanggal = (item: MediaUploadResult) => {
  const raw = (item as { createdAt?: string }).createdAt
  if (!raw) return ''
  return new Date(raw).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const tersaring = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return daftar.value
  return daftar.value.filter(item => namaBerkas(item).toLowerCase().includes(needle))
})

function pilih(item: MediaUploadResult) {
  if (!multiple.value) { selesai([item.publicUrl]); return }
  const url = item.publicUrl
  if (terpilih.value.includes(url)) { terpilih.value = terpilih.value.filter(u => u !== url); return }
  if (sisa.value !== undefined && terpilih.value.length >= sisa.value) return
  terpilih.value = [...terpilih.value, url]
}

async function onFiles(files: File[]) {
  const hasil = await unggah.uploadDetailed(files, jenis.value)
  if (!hasil.length) return
  daftar.value = [...hasil, ...daftar.value]
  // Unggahan tunggal langsung terpilih — itulah yang diinginkan orang yang baru saja memilih berkas.
  if (!multiple.value && hasil.length === 1) selesai([hasil[0]!.publicUrl])
}

function onChange(event: Event) {
  const element = event.target as HTMLInputElement
  onFiles(Array.from(element.files ?? []))
  element.value = ''
}

/*
 * Pangkas (fase 74.6). Hasilnya diunggah sebagai aset BARU lewat `useMediaUploads` yang sudah
 * ada, lalu diselipkan ke depan daftar — aslinya tidak pernah ditimpa, jadi bagian undangan
 * yang masih memakai URL lama tidak berubah diam-diam, dan pangkasan yang terlalu dalam bisa
 * diulang dari fotonya yang utuh.
 */
const pangkas = ref<MediaUploadResult | null>(null)
const pangkasTerbuka = ref(false)

function bukaPangkas(item: MediaUploadResult) {
  pangkas.value = item
  pangkasTerbuka.value = true
}

async function simpanPangkas(file: File) {
  const hasil = await unggah.uploadDetailed([file], 'image')
  if (!hasil.length) return
  daftar.value = [...hasil, ...daftar.value]
  // Sengaja TIDAK memanggil `selesai()`: pasangan yang memangkas belum tentu langsung memilih,
  // dan menutup pustaka di bawah kakinya akan terasa seperti dialognya kabur.
}

async function hapus(item: MediaUploadResult) {
  const jawaban = await confirm({
    title: 'Hapus berkas ini dari pustaka?',
    description: 'Bagian undangan yang masih memakainya akan kehilangan gambarnya.',
    tone: 'danger',
    actions: [{ id: 'batal', label: 'Batal', tone: 'outline' }, { id: 'hapus', label: 'Ya, hapus', tone: 'ink' }],
    dismissId: 'batal',
  })
  if (jawaban !== 'hapus') return
  try {
    await deleteMedia(props.invitationId, item.id)
    daftar.value = daftar.value.filter(entry => entry.id !== item.id)
    terpilih.value = terpilih.value.filter(url => url !== item.publicUrl)
  } catch (cause) {
    galat.value = apiErrorMessage(cause)
  }
}

const rules = computed(() => mediaRules[jenis.value])
</script>

<template>
  <DialogRoot :open="state.open" @update:open="terbuka => { if (!terbuka) selesai(null) }">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[var(--z-modal)] bg-ink/40 backdrop-blur-sm" />
      <DialogContent
        id="media-library"
        class="fixed inset-x-3 top-[4svh] z-[var(--z-modal)] mx-auto flex max-h-[92svh] w-auto max-w-5xl flex-col overflow-hidden rounded-xl bg-surface shadow-float focus:outline-none"
      >
        <header class="flex items-center gap-3 border-b border-border px-5 py-4">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary" aria-hidden="true">
            <Images :size="20" />
          </span>
          <div class="grid min-w-0 flex-1 gap-0.5">
            <DialogTitle class="m-0 text-body-lg font-semibold text-ink">Pustaka Saya</DialogTitle>
            <DialogDescription class="m-0 truncate text-caption text-ink-muted">
              {{ state.request.judul || (jenis === 'audio' ? 'Musik undangan' : 'Foto & gambar undangan') }}
            </DialogDescription>
          </div>
          <label class="relative hidden sm:block">
            <span class="sr-only">Cari nama berkas</span>
            <Search :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
            <input
              id="media-library-search"
              v-model="query"
              type="search"
              placeholder="Cari nama foto..."
              class="min-h-11 w-56 rounded-md border border-border-input bg-surface pl-9 pr-3 text-ui text-ink placeholder:text-ink-subtle/80 focus:border-primary focus:outline-none"
            >
          </label>
          <DialogClose id="media-library-close" class="grid h-11 w-11 place-items-center rounded-md text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label="Tutup pustaka">
            <X :size="18" aria-hidden="true" />
          </DialogClose>
        </header>

        <div class="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5">
          <label
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-dashed border-primary/50 bg-primary-soft/40 px-4 py-3.5"
          >
            <span class="flex items-center gap-3">
              <span class="grid h-10 w-10 place-items-center rounded-md bg-surface text-primary" aria-hidden="true">
                <CloudUpload :size="20" />
              </span>
              <span class="grid gap-0.5">
                <span class="text-ui-lg font-semibold text-ink">{{ jenis === 'audio' ? 'Upload Musik Baru' : 'Upload Foto / Gambar Baru' }}</span>
                <span class="text-caption text-ink-muted">Format: {{ rules.label }} (Maks. {{ formatBytes(rules.maxBytes) }} per file)</span>
              </span>
            </span>
            <span class="button button-primary">
              + {{ jenis === 'audio' ? 'Upload Musik' : 'Upload Foto Baru' }}
            </span>
            <input
              id="media-library-upload"
              ref="input"
              type="file"
              class="sr-only"
              :accept="[...rules.mimeTypes, ...rules.extensions].join(',')"
              :multiple="multiple"
              :disabled="unggah.pending.value"
              @change="onChange"
            >
          </label>

          <p v-if="unggah.pending.value" class="m-0 text-caption text-ink-muted" aria-live="polite">
            Mengunggah {{ unggah.done.value + 1 }} dari {{ unggah.total.value }}…
          </p>
          <ul v-if="unggah.failures.value.length" role="alert" class="m-0 grid gap-1 p-0 list-none">
            <li v-for="message in unggah.failures.value" :key="message" class="text-caption font-medium text-danger">{{ message }}</li>
          </ul>
          <p v-if="galat" class="notice m-0" role="alert">{{ galat }}</p>

          <p v-if="memuat" class="m-0 text-ink-muted">Memuat pustaka…</p>
          <div v-else-if="!tersaring.length" class="grid justify-items-center gap-2 py-10 text-center">
            <Images :size="36" class="text-ink-subtle" aria-hidden="true" />
            <p class="m-0 font-semibold text-ink">{{ query ? 'Tidak ada berkas dengan nama itu' : 'Belum ada foto / gambar' }}</p>
            <p class="m-0 text-caption text-ink-muted">Klik tombol "Upload Foto Baru" di atas untuk menambahkan.</p>
          </div>
          <ul v-else class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
            <li
              v-for="item in tersaring"
              :key="item.id"
              :class="cn('grid gap-2 rounded-lg border bg-surface p-2 transition-colors duration-200', terpilih.includes(item.publicUrl) ? 'border-primary shadow-lift' : 'border-border')"
            >
              <img v-if="jenis === 'image'" :src="item.publicUrl" alt="" class="aspect-[4/3] w-full rounded-md object-cover" loading="lazy">
              <div v-else class="grid aspect-[4/3] place-items-center rounded-md bg-surface-2 text-ink-muted">MP3</div>
              <div class="grid gap-0.5 px-1">
                <p class="m-0 truncate text-ui font-semibold text-ink" :title="namaBerkas(item)">{{ namaBerkas(item) }}</p>
                <p class="m-0 text-caption text-ink-subtle">{{ tanggal(item) }}</p>
              </div>
              <div class="flex items-center gap-1.5">
                <UiButton :id="`media-library-pilih-${item.id}`" size="sm" class="flex-1" :tone="terpilih.includes(item.publicUrl) ? 'primary' : 'primary'" @click="pilih(item)">
                  <Check :size="15" aria-hidden="true" />
                  {{ terpilih.includes(item.publicUrl) ? 'Dipilih' : 'Pilih' }}
                </UiButton>
                <button
                  v-if="jenis === 'image'"
                  :id="`media-library-pangkas-${item.id}`"
                  type="button"
                  class="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border text-ink-subtle hover:bg-surface-3 hover:text-ink"
                  :aria-label="`Pangkas ${namaBerkas(item)}`"
                  @click="bukaPangkas(item)"
                >
                  <Crop :size="15" aria-hidden="true" />
                </button>
                <button
                  :id="`media-library-hapus-${item.id}`"
                  type="button"
                  class="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus ${namaBerkas(item)}`"
                  @click="hapus(item)"
                >
                  <Trash2 :size="15" aria-hidden="true" />
                </button>
              </div>
            </li>
          </ul>
        </div>

        <footer v-if="multiple" class="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p class="m-0 text-caption text-ink-muted" aria-live="polite">
            {{ terpilih.length }} dipilih<span v-if="sisa !== undefined"> · sisa kuota {{ sisa }}</span>
          </p>
          <UiButton id="media-library-selesai" :disabled="!terpilih.length" @click="selesai(terpilih)">
            Pakai {{ terpilih.length || '' }} foto
          </UiButton>
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>

  <!--
    Dialog kedua, bersaudara dengan yang di atas dan bukan anaknya: reka-ui menutup induknya
    saat anaknya ditutup, jadi memangkas satu foto akan ikut menutup Pustaka Saya.
  -->
  <DashboardMediaCropper
    v-if="pangkas"
    v-model:open="pangkasTerbuka"
    :src="pangkas.publicUrl"
    :nama="namaBerkas(pangkas)"
    @simpan="simpanPangkas"
  />
</template>
