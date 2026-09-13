<script setup lang="ts">
import { canEditDesign as designUnlocked, createDefaultDocument, designFeatureId, giftAccountLimit, invitationDocumentSchema, normalizeGift, selectableFonts, type FontChoice, type TemplateId } from '@aruna/contracts'
import {
  selectableAttire, selectableCoverLayouts, selectableGalleryMotions, selectableVenues,
  toAttire, toCoverLayout, toGalleryMotion,
} from '~/utils/invitation-options'
import { selectableIntensities, toIntensity } from '~/utils/ornaments'
import type { Catalog, Invitation, InvitationDocument } from '~/types/aruna'
import { AlertCircle, ArrowDown, ArrowUp, Check, Eye, Lock, Plus, Redo2, RotateCcw, Save, Send, Trash2, Undo2, Upload, Wand2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({ middleware: 'auth', layout: false })

const route = useRoute()
const { request } = useApi()
const auth = useAuthStore()
const { label: featureLabel } = useFeatureLabels()

const invitation = ref<Invitation | null>(null)
const document = ref<InvitationDocument>(createDefaultDocument())
const revision = ref(0)
const selectedId = ref('cover')
const loading = ref(true)
const saving = ref(false)
const publishing = ref(false)
const error = ref('')
const conflict = ref(false)
const mobilePanel = ref<'settings' | 'preview'>('settings')
const galleryUrl = ref('')
const uploadPending = ref(false)
const watchReady = ref(false)
const designAddon = ref<{ name: string; price: number } | null>(null)
const undoStack = ref<InvitationDocument[]>([])
const redoStack = ref<InvitationDocument[]>([])

let autosaveTimer: ReturnType<typeof setTimeout> | undefined

const selected = computed(() => document.value.sections.find(section => section.id === selectedId.value) ?? document.value.sections[0])

const sectionLabels: Record<string, string> = {
  cover: 'Cover pembuka', couple: 'Mempelai', events: 'Acara', countdown: 'Hitung mundur',
  gallery: 'Galeri', story: 'Cerita cinta', rundown: 'Rundown', dresscode: 'Dresscode',
  video: 'Video & live stream', gift: 'Hadiah', rsvp: 'RSVP', wishes: 'Ucapan',
  closing: 'Penutup', music: 'Musik',
}
const fieldLabels: Record<string, string> = {
  title: 'Judul', subtitle: 'Subjudul', image: 'URL foto', partner1: 'Nama pasangan 1',
  partner2: 'Nama pasangan 2', description: 'Deskripsi', text: 'Teks', date: 'Tanggal',
  bank: 'Nama bank', account: 'Nomor rekening', holder: 'Atas nama', address: 'Alamat',
  note: 'Kalimat pengantar',
  url: 'URL', deadline: 'Batas konfirmasi',
}
const label = (key: string) => fieldLabels[key] ?? key

/* ── Kunci desain ───────────────────────────────────────────────── */

/**
 * Aturan yang sama dengan penjaga di `saveDraft`, diambil dari paket contracts supaya
 * keduanya tidak bisa menyimpang. Sebelumnya kontrol warna, font, dan panah urutan selalu
 * hidup: pasangan menggesernya, pratinjau ikut berubah, lalu autosave gagal dengan pesan
 * yang tidak menunjuk kontrol mana pun.
 */
const canEditDesign = computed(() => designUnlocked({
  isOperator: auth.isOperator,
  features: invitation.value?.features ?? [],
}))

/** Nama dan harga add-on diambil dari katalog, bukan ditulis ulang di sini. */
async function loadDesignAddon() {
  if (canEditDesign.value || designAddon.value) return
  try {
    const catalog = await request<Catalog>('/catalog')
    designAddon.value = catalog.addons.find(addon => addon.id === designFeatureId) ?? null
  } catch {
    // Harga hanya pelengkap; panel tetap menjelaskan kuncinya tanpa katalog.
    designAddon.value = null
  }
}

async function load() {
  loading.value = true
  error.value = ''
  watchReady.value = false
  try {
    const result = await request<Invitation>(`/invitations/${route.params.id}`)
    invitation.value = result
    document.value = result.document ?? createDefaultDocument()
    revision.value = result.revision ?? 0
    selectedId.value = document.value.sections[0]?.id ?? 'cover'
    conflict.value = false
    undoStack.value = []
    redoStack.value = []
    // Ditunggu, bukan dilepas: `load()` ikut jalan saat SSR, dan promise yang dilepas
    // di sana selesai setelah HTML terkirim — harganya tidak pernah sampai ke klien.
    await loadDesignAddon()
  } catch (cause) {
    error.value = (cause as { message: string }).message
  } finally {
    loading.value = false
    nextTick(() => { watchReady.value = true })
  }
}
await load()

function checkpoint() {
  undoStack.value.push(structuredClone(toRaw(document.value)))
  if (undoStack.value.length > 30) undoStack.value.shift()
  redoStack.value = []
}

function updateValue(key: string, value: string) {
  const section = selected.value
  if (!section) return
  checkpoint()
  section.data[key] = value
}

function move(index: number, direction: -1 | 1) {
  if (!canEditDesign.value) return
  const next = index + direction
  if (next < 0 || next >= document.value.sections.length) return
  checkpoint()
  const copy = document.value.sections.slice()
  ;[copy[index], copy[next]] = [copy[next]!, copy[index]!]
  document.value.sections = copy
}

/** Swapping template also swaps the curated palette, unless the couple already recoloured it. */
function applyTemplate(id: TemplateId) {
  if (!canEditDesign.value) return
  const preset = invitationThemes.find(theme => theme.id === id)
  if (!preset) return
  checkpoint()
  document.value.templateId = id
  document.value.tokens = { ...preset.tokens }
}

// Halaman ini satu-satunya di web yang tidak pernah menyetel judul, jadi tab-nya
// menampilkan URL mentah dan axe melaporkan `document-title`.
useHead({ title: () => `${invitation.value?.title ?? 'Editor undangan'} — Aruna Dewa` })

/* ── Penjaga keterbacaan palet ──────────────────────────────────────────────── */

/**
 * Empat pasangan yang sama dengan audit tema di DESIGN.md, dihitung ulang setiap kali
 * pasangan menggeser color picker. Peringatannya hidup terus supaya mereka melihat
 * akibatnya saat memilih, bukan setelah undangan terlanjur dibagikan ke tamu.
 */
const paletteChecks = computed(() => checkPalette(document.value.tokens))
const paletteIssues = computed(() => paletteChecks.value.filter(check => !check.passes))

function repairPaletteColors() {
  if (!canEditDesign.value) return
  checkpoint()
  document.value.tokens = { ...document.value.tokens, ...repairPalette(document.value.tokens) }
  const remaining = paletteIssues.value.length
  if (remaining) {
    // Latar yang sangat gelap membuat aksen dan tinta tombol saling tarik; jujur saja.
    toast.warning('Warna sudah didekatkan sebisanya. Latar yang sangat gelap masih menyisakan pasangan yang kurang terbaca — coba latar yang lebih terang.')
    return
  }
  toast.success('Warna disetel ke versi terdekat yang terbaca.')
}

async function save(silent = false) {
  error.value = ''
  conflict.value = false
  const parsed = invitationDocumentSchema.safeParse(document.value)
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Rancangan belum valid.'
    return
  }
  saving.value = true
  try {
    const result = await request<{ document: InvitationDocument; revision: number }>(`/invitations/${route.params.id}/draft`, {
      method: 'PUT',
      body: { document: parsed.data, revision: revision.value },
    })
    document.value = result.document
    revision.value = result.revision
    if (!silent) toast.success('Draft tersimpan.')
  } catch (cause) {
    const apiError = cause as { code?: string; message: string }
    conflict.value = apiError.code === 'CONFLICT' || apiError.code === 'REVISION_CONFLICT'
    error.value = apiError.message
  } finally {
    saving.value = false
  }
}

async function publish() {
  // Draft boleh disimpan dengan warna apa pun — pasangan sering berhenti di tengah
  // penyetelan. Yang tidak boleh adalah versi publik yang tak terbaca oleh tamu.
  if (paletteIssues.value.length) {
    error.value = `Warna undangan belum memenuhi ambang keterbacaan (${paletteIssues.value.length} dari 4 pasangan). Perbaiki di panel Tema & warna sebelum menerbitkan.`
    toast.error('Perbaiki kontras warna dulu sebelum menerbitkan.')
    return
  }
  await save()
  if (error.value) return
  publishing.value = true
  try {
    await request(`/invitations/${route.params.id}/publish`, { method: 'POST' })
    toast.success('Versi publik diperbarui.')
    await load()
  } catch (cause) {
    error.value = (cause as { message: string }).message
    toast.error(error.value)
  } finally {
    publishing.value = false
  }
}

function reset() {
  if (!window.confirm('Kembalikan seluruh draft ke preset awal? Perubahan belum tersimpan akan hilang.')) return
  checkpoint()
  document.value = createDefaultDocument('Aruna', 'Dewa', document.value.templateId)
  toast.message('Preset dimuat kembali. Simpan untuk menerapkannya.')
}

/**
 * Key yang punya himpunan nilai tertutup.
 *
 * Fallback `textFields` di bawah merender kotak teks untuk **setiap** key bernilai string.
 * Tanpa daftar ini, pasangan akan melihat kolom bebas bertuliskan `arch-potret` dan bisa
 * mengetik apa saja ke dalamnya — `section.data` adalah `z.record(z.unknown())` dan tidak
 * divalidasi zod, jadi nilai ngawur akan tersimpan dengan senang hati dan section-nya
 * diam-diam jatuh ke bawaan.
 */
const enumKeys = new Set(['layout', 'ornamentIntensity', 'motion', 'venueIllustration'])

const textFields = computed(() => {
  const data = selected.value?.data ?? {}
  return Object.entries(data)
    .filter(([key, value]) => typeof value === 'string' && !enumKeys.has(key)) as [string, string][]
})

/* ── Pilihan berbentuk enum ─────────────────────────────────────────────────── */
function writeOption(key: string, value: string) {
  const section = selected.value
  if (!section) return
  checkpoint()
  section.data[key] = value
}

const coverLayout = computed(() => toCoverLayout(selected.value?.data.layout))
const coverIntensity = computed(() => toIntensity(selected.value?.data.ornamentIntensity))
const galleryMotion = computed(() => toGalleryMotion(selected.value?.data.motion))
const venueIllustration = computed(() => String(selected.value?.data.venueIllustration ?? ''))

/* ── Dresscode ──────────────────────────────────────────────────────────────── */
const attire = computed(() => toAttire(selected.value?.data.attire))

function toggleAttire(id: string, on: boolean) {
  const section = selected.value
  if (!section) return
  checkpoint()
  const current = attire.value.filter(item => item !== id)
  section.data.attire = on ? [...current, id] : current
}

const dresscodeColors = computed(() =>
  (selected.value?.type === 'dresscode' && Array.isArray(selected.value.data.colors)
    ? (selected.value.data.colors as Record<string, unknown>[])
    : []))

function addColor() {
  const section = selected.value
  if (!section) return
  checkpoint()
  if (!Array.isArray(section.data.colors)) section.data.colors = []
  ;(section.data.colors as Record<string, unknown>[]).push({ hex: '#E8DCC8', name: '' })
}

/* ── Cerita kami ────────────────────────────────────────────────────────────── */
const storySteps = computed(() =>
  (selected.value?.type === 'story' && Array.isArray(selected.value.data.steps)
    ? (selected.value.data.steps as Record<string, unknown>[])
    : []))

function addStoryStep() {
  const section = selected.value
  if (!section) return
  checkpoint()
  if (!Array.isArray(section.data.steps)) section.data.steps = []
  const steps = section.data.steps as Record<string, unknown>[]
  steps.push({
    id: crypto.randomUUID(),
    title: '',
    text: '',
    // Dinamai `image`, bukan `foto`: `assertSafeUrls` di API hanya memeriksa key yang
    // berakhiran url/urls/image/images, jadi nama lain akan lolos tanpa diperiksa.
    image: '',
    side: steps.length % 2 === 0 ? 'kiri' : 'kanan',
  })
}
const eventRows = computed(() => (selected.value?.type === 'events' && Array.isArray(selected.value.data.events) ? (selected.value.data.events as Record<string, unknown>[]) : []))
const galleryImages = computed(() => (selected.value?.type === 'gallery' && Array.isArray(selected.value.data.images) ? (selected.value.data.images as string[]) : []))
const rundownRows = computed(() => (selected.value?.type === 'rundown' && Array.isArray(selected.value.data.items) ? (selected.value.data.items as Record<string, unknown>[]) : []))

const giftAccounts = computed(() => (selected.value?.type === 'gift' && Array.isArray(selected.value.data.accounts) ? (selected.value.data.accounts as Record<string, unknown>[]) : []))

/**
 * Bentuk data hadiah yang lama (satu rekening datar) diterjemahkan saat pasangan
 * membuka section-nya. Dokumen yang tidak pernah disentuh tetap dibaca renderer lewat
 * `normalizeGift`, jadi tidak ada migrasi basis data yang diperlukan.
 */
watch(selected, (section) => {
  if (!section || section.type !== 'gift' || Array.isArray(section.data.accounts)) return
  checkpoint()
  const { title, note, address, accounts } = normalizeGift(section.data)
  section.data = { title, note, address, accounts: accounts as unknown as Record<string, unknown>[] }
}, { immediate: true })

function addGiftAccount() {
  if (giftAccounts.value.length >= giftAccountLimit) return
  checkpoint()
  giftAccounts.value.push({
    id: crypto.randomUUID(),
    bankId: 'bca',
    bankLabel: '',
    number: '',
    holder: '',
    owner: '',
  })
}

/**
 * "Lokasi sama" sengaja tidak disimpan di dokumen. `data` tidak tervalidasi sehingga
 * sebuah flag tidak pernah bisa ditegakkan, dan dokumen yang sudah terbit lebih murah
 * kalau selalu lengkap. Nilai awalnya diturunkan dari datanya sendiri.
 */
const sameVenueKeys = ['venue', 'address', 'mapUrl'] as const
const sameVenue = ref(false)
watch(eventRows, (rows) => {
  if (rows.length < 2) { sameVenue.value = false; return }
  const first = rows[0]!
  sameVenue.value = rows.slice(1).every(row => sameVenueKeys.every(key => String(row[key] ?? '').trim() === String(first[key] ?? '').trim()))
}, { immediate: true, deep: false })

/** Acara pertama menjadi sumber; sisanya mengikuti selama kotaknya masih tercentang. */
function writeVenue(index: number, key: (typeof sameVenueKeys)[number], value: string) {
  const rows = eventRows.value
  const row = rows[index]
  if (!row) return
  row[key] = value
  if (!sameVenue.value) return
  if (index === 0) {
    for (const other of rows.slice(1)) other[key] = value
  } else {
    // Mengubah acara kedua berarti lokasinya memang berbeda. Lepaskan tautannya,
    // jangan menimpa apa pun.
    sameVenue.value = false
  }
}

function toggleSameVenue(next: boolean) {
  sameVenue.value = next
  if (!next) return
  checkpoint()
  const rows = eventRows.value
  const first = rows[0]
  if (!first) return
  for (const other of rows.slice(1)) for (const key of sameVenueKeys) other[key] = first[key] ?? ''
}

function addEvent() {
  checkpoint()
  const first = eventRows.value[0]
  const shared = sameVenue.value && first
    ? { venue: first.venue ?? '', address: first.address ?? '', mapUrl: first.mapUrl ?? '' }
    : { venue: '', address: '', mapUrl: '' }
  eventRows.value.push({ id: crypto.randomUUID(), name: 'Acara', date: '', time: '', ...shared, public: true })
}
function addRundown() {
  checkpoint()
  rundownRows.value.push({ id: crypto.randomUUID(), time: '', title: '', description: '' })
}
function removeRow(rows: unknown[], index: number) {
  checkpoint()
  rows.splice(index, 1)
}
function addGalleryUrl() {
  if (!galleryUrl.value.trim()) return
  checkpoint()
  galleryImages.value.push(galleryUrl.value.trim())
  galleryUrl.value = ''
}

async function uploadMedia(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !selected.value || selected.value.type !== 'gallery') return
  if (galleryImages.value.length >= 15) {
    error.value = 'Galeri maksimal berisi 15 foto.'
    return
  }
  uploadPending.value = true
  try {
    const data = new FormData()
    data.append('file', file)
    const result = await request<{ publicUrl: string }>(`/invitations/${route.params.id}/media`, { method: 'POST', body: data })
    checkpoint()
    galleryImages.value.push(result.publicUrl)
    toast.success('Foto ditambahkan. Foto tampil publik setelah undangan diterbitkan.')
  } catch (cause) {
    error.value = (cause as { message: string }).message
  } finally {
    uploadPending.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}

function undo() {
  const previous = undoStack.value.pop()
  if (!previous) return
  redoStack.value.push(structuredClone(toRaw(document.value)))
  document.value = previous
}
function redo() {
  const next = redoStack.value.pop()
  if (!next) return
  undoStack.value.push(structuredClone(toRaw(document.value)))
  document.value = next
}

watch(document, () => {
  if (!watchReady.value || saving.value) return
  clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => save(true), 900)
}, { deep: true })

onBeforeUnmount(() => clearTimeout(autosaveTimer))
</script>

<template>
  <DashboardShell v-if="invitation" :invitation-id="invitation.id" :title="invitation.title">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="grid gap-1.5">
        <p class="eyebrow">Editor undangan</p>
        <h1 class="m-0 font-display text-h1 font-semibold text-ink">{{ invitation.title }}</h1>
        <p class="m-0 text-caption text-ink-subtle">
          Draft r{{ revision }} · versi publik hanya berubah saat kalian menerbitkan.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UiButton as="NuxtLink" :to="`/i/${invitation.slug}`" target="_blank" tone="outline" size="sm">
          <Eye :size="16" aria-hidden="true" />
          Lihat publik
        </UiButton>
        <UiButton tone="ghost" size="sm" :disabled="!undoStack.length" aria-label="Undo" @click="undo">
          <Undo2 :size="16" aria-hidden="true" />
        </UiButton>
        <UiButton tone="ghost" size="sm" :disabled="!redoStack.length" aria-label="Redo" @click="redo">
          <Redo2 :size="16" aria-hidden="true" />
        </UiButton>
        <UiButton tone="outline" size="sm" @click="reset">
          <RotateCcw :size="16" aria-hidden="true" />
          Reset
        </UiButton>
        <UiButton size="sm" :loading="saving" @click="() => save()">
          <Save v-if="!saving" :size="16" aria-hidden="true" />
          {{ saving ? 'Menyimpan…' : 'Simpan draft' }}
        </UiButton>
        <UiButton tone="ink" size="sm" :loading="publishing" @click="publish">
          <Send v-if="!publishing" :size="16" aria-hidden="true" />
          {{ publishing ? 'Menerbitkan…' : 'Publikasikan' }}
        </UiButton>
      </div>
    </header>

    <p v-if="error" class="notice m-0" role="alert">
      {{ error }}
      <button v-if="conflict" class="button button-secondary ml-2" type="button" @click="load">Muat ulang versi server</button>
    </p>

    <!-- Mobile can only show one pane at a time. -->
    <div class="flex gap-1 rounded-full bg-surface-3 p-1 xl:hidden" role="tablist" aria-label="Panel editor">
      <button
        v-for="tab in [{ id: 'settings', label: 'Pengaturan' }, { id: 'preview', label: 'Pratinjau' }]"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="mobilePanel === tab.id"
        :class="cn(
          'min-h-11 flex-1 rounded-full text-[0.9375rem] font-semibold transition-colors duration-200',
          mobilePanel === tab.id ? 'bg-surface text-ink shadow-hairline' : 'text-ink-muted',
        )"
        @click="mobilePanel = tab.id as 'settings' | 'preview'"
      >
{{ tab.label }}
</button>
    </div>

    <div class="grid gap-5 xl:grid-cols-[15rem_1fr_22rem]">
      <!-- Section list -->
      <aside :class="cn('grid content-start gap-2', mobilePanel === 'preview' && 'hidden xl:grid')">
        <p class="eyebrow">Bagian undangan</p>
        <p v-if="!canEditDesign" id="design-locked-order" class="m-0 flex items-start gap-1.5 text-caption text-ink-muted">
          <Lock :size="13" class="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Urutan bagian mengikuti tema. Lihat panel Tema &amp; warna.</span>
        </p>
        <ul class="m-0 grid gap-1 p-0 list-none">
          <li
            v-for="(section, index) in document.sections"
            :key="section.id"
            :class="cn(
              'flex items-center gap-1 rounded-md border px-1.5 transition-colors duration-200',
              selectedId === section.id ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-surface-2',
            )"
          >
            <button
              type="button"
              class="flex min-h-11 flex-1 items-center gap-2 rounded-md px-1.5 text-left text-[0.875rem] font-medium text-ink"
              @click="selectedId = section.id; mobilePanel = 'settings'"
            >
              <span
                :class="cn('h-2 w-2 shrink-0 rounded-full', section.enabled ? 'bg-sage' : 'bg-border-strong')"
                aria-hidden="true"
              />
              <span class="truncate">{{ sectionLabels[section.type] ?? section.type }}</span>
            </button>

            <label class="grid h-11 w-9 shrink-0 cursor-pointer place-items-center">
              <input v-model="section.enabled" type="checkbox" class="h-4 w-4 accent-[var(--color-primary)]">
              <span class="sr-only">Tampilkan {{ sectionLabels[section.type] ?? section.type }}</span>
            </label>

            <button
              type="button"
              class="grid h-11 w-7 place-items-center rounded-md text-ink-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              :disabled="!canEditDesign || index === 0"
              :aria-label="`Naikkan ${sectionLabels[section.type] ?? section.type}`"
              :aria-describedby="canEditDesign ? undefined : 'design-locked-order'"
              @click="move(index, -1)"
            >
              <ArrowUp :size="15" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="grid h-11 w-7 place-items-center rounded-md text-ink-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              :disabled="!canEditDesign || index === document.sections.length - 1"
              :aria-label="`Turunkan ${sectionLabels[section.type] ?? section.type}`"
              :aria-describedby="canEditDesign ? undefined : 'design-locked-order'"
              @click="move(index, 1)"
            >
              <ArrowDown :size="15" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </aside>

      <!-- Settings -->
      <section :class="cn('grid content-start gap-5', mobilePanel === 'preview' && 'hidden xl:grid')">
        <template v-if="selected">
          <div class="grid gap-1">
            <p class="eyebrow">Pengaturan bagian</p>
            <h2 class="m-0 font-display text-h2 font-semibold text-ink">{{ sectionLabels[selected.type] ?? selected.type }}</h2>
          </div>

          <!--
            Pilihan berbentuk enum. Dipisah dari kolom teks di bawah karena masing-masing
            punya himpunan nilai tertutup; dibiarkan jatuh ke fallback `textFields`,
            pasangan akan mendapat kotak teks bebas berisi `arch-potret`.
          -->
          <div v-if="selected.type === 'cover'" class="card grid gap-4 p-5">
            <div class="grid gap-1">
              <p class="eyebrow">Tampilan pembuka</p>
              <p class="m-0 text-caption text-ink-subtle">Menentukan bagaimana foto kalian dipajang, bukan sekadar warnanya.</p>
            </div>

            <UiField v-slot="{ id }" label="Komposisi cover" :hint="selectableCoverLayouts.find(option => option.id === coverLayout)?.hint">
              <UiSelect :id="id" :model-value="coverLayout" @update:model-value="value => writeOption('layout', String(value))">
                <option v-for="option in selectableCoverLayouts" :key="option.id" :value="option.id">{{ option.label }}</option>
              </UiSelect>
            </UiField>

            <UiField v-slot="{ id }" label="Kepekatan ornamen" :hint="selectableIntensities.find(option => option.id === coverIntensity)?.hint">
              <UiSelect :id="id" :model-value="coverIntensity" @update:model-value="value => writeOption('ornamentIntensity', String(value))">
                <option v-for="option in selectableIntensities" :key="option.id" :value="option.id">{{ option.label }}</option>
              </UiSelect>
            </UiField>
            <p class="m-0 text-caption text-ink-subtle">Berlaku untuk seluruh undangan, bukan hanya bagian pembuka.</p>
          </div>

          <div v-else-if="selected.type === 'dresscode'" class="card grid gap-4 p-5">
            <div class="grid gap-1">
              <p class="eyebrow">Busana &amp; warna</p>
              <p class="m-0 text-caption text-ink-subtle">Tamu memutuskan mau pakai apa jauh sebelum membaca nama warnanya.</p>
            </div>

            <fieldset class="grid gap-2 border-0 p-0">
              <legend class="mb-1 text-[0.9375rem] font-semibold text-ink">Busana yang ditampilkan</legend>
              <div class="flex flex-wrap gap-x-5 gap-y-2">
                <label v-for="option in selectableAttire" :key="option.id" class="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.9375rem] text-ink">
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-[var(--color-primary)]"
                    :checked="attire.includes(option.id)"
                    @change="toggleAttire(option.id, ($event.target as HTMLInputElement).checked)"
                  >
                  {{ option.label }}
                </label>
              </div>
            </fieldset>

            <div class="grid gap-2">
              <p class="m-0 text-[0.9375rem] font-semibold text-ink">Bundaran warna</p>
              <!--
                Nama wajib diisi. Bundaran tanpa label tidak mengatakan apa pun kepada tamu
                yang buta warna atau yang membaca lewat pembaca layar, dan warna saja tidak
                pernah boleh jadi satu-satunya penanda.
              -->
              <article v-for="(color, index) in dresscodeColors" :key="index" class="card flex flex-wrap items-end gap-3 p-4">
                <UiField v-slot="{ id }" label="Warna" class="basis-24">
                  <input :id="id" class="control" type="color" :value="String(color.hex || '#E8DCC8')" @input="color.hex = ($event.target as HTMLInputElement).value">
                </UiField>
                <UiField v-slot="{ id }" label="Nama warna" hint="Wajib — tamu harus bisa membacanya, bukan hanya melihatnya." class="min-w-0 flex-1 basis-48">
                  <UiInput :id="id" :model-value="String(color.name || '')" placeholder="Terakota" @update:model-value="value => color.name = value" />
                </UiField>
                <button
                  type="button"
                  class="grid h-12 w-11 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus warna ${index + 1}`"
                  @click="removeRow(dresscodeColors, index)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </article>

              <UiButton tone="outline" class="justify-self-start" @click="addColor">
                <Plus :size="16" aria-hidden="true" />
                Tambah warna
              </UiButton>
            </div>
          </div>

          <div v-else-if="selected.type === 'story'" class="card grid gap-4 p-5">
            <div class="grid gap-1">
              <p class="eyebrow">Langkah cerita</p>
              <p class="m-0 text-caption text-ink-subtle">
                Tiap langkah muncul dari sisi berbeda dan memudar saat langkah berikutnya masuk.
                Kosongkan semuanya kalau kalian lebih suka satu paragraf saja.
              </p>
            </div>

            <article v-for="(step, index) in storySteps" :key="String(step.id)" class="card grid gap-3 p-4">
              <div class="flex items-center justify-between gap-3">
                <strong class="text-ink">Langkah {{ index + 1 }}</strong>
                <button
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus langkah ${index + 1}`"
                  @click="removeRow(storySteps, index)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <UiField v-slot="{ id }" label="Judul langkah">
                  <UiInput :id="id" :model-value="String(step.title || '')" placeholder="Perpustakaan kecil, 2022" @update:model-value="value => step.title = value" />
                </UiField>
                <UiField v-slot="{ id }" label="Sisi masuk">
                  <UiSelect :id="id" :model-value="String(step.side || 'kiri')" @update:model-value="value => step.side = value">
                    <option value="kiri">Kiri</option>
                    <option value="kanan">Kanan</option>
                  </UiSelect>
                </UiField>
              </div>

              <UiField v-slot="{ id }" label="Cerita">
                <UiTextarea :id="id" rows="3" :model-value="String(step.text || '')" @update:model-value="value => step.text = value" />
              </UiField>
              <UiField v-slot="{ id }" label="URL foto" hint="Opsional. Kosongkan untuk memakai foto galeri.">
                <UiInput :id="id" type="url" :model-value="String(step.image || '')" placeholder="https://…" @update:model-value="value => step.image = value" />
              </UiField>
            </article>

            <UiButton tone="outline" class="justify-self-start" @click="addStoryStep">
              <Plus :size="16" aria-hidden="true" />
              Tambah langkah
            </UiButton>
          </div>

          <!-- Events -->
          <div v-if="selected.type === 'events'" class="grid gap-4">
            <UiField v-slot="{ id }" label="Ilustrasi gedung" hint="Ditampilkan di atas kartu acara, mengikuti warna tema.">
              <UiSelect :id="id" :model-value="venueIllustration" @update:model-value="value => writeOption('venueIllustration', String(value))">
                <option value="">Tanpa ilustrasi</option>
                <option v-for="option in selectableVenues" :key="option.id" :value="option.id">{{ option.label }}</option>
              </UiSelect>
            </UiField>

            <article v-for="(event, index) in eventRows" :key="String(event.id)" class="card grid gap-3 p-5">
              <div class="flex items-center justify-between gap-3">
                <strong class="text-ink">Acara {{ index + 1 }}</strong>
                <button
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus acara ${index + 1}`"
                  @click="removeRow(eventRows, index)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <UiField v-slot="{ id }" label="Nama acara">
                  <UiInput :id="id" :model-value="String(event.name || '')" @update:model-value="value => event.name = value" />
                </UiField>
                <UiField v-slot="{ id }" label="Tanggal">
                  <UiInput :id="id" type="date" :model-value="String(event.date || '')" @update:model-value="value => event.date = value" />
                </UiField>
                <UiField v-slot="{ id }" label="Waktu">
                  <UiInput :id="id" :model-value="String(event.time || '')" placeholder="09.00 WIB" @update:model-value="value => event.time = value" />
                </UiField>
                <UiField v-slot="{ id }" label="Lokasi">
                  <UiInput
                    :id="id"
                    :model-value="String(event.venue || '')"
                    :disabled="sameVenue && index > 0"
                    @update:model-value="value => writeVenue(index, 'venue', value ?? '')"
                  />
                </UiField>
              </div>

              <UiField v-slot="{ id }" label="Alamat">
                <UiTextarea
                  :id="id"
                  rows="2"
                  :model-value="String(event.address || '')"
                  :disabled="sameVenue && index > 0"
                  @update:model-value="value => writeVenue(index, 'address', value ?? '')"
                />
              </UiField>
              <UiField v-slot="{ id }" label="Tautan peta" hint="Tempel tautan Google Maps lokasinya. Tamu akan melihat tombol “Buka peta”.">
                <UiInput
                  :id="id"
                  type="url"
                  :model-value="String(event.mapUrl || '')"
                  placeholder="https://maps.google.com/…"
                  :disabled="sameVenue && index > 0"
                  @update:model-value="value => writeVenue(index, 'mapUrl', value ?? '')"
                />
              </UiField>
              <p v-if="sameVenue && index > 0" class="m-0 text-caption text-ink-subtle">
                Mengikuti lokasi acara pertama. Hilangkan centang “lokasi sama” untuk mengisinya sendiri.
              </p>

              <label class="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.9375rem] text-ink">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-[var(--color-primary)]"
                  :checked="Boolean(event.public)"
                  @change="event.public = ($event.target as HTMLInputElement).checked"
                >
                Tampilkan untuk semua tamu
              </label>
            </article>

            <label v-if="eventRows.length > 1" class="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.9375rem] text-ink">
              <input
                type="checkbox"
                class="h-4 w-4 accent-[var(--color-primary)]"
                :checked="sameVenue"
                @change="toggleSameVenue(($event.target as HTMLInputElement).checked)"
              >
              Lokasi akad dan resepsi sama
            </label>

            <UiButton tone="outline" class="justify-self-start" @click="addEvent">
              <Plus :size="16" aria-hidden="true" />
              Tambah acara
            </UiButton>
          </div>

          <!-- Gallery -->
          <div v-else-if="selected.type === 'gallery'" class="grid gap-4">
            <UiField v-slot="{ id }" label="Gaya galeri" :hint="selectableGalleryMotions.find(option => option.id === galleryMotion)?.hint">
              <UiSelect :id="id" :model-value="galleryMotion" @update:model-value="value => writeOption('motion', String(value))">
                <option v-for="option in selectableGalleryMotions" :key="option.id" :value="option.id">{{ option.label }}</option>
              </UiSelect>
            </UiField>

            <p class="m-0 text-[0.9375rem] text-ink-muted">
              Maksimal 15 foto. Foto yang diunggah baru tampil publik setelah undangan diterbitkan.
            </p>

            <ul class="m-0 grid gap-2 p-0 list-none">
              <li v-for="(image, index) in galleryImages" :key="image" class="card flex items-center gap-3 p-2.5">
                <img :src="image" alt="" class="h-14 w-14 shrink-0 rounded-md object-cover">
                <input v-model="galleryImages[index]" class="control min-w-0 flex-1" aria-label="URL foto">
                <button
                  type="button"
                  class="grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus foto ${index + 1}`"
                  @click="removeRow(galleryImages, index)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </li>
            </ul>

            <form class="flex flex-wrap gap-2" @submit.prevent="addGalleryUrl">
              <label class="sr-only" for="gallery-url">URL foto baru</label>
              <input id="gallery-url" v-model="galleryUrl" class="control min-w-0 flex-1 basis-56" type="url" placeholder="https://…">
              <UiButton type="submit" tone="outline">Tambah URL</UiButton>
              <label class="button button-secondary cursor-pointer">
                <Upload :size="16" aria-hidden="true" />
                {{ uploadPending ? 'Mengunggah…' : 'Unggah foto' }}
                <input class="sr-only" type="file" accept="image/*" :disabled="uploadPending" @change="uploadMedia">
              </label>
            </form>
          </div>

          <!-- Rundown -->
          <div v-else-if="selected.type === 'rundown'" class="grid gap-3">
            <article v-for="(item, index) in rundownRows" :key="String(item.id)" class="card flex flex-wrap items-end gap-3 p-4">
              <UiField v-slot="{ id }" label="Waktu" class="basis-28">
                <UiInput :id="id" :model-value="String(item.time || '')" placeholder="09.00" @update:model-value="value => item.time = value" />
              </UiField>
              <UiField v-slot="{ id }" label="Kegiatan" class="min-w-0 flex-1 basis-56">
                <UiInput :id="id" :model-value="String(item.title || '')" @update:model-value="value => item.title = value" />
              </UiField>
              <UiField v-slot="{ id }" label="Keterangan" class="min-w-0 basis-full">
                <UiInput :id="id" :model-value="String(item.description || '')" placeholder="Opsional — mis. “Tamu dipersilakan menempati kursi”" @update:model-value="value => item.description = value" />
              </UiField>
              <button
                type="button"
                class="grid h-12 w-11 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                :aria-label="`Hapus bagian ${index + 1}`"
                @click="removeRow(rundownRows, index)"
              >
                <Trash2 :size="16" aria-hidden="true" />
              </button>
            </article>

            <UiButton tone="outline" class="justify-self-start" @click="addRundown">
              <Plus :size="16" aria-hidden="true" />
              Tambah bagian
            </UiButton>
          </div>

          <!-- Gift -->
          <div v-else-if="selected.type === 'gift'" class="grid gap-4">
            <p class="m-0 text-[0.9375rem] text-ink-muted">
              Sampai {{ giftAccountLimit }} rekening — biasanya mempelai, orang tua, dan satu e-wallet.
              Tamu melihat logo banknya dan tombol salin nomor rekening.
            </p>

            <UiField v-slot="{ id }" label="Judul bagian">
              <UiInput :id="id" :model-value="String(selected.data.title || '')" placeholder="Hadiah untuk kami" @update:model-value="next => updateValue('title', next ?? '')" />
            </UiField>
            <UiField v-slot="{ id }" label="Kalimat pengantar" hint="Kosongkan untuk memakai kalimat bawaan.">
              <UiTextarea :id="id" rows="3" :model-value="String(selected.data.note || '')" @update:model-value="next => updateValue('note', next ?? '')" />
            </UiField>

            <article v-for="(account, index) in giftAccounts" :key="String(account.id)" class="card grid gap-3 p-5">
              <div class="flex items-center justify-between gap-3">
                <strong class="text-ink">Rekening {{ index + 1 }}</strong>
                <button
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus rekening ${index + 1}`"
                  @click="removeRow(giftAccounts, index)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </div>

              <!--
                Dulu ada pilihan "Milik" (mempelai pria/wanita) di sini. Labelnya tidak
                dirender lagi sejak batas rekening naik ke delapan, jadi kontrolnya tidak
                mengubah apa pun yang dilihat tamu. Key `owner` tetap dibaca dan ditulis
                ulang apa adanya supaya dokumen lama tidak rusak.
              -->
              <UiField v-slot="{ id }" label="Bank">
                <UiSelect :id="id" :model-value="String(account.bankId || 'bca')" @update:model-value="value => account.bankId = value">
                  <option v-for="option in bankOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                </UiSelect>
              </UiField>

              <UiField v-if="account.bankId === 'other'" v-slot="{ id }" label="Nama bank" hint="Ditulis apa adanya pada kartu.">
                <UiInput :id="id" :model-value="String(account.bankLabel || '')" @update:model-value="value => account.bankLabel = value" />
              </UiField>

              <div class="grid gap-3 sm:grid-cols-2">
                <UiField v-slot="{ id }" label="Nomor rekening">
                  <UiInput :id="id" inputmode="numeric" :model-value="String(account.number || '')" @update:model-value="value => account.number = value" />
                </UiField>
                <UiField v-slot="{ id }" label="Atas nama">
                  <UiInput :id="id" :model-value="String(account.holder || '')" @update:model-value="value => account.holder = value" />
                </UiField>
              </div>
            </article>

            <UiButton v-if="giftAccounts.length < giftAccountLimit" tone="outline" class="justify-self-start" @click="addGiftAccount">
              <Plus :size="16" aria-hidden="true" />
              Tambah rekening
            </UiButton>
            <p v-else class="notice m-0">Sudah {{ giftAccountLimit }} rekening — batasnya di sini supaya bagian hadiah tidak berubah jadi daftar bank.</p>

            <UiField v-slot="{ id }" label="Alamat kirim hadiah" hint="Opsional, untuk tamu yang ingin mengirim kado fisik.">
              <UiTextarea :id="id" rows="2" :model-value="String(selected.data.address || '')" @update:model-value="next => updateValue('address', next ?? '')" />
            </UiField>
          </div>

          <!-- Plain text fields -->
          <div v-else class="grid gap-4">
            <UiField v-for="[key, value] in textFields" :key="key" v-slot="{ id }" :label="label(key)">
              <UiTextarea
                v-if="key === 'description' || key === 'text'"
                :id="id"
                rows="4"
                :model-value="value"
                @update:model-value="next => updateValue(key, next ?? '')"
              />
              <UiInput v-else :id="id" :model-value="value" @update:model-value="next => updateValue(key, next ?? '')" />
            </UiField>

            <p v-if="!textFields.length" class="notice m-0">Bagian ini tidak punya pengaturan teks.</p>
          </div>

          <!-- Theme -->
          <section class="card grid gap-5 p-5">
            <div class="grid gap-1">
              <p class="eyebrow">Tema &amp; warna</p>
              <p v-if="canEditDesign" class="m-0 text-caption text-ink-subtle">Mengganti tema memuat ulang palet kurasinya.</p>
            </div>

            <!--
              Satu penjelasan yang tenang, di sebelah kontrolnya. Kontrol di bawah tetap
              terlihat supaya pasangan tahu apa yang dibuka add-on ini, tapi tidak bisa
              digeser lebih dulu lalu ditolak saat autosave.
            -->
            <p
              v-if="!canEditDesign"
              id="design-locked"
              class="m-0 flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3.5 text-[0.8125rem] text-ink-muted"
            >
              <Lock :size="15" class="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
              <span>
                Tema, warna, font, dan urutan bagian terkunci pada preset undangan ini.
                <span v-if="designAddon" class="text-ink">Add-on {{ designAddon.name }} ({{ formatRupiah(designAddon.price) }}) membukanya.</span>
                <span v-else class="text-ink">Add-on {{ featureLabel(designFeatureId) }} membukanya.</span>
              </span>
            </p>

            <div class="grid gap-2 sm:grid-cols-3">
              <button
                v-for="theme in invitationThemes"
                :key="theme.id"
                type="button"
                :aria-pressed="document.templateId === theme.id"
                :disabled="!canEditDesign"
                :aria-describedby="canEditDesign ? undefined : 'design-locked'"
                :class="cn(
                  'grid gap-2 rounded-md border p-2 text-left transition-[border-color,box-shadow] duration-200',
                  document.templateId === theme.id ? 'border-primary shadow-lift' : 'border-border',
                  canEditDesign
                    ? (document.templateId === theme.id ? '' : 'hover:border-border-strong')
                    : 'cursor-not-allowed opacity-60',
                )"
                @click="applyTemplate(theme.id)"
              >
                <span class="flex h-8 overflow-hidden rounded-sm" aria-hidden="true">
                  <span class="flex-1" :style="{ background: theme.tokens.background }" />
                  <span class="flex-1" :style="{ background: theme.tokens.primary }" />
                  <span class="flex-1" :style="{ background: theme.accent }" />
                </span>
                <span class="flex items-center gap-1 text-[0.8125rem] font-semibold text-ink">
                  <Check v-if="document.templateId === theme.id" :size="13" class="text-primary" aria-hidden="true" />
                  {{ theme.name }}
                </span>
              </button>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <UiField v-slot="{ id }" label="Latar belakang">
                <input :id="id" v-model="document.tokens.background" class="control disabled:cursor-not-allowed disabled:opacity-60" type="color" :disabled="!canEditDesign" :aria-describedby="canEditDesign ? undefined : 'design-locked'">
              </UiField>
              <UiField v-slot="{ id }" label="Warna teks">
                <input :id="id" v-model="document.tokens.foreground" class="control disabled:cursor-not-allowed disabled:opacity-60" type="color" :disabled="!canEditDesign" :aria-describedby="canEditDesign ? undefined : 'design-locked'">
              </UiField>
              <UiField v-slot="{ id }" label="Warna aksi">
                <input :id="id" v-model="document.tokens.primary" class="control disabled:cursor-not-allowed disabled:opacity-60" type="color" :disabled="!canEditDesign" :aria-describedby="canEditDesign ? undefined : 'design-locked'">
              </UiField>
            </div>

            <!--
              Laporan keterbacaan. Rasio ditulis angkanya, bukan cuma ikon: pasangan yang
              gagal perlu tahu seberapa jauh, dan warna saja tidak pernah cukup sebagai penanda.
            -->
            <div
              :class="cn(
                'grid gap-3 rounded-md border p-3.5 transition-colors duration-300',
                paletteIssues.length ? 'border-warning/40 bg-gold-soft' : 'border-border bg-surface-2',
              )"
            >
              <div class="flex items-start gap-2">
                <component
                  :is="paletteIssues.length ? AlertCircle : Check"
                  :size="16"
                  :class="cn('mt-0.5 shrink-0', paletteIssues.length ? 'text-warning' : 'text-success')"
                  aria-hidden="true"
                />
                <p class="m-0 text-[0.8125rem] font-semibold text-ink" aria-live="polite">
                  {{ paletteIssues.length
                    ? `${paletteIssues.length} dari 4 pasangan warna sulit dibaca tamu`
                    : 'Keempat pasangan warna terbaca jelas' }}
                </p>
              </div>

              <ul class="m-0 grid list-none gap-1.5 p-0">
                <li v-for="check in paletteChecks" :key="check.id" class="grid grid-cols-[1fr_auto] items-baseline gap-2">
                  <span class="text-[0.8125rem] text-ink">
                    {{ check.label }}
                    <!-- `ink-subtle` hanya 4,40:1 di atas gold-soft; baris ini memakai `ink-muted` (5,82:1). -->
                    <span class="block text-caption text-ink-muted">{{ check.where }}</span>
                  </span>
                  <span
                    :class="cn(
                      'rounded-full px-2 py-0.5 text-caption font-semibold tabular-nums',
                      check.passes ? 'bg-surface text-ink-muted' : 'bg-danger-soft text-danger',
                    )"
                  >
                    {{ formatRatio(check.ratio) }}:1
                    <span class="sr-only">{{ check.passes ? 'memenuhi' : 'di bawah' }} ambang 4,5:1</span>
                  </span>
                </li>
              </ul>

              <button v-if="paletteIssues.length && canEditDesign" type="button" class="button button-secondary justify-self-start" @click="repairPaletteColors">
                <Wand2 :size="15" aria-hidden="true" />
                Perbaiki warna otomatis
              </button>
            </div>

            <UiField v-slot="{ id }" label="Jenis huruf judul">
              <UiSelect :id="id" v-model="(document.tokens.font as FontChoice)" :disabled="!canEditDesign" :aria-describedby="canEditDesign ? undefined : 'design-locked'">
                <option v-for="font in selectableFonts" :key="font.id" :value="font.id">{{ font.label }}</option>
              </UiSelect>
            </UiField>
          </section>
        </template>
      </section>

      <!-- Preview -->
      <aside :class="cn('xl:sticky xl:top-8 xl:self-start', mobilePanel === 'settings' && 'hidden xl:block')">
        <div class="grid gap-2.5">
          <p class="eyebrow">Pratinjau draft</p>
          <!--
            Tingginya mengikuti layar, bukan angka tetap. `36rem` dulu berarti panel ini
            berhenti di 576px bahkan di layar 1000px — pasangan melihat 40% lebih sedikit
            dari undangan yang justru jadi alasan mereka membuka editor.

            Bayangan di tepi bawah ada karena panel ini memotong isinya di tengah huruf.
            Scrollbar overlay macOS tidak terlihat sampai disentuh, jadi tanpa isyarat itu
            potongannya terbaca sebagai render yang rusak, bukan sebagai "masih ada lagi".
          -->
          <div class="relative overflow-hidden rounded-xl border border-border shadow-float after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-10 after:bg-gradient-to-t after:from-ink/12 after:to-transparent">
            <div class="max-h-[36rem] overflow-y-auto xl:max-h-[calc(100svh-9rem)]">
              <InvitationRenderer :document="document" compact />
            </div>
          </div>
        </div>
      </aside>
    </div>
  </DashboardShell>

  <div v-else class="shell section grid gap-4">
    <p v-if="loading" class="m-0 text-ink-muted">Memuat editor…</p>
    <p v-else class="notice m-0" role="alert">
      {{ error }}
      <button class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
    </p>
  </div>
</template>
