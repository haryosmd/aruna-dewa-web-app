<script setup lang="ts">
import { getCoreRowModel, useVueTable, type ColumnDef } from '@tanstack/vue-table'
import type { Guest, Invitation } from '~/types/aruna'
import { Clipboard, Link, Plus, Search, Trash2, Upload } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({ middleware: 'auth', layout: false })

type GuestResult = { items: Guest[]; total: number; page: number; pageSize: number }
type ImportPreview = {
  id: string
  source?: 'csv' | 'xlsx' | 'google-sheets'
  rows: { row: number; displayName: string; phone?: string; group?: string; quota?: number; errors: string[]; warnings: string[] }[]
  validCount: number
}

const route = useRoute()
const { request } = useApi()
const { build } = useGuestLink()

const invitation = ref<Invitation | null>(null)
const result = ref<GuestResult>({ items: [], total: 0, page: 1, pageSize: 20 })
const q = ref('')
const loading = ref(false)
const error = ref('')
const drafts = reactive<Record<string, string>>({})
const adding = ref(false)
const addOpen = ref(false)
const newName = ref('')
const previewText = ref('')
const preview = ref<ImportPreview | null>(null)
const importError = ref('')
const importing = ref(false)

let timer: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  error.value = ''
  try {
    const current = await request<GuestResult>(`/invitations/${route.params.id}/guests`, {
      query: { q: q.value || undefined, page: result.value.page },
    })
    result.value = current
    if (!invitation.value) invitation.value = await request<Invitation>(`/invitations/${route.params.id}`)
    current.items.forEach((guest) => { drafts[guest.id] = guest.displayName })
  } catch (cause) {
    error.value = (cause as { message: string }).message
  } finally {
    loading.value = false
  }
}
await load()

watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => { result.value.page = 1; load() }, 300)
})

async function save(guest: Guest) {
  const displayName = drafts[guest.id]?.trim() ?? guest.displayName
  if (displayName === guest.displayName) return guest
  const updated = await request<Guest>(`/invitations/${route.params.id}/guests/${guest.id}`, {
    method: 'PUT',
    body: { displayName, revision: guest.revision, phone: guest.phone, group: guest.group, quota: guest.quota },
  })
  const index = result.value.items.findIndex(item => item.id === guest.id)
  if (index >= 0) result.value.items[index] = updated
  drafts[guest.id] = updated.displayName
  return updated
}

async function copyLink(guest: Guest, personal = false) {
  try {
    const saved = await save(guest)
    const url = build(invitation.value!.slug, saved.displayName, personal ? saved.token : undefined)
    await navigator.clipboard.writeText(url)
    toast.success(`Tautan untuk ${saved.displayName} berhasil disalin`)
  } catch (cause) {
    toast.error((cause as { message: string }).message || 'Tautan tidak dapat disalin.')
  }
}

async function addGuest() {
  if (!newName.value.trim()) return
  adding.value = true
  try {
    await request(`/invitations/${route.params.id}/guests`, { method: 'POST', body: { displayName: newName.value, quota: 1 } })
    newName.value = ''
    addOpen.value = false
    toast.success('Tamu ditambahkan.')
    await load()
  } catch (cause) {
    error.value = (cause as { message: string }).message
  } finally {
    adding.value = false
  }
}

async function remove(guest: Guest) {
  if (!window.confirm(`Hapus ${guest.displayName}?`)) return
  try {
    await request(`/invitations/${route.params.id}/guests/${guest.id}`, { method: 'DELETE' })
    toast.success('Tamu dihapus.')
    await load()
  } catch (cause) {
    toast.error((cause as { message: string }).message)
  }
}

async function makePreview() {
  importError.value = ''
  preview.value = null
  try {
    preview.value = await request<ImportPreview>(`/invitations/${route.params.id}/imports/preview`, {
      method: 'POST',
      body: { text: previewText.value, format: previewText.value.includes('\t') ? 'tsv' : 'csv' },
    })
  } catch (cause) {
    importError.value = (cause as { message: string }).message
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
    preview.value = await request<ImportPreview>(`/invitations/${route.params.id}/imports/file-preview`, { method: 'POST', body: data })
  } catch (cause) {
    importError.value = (cause as { message: string }).message
  } finally {
    (event.target as HTMLInputElement).value = ''
  }
}

async function commitImport() {
  if (!preview.value) return
  importing.value = true
  try {
    const key = crypto.randomUUID()
    const outcome = await request<{ imported: number }>(`/invitations/${route.params.id}/imports/${preview.value.id}/commit`, {
      method: 'POST',
      body: { idempotencyKey: key },
    })
    toast.success(`${outcome.imported} tamu diimpor.`)
    preview.value = null
    previewText.value = ''
    await load()
  } catch (cause) {
    importError.value = (cause as { message: string }).message
  } finally {
    importing.value = false
  }
}

const columns: ColumnDef<Guest>[] = [
  { accessorKey: 'displayName' },
  { accessorKey: 'group' },
  { accessorKey: 'quota' },
  { accessorKey: 'rsvp' },
]
const table = useVueTable({ get data() { return result.value.items }, columns, getCoreRowModel: getCoreRowModel() })

const rsvpLabel = (guest: Guest) =>
  guest.rsvp?.attendance === 'yes' ? 'Hadir' : guest.rsvp?.attendance === 'no' ? 'Berhalangan' : 'Belum merespons'

/* Empat halaman dasbor sempat tidak punya `<title>` sama sekali — axe menandainya
   `document-title`, dan tab tamu berisi URL mentah. Reaktif karena undangannya
   dimuat setelah mount. */
useHead({ title: () => invitation.value?.title
  ? `Kelola tamu · ${invitation.value.title} — Aruna Dewa`
  : 'Kelola tamu — Aruna Dewa' })
</script>

<template>
  <DashboardShell
    v-if="invitation"
    :invitation-id="invitation.id"
    :title="invitation.title"
    eyebrow="Kelola tamu"
    heading="Daftar yang terasa personal."
  >
    <template #subheading>
      <p class="copy m-0">
        Setiap tamu punya tautan sendiri. Sunting namanya langsung di tabel, lalu salin tautannya.
      </p>
    </template>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="relative flex-1 basis-64">
        <label class="sr-only" for="guest-search">Cari tamu</label>
        <Search :size="17" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
        <input id="guest-search" v-model="q" class="control pl-10" placeholder="Cari nama atau grup">
      </div>

      <div class="relative">
        <UiButton :aria-expanded="addOpen" @click="addOpen = !addOpen">
          <Plus :size="17" aria-hidden="true" />
          Tambah tamu
        </UiButton>

        <form
          v-if="addOpen"
          class="card absolute right-0 z-10 mt-2 grid w-[min(20rem,90vw)] gap-3 p-4 shadow-float"
          @submit.prevent="addGuest"
        >
          <UiField v-slot="{ id }" label="Nama undangan" hint="Tulis lengkap dengan gelar bila ada.">
            <UiInput :id="id" v-model="newName" maxlength="200" required />
          </UiField>
          <UiButton type="submit" block :loading="adding">{{ adding ? 'Menyimpan…' : 'Simpan tamu' }}</UiButton>
        </form>
      </div>
    </div>

    <p v-if="error" class="notice m-0" role="alert">
      {{ error }}
      <button class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
    </p>

    <div class="card table-wrap">
      <table class="min-w-[43rem]">
        <thead>
          <tr>
            <th scope="col">Nama undangan</th>
            <th scope="col">Grup</th>
            <th scope="col">Kuota</th>
            <th scope="col">RSVP</th>
            <th scope="col"><span class="sr-only">Aksi</span></th>
          </tr>
        </thead>

        <tbody v-if="loading">
          <tr><td colspan="5" class="text-ink-muted">Memuat tamu…</td></tr>
        </tbody>

        <tbody v-else-if="!table.getRowModel().rows.length">
          <tr>
            <td colspan="5">
              <div class="grid min-h-40 place-content-center gap-1.5 text-center">
                <strong class="text-ink">{{ q ? 'Tamu tidak ditemukan.' : 'Belum ada tamu.' }}</strong>
                <span class="text-ink-muted">{{ q ? 'Coba kata kunci lain.' : 'Tambahkan manual atau impor dari spreadsheet.' }}</span>
              </div>
            </td>
          </tr>
        </tbody>

        <tbody v-else>
          <tr v-for="row in table.getRowModel().rows" :key="row.original.id" class="hover:bg-surface-2">
            <td>
              <label class="sr-only" :for="`guest-${row.original.id}`">Nama undangan</label>
              <input
                :id="`guest-${row.original.id}`"
                v-model="drafts[row.original.id]"
                maxlength="200"
                class="w-full min-w-48 rounded-sm border-0 border-b border-transparent bg-transparent px-1.5 py-1.5 focus:border-primary focus:outline-none"
              >
            </td>
            <td class="text-ink-muted">{{ row.original.group || 'Tidak dikelompokkan' }}</td>
            <td class="tabular-nums">{{ row.original.quota }}</td>
            <td>
              <UiBadge :tone="row.original.rsvp?.attendance === 'yes' ? 'sage' : row.original.rsvp?.attendance === 'no' ? 'neutral' : 'outline'">
                {{ rsvpLabel(row.original) }}
              </UiBadge>
            </td>
            <td>
              <div class="flex">
                <button
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-3 hover:text-primary"
                  :aria-label="`Salin tautan untuk ${row.original.displayName}`"
                  @click="copyLink(row.original)"
                >
                  <Link :size="17" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-3 hover:text-primary"
                  :aria-label="`Salin tautan RSVP personal untuk ${row.original.displayName}`"
                  @click="copyLink(row.original, true)"
                >
                  <Clipboard :size="17" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus ${row.original.displayName}`"
                  @click="remove(row.original)"
                >
                  <Trash2 :size="17" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 text-[0.9375rem] text-ink-muted">
      <span>{{ result.total }} tamu</span>
      <div class="flex items-center gap-3">
        <UiButton tone="outline" size="sm" :disabled="result.page <= 1" @click="result.page--; load()">Sebelumnya</UiButton>
        <span>Halaman {{ result.page }}</span>
        <UiButton tone="outline" size="sm" :disabled="result.items.length < result.pageSize" @click="result.page++; load()">Berikutnya</UiButton>
      </div>
    </div>

    <section class="card grid gap-5 p-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-8">
      <div class="grid content-start gap-2.5">
        <p class="eyebrow">Impor spreadsheet</p>
        <h2 class="m-0 font-display text-h2 font-semibold text-ink">Tinjau dulu, baru simpan.</h2>
        <p class="m-0 text-[0.9375rem] text-ink-muted">
          Tempel CSV atau TSV, atau pilih berkas CSV/XLSX maksimal 10 MB. Nama yang sama diberi peringatan
          dan tetap dibuat sebagai tamu terpisah.
        </p>
        <p class="m-0 text-caption text-ink-subtle">
          Impor Google Sheets memerlukan konfigurasi khusus dan belum aktif di lingkungan ini.
        </p>
      </div>

      <div class="grid gap-3">
        <label class="sr-only" for="import-text">Tempel data tamu</label>
        <textarea
          id="import-text"
          v-model="previewText"
          class="control font-mono text-[0.875rem]"
          rows="7"
          placeholder="Nama undangan&#9;Telepon&#9;Grup&#10;Yosi Susanti&#9;0812…&#9;Keluarga"
        />

        <div class="flex flex-wrap gap-2">
          <UiButton tone="outline" :disabled="!previewText.trim()" @click="makePreview">
            <Upload :size="17" aria-hidden="true" />
            Tinjau teks
          </UiButton>
          <label class="button button-secondary cursor-pointer">
            Pilih CSV atau XLSX
            <input class="sr-only" type="file" accept=".csv,.xlsx" @change="previewFile">
          </label>
        </div>

        <p v-if="importError" class="error" role="alert">{{ importError }}</p>

        <div v-if="preview" class="grid gap-3 rounded-md border border-gold/40 bg-gold-soft p-4">
          <p class="m-0 text-[0.9375rem]">
            <strong class="text-ink">{{ preview.validCount }} baris siap diimpor.</strong>
            {{ preview.rows.length - preview.validCount }} baris perlu perhatian.
          </p>
          <ul class="m-0 grid list-disc gap-1.5 pl-5 text-[0.875rem] text-ink-muted">
            <li v-for="row in preview.rows.slice(0, 10)" :key="row.row">
              <strong>Baris {{ row.row }}:</strong> {{ row.displayName || 'Nama kosong' }}
              <span v-if="row.errors.length" class="text-danger">— {{ row.errors.join(', ') }}</span>
              <span v-else-if="row.warnings.length">— {{ row.warnings.join(', ') }}</span>
            </li>
          </ul>
          <UiButton class="justify-self-start" :disabled="importing || preview.validCount === 0" :loading="importing" @click="commitImport">
            {{ importing ? 'Mengimpor…' : 'Konfirmasi impor' }}
          </UiButton>
        </div>
      </div>
    </section>
  </DashboardShell>
</template>
