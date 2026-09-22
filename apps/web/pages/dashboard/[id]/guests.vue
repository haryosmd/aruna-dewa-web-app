<script setup lang="ts">
import { guestFromLabel, invitationKindLabel } from '@aruna/contracts'
import type { GuestPage, InvitationDetail, ShareSettings } from '@aruna/contracts/api'
import type { Guest } from '~/types/aruna'
import { ArrowLeft, ClipboardPaste, Download, FileSpreadsheet, Plus, Search, Upload } from 'lucide-vue-next'
import type { GuestForm } from '~/components/dashboard/generator/GuestDialog.vue'
import { defaultTemplate, fillTemplate, shareContext, toCsv, whatsappLink } from '~/components/dashboard/generator/templates'

/*
 * Halaman Generator (fase 72.6): tiga blok referensi — gaya bahasa, komposer pesan WhatsApp,
 * dan daftar tamu untuk broadcast. Tautan personal bertoken (fase lama) tetap jadi tautan yang
 * dikirim: `buildGuestUrl` dengan token supaya RSVP dari tautan itu tercatat ke tamunya.
 */

definePageMeta({ middleware: 'auth', layout: false })

const toast = useToast()
const { confirm } = usePopup()
const route = useRoute()
const config = useRuntimeConfig()
const invitationsApi = useInvitations()
const guestsApi = useGuests()
const { build } = useGuestLink()

const invitationId = computed(() => String(route.params.id))
const invitation = ref<InvitationDetail | null>(null)
const result = ref<GuestPage>({ items: [], total: 0, page: 1, pageSize: 25, sent: 0, categories: [] })
const q = ref('')
const status = ref<'semua' | 'belum' | 'terkirim'>('semua')
const category = ref('')
const selected = ref<Set<string>>(new Set())
const { pending: loading, error, run } = useLoader()

/* ── Muat ─────────────────────────────────────────────────────────────────── */

async function load() {
  const current = await run(async () => {
    const page = await guestsApi.list(invitationId.value, { q: q.value, page: result.value.page, status: status.value, category: category.value })
    if (!invitation.value) invitation.value = await invitationsApi.get(invitationId.value)
    return page
  })
  if (current) result.value = current
}
await load()

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { result.value.page = 1; load() }, 300)
})
watch([status, category], () => { result.value.page = 1; load() })

/* ── Template WhatsApp ────────────────────────────────────────────────────── */

const context = computed(() => shareContext(invitation.value?.document, invitation.value?.title ?? ''))
const settings = reactive<ShareSettings>({ preset: 'formal', templates: {} })
watch(invitation, (value) => {
  if (!value?.shareSettings) return
  settings.preset = value.shareSettings.preset
  settings.templates = { ...value.shareSettings.templates }
}, { immediate: true })

const defaultText = computed(() => defaultTemplate(settings.preset, context.value))
/** Teks yang tampil: suntingan tersimpan untuk gaya ini, atau bawaannya. */
const template = computed({
  get: () => settings.templates[settings.preset] ?? defaultText.value,
  set: (value: string) => {
    // Sama dengan bawaan → kuncinya dilepas, supaya perubahan data acara tetap mengalir ke pesan.
    if (value === defaultText.value) delete settings.templates[settings.preset]
    else settings.templates[settings.preset] = value
    scheduleSave()
  },
})
const saveState = ref<'bawaan' | 'menyimpan' | 'tersimpan' | 'gagal'>('bawaan')
watch(() => settings.templates[settings.preset], (value) => { if (value === undefined && saveState.value !== 'menyimpan') saveState.value = 'bawaan' }, { immediate: true })

let saveTimer: ReturnType<typeof setTimeout> | undefined
function scheduleSave() {
  clearTimeout(saveTimer)
  saveState.value = 'menyimpan'
  saveTimer = setTimeout(saveSettings, 800)
}
async function saveSettings() {
  try {
    await invitationsApi.updateShareSettings(invitationId.value, { preset: settings.preset, templates: { ...settings.templates } })
    saveState.value = settings.templates[settings.preset] === undefined ? 'bawaan' : 'tersimpan'
  } catch {
    saveState.value = 'gagal'
  }
}
watch(() => settings.preset, () => scheduleSave())
onBeforeUnmount(() => { clearTimeout(saveTimer); clearTimeout(searchTimer) })

function resetTemplate() {
  delete settings.templates[settings.preset]
  scheduleSave()
}

const publicUrl = computed(() => (invitation.value?.status === 'PUBLISHED' && invitation.value.slug ? `${config.public.webBase}/i/${invitation.value.slug}` : ''))

/* ── Tamu: tautan, kirim, salin ───────────────────────────────────────────── */

function guestUrl(guest: Guest) {
  return build(invitation.value!.slug, guest.displayName, guest.token)
}

/** Tab wa.me dibuka **sebelum** menunggu API: browser hanya mengizinkan `window.open` di dalam gestur klik. */
async function sendWhatsApp(guest: Guest) {
  const text = fillTemplate(template.value, { guestName: guest.displayName, url: guestUrl(guest) })
  window.open(whatsappLink(guest.phone, text), '_blank', 'noopener')
  try {
    const marked = await guestsApi.markSent(invitationId.value, guest.id)
    const index = result.value.items.findIndex(item => item.id === guest.id)
    if (index >= 0) result.value.items[index] = { ...result.value.items[index]!, sentAt: marked.sentAt }
    if (marked.justMarked) result.value.sent += 1
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  }
}

/** Kirim ke tamu terpilih yang belum terkirim, satu per klik — browser memblokir beberapa tab sekaligus. */
const nextSelected = computed(() => result.value.items.find(guest => selected.value.has(guest.id) && !guest.sentAt && guest.phone))
function sendNext() {
  if (nextSelected.value) sendWhatsApp(nextSelected.value)
}

/*
 * Menolak menyalin tautan personal yang tokennya hilang, alih-alih menyalin tautan sapaan:
 * `buildGuestUrl()` membuang `g` diam-diam kalau tokennya kosong, dan tautan yang "berhasil
 * disalin" itu tidak akan pernah bisa dipakai RSVP.
 */
async function copyLink(guest: Guest) {
  if (guest.tokenUnavailable) {
    toast.error(`Tautan personal untuk ${guest.displayName} tidak bisa dibuka lagi`, { description: 'Hapus lalu tambahkan ulang tamu ini untuk mendapat tautan personal baru.' })
    return
  }
  try {
    await navigator.clipboard.writeText(guestUrl(guest))
    toast.success(`Tautan untuk ${guest.displayName} berhasil disalin`)
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  }
}

/* ── Tamu: tambah, sunting, hapus ─────────────────────────────────────────── */

const dialogOpen = ref(false)
const editing = ref<Guest | null>(null)
const saving = ref(false)
const formError = ref('')

function openAdd() { editing.value = null; formError.value = ''; dialogOpen.value = true }
function openEdit(guest: Guest) { editing.value = guest; formError.value = ''; dialogOpen.value = true }

async function submitGuest(form: GuestForm) {
  saving.value = true
  formError.value = ''
  try {
    const body = {
      displayName: form.displayName, phone: form.phone || undefined, category: form.category || undefined, quota: form.quota,
      // Kolom lembar tamu (fase 75): string kosong dikirim sebagai `undefined`, bukan `''` —
      // zod memangkasnya jadi '' dan API akan menyimpannya sebagai teks kosong alih-alih null.
      guestFrom: form.guestFrom || undefined, childCount: form.childCount ?? null,
      invitationKind: form.invitationKind || undefined, notes: form.notes || undefined,
    }
    if (editing.value) {
      await guestsApi.update(invitationId.value, editing.value.id, { ...body, revision: editing.value.revision })
      toast.success('Tamu diperbarui.')
    } else {
      await guestsApi.create(invitationId.value, body)
      toast.success('Tamu ditambahkan.')
    }
    dialogOpen.value = false
    await load()
  } catch (cause) {
    formError.value = apiErrorMessage(cause)
  } finally {
    saving.value = false
  }
}

async function remove(guest: Guest) {
  const jawaban = await confirm({
    title: `Hapus ${guest.displayName}?`,
    description: 'Tautan personalnya ikut mati; RSVP yang sudah masuk dari tautan itu tidak bisa dipulihkan.',
    tone: 'danger',
    actions: [{ id: 'batal', label: 'Kembali' }, { id: 'hapus', label: 'Hapus tamu', tone: 'outline' }],
    dismissId: 'batal',
  })
  if (jawaban !== 'hapus') return
  try {
    await guestsApi.remove(invitationId.value, guest.id)
    selected.value.delete(guest.id)
    toast.success('Tamu dihapus.')
    await load()
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  }
}

/* ── Impor & ekspor ───────────────────────────────────────────────────────── */

const importOpen = ref(false)
const importMode = ref<'file' | 'text'>('file')
function openImport(mode: 'file' | 'text') { importMode.value = mode; importOpen.value = true }

function downloadCsv(name: string, rows: (string | number)[][]) {
  const blob = new Blob([`﻿${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * CSV datar — bentuk paling sederhana, tetap ada untuk yang mengetik sendiri.
 * Judul kolomnya sama persis dengan yang dibaca pengimpor.
 */
function downloadTemplate() {
  downloadCsv('template-tamu-aruna.csv', [
    ['nama', 'nomor wa', 'kategori', 'kuota', 'dari', 'anak', 'jenis undangan', 'catatan'],
    ['dr. Yosi Susanti, Sp.OG', '081234567890', 'Keluarga', 2, 'Mempelai wanita', '', 'Digital', 'Vegetarian'],
    ['Budi Santoso', '+62 812 9876 5432', 'Teman CPP', 1, 'Mempelai pria', '', 'Cetak', ''],
  ])
}

/**
 * XLSX berbentuk lembar kerja: spanduk, petunjuk, dropdown kategori yang diisi kategori undangan
 * INI. Dibangkitkan server (fase 75) justru karena kategorinya — berkas statis tidak bisa tahu
 * kategori apa yang dipakai pernikahan ini.
 *
 * Dibuka lewat `window.open`, bukan `fetch` lalu Blob: permintaannya butuh cookie sesi, dan
 * navigasi biasa membawanya sendiri tanpa kita menyentuh token apa pun.
 */
function downloadTemplateXlsx() {
  const config = useRuntimeConfig()
  window.open(`${config.public.apiBase}/invitations/${invitationId.value}/guests/template.xlsx`, '_blank', 'noopener')
}

const exporting = ref(false)
/** Seluruh tamu, bukan halaman ini saja: ditarik per 100 sampai habis. */
async function exportCsv() {
  exporting.value = true
  try {
    // Judul kolomnya sengaja sama dengan yang dibaca `parseGuestText`, jadi hasil ekspor bisa
    // diimpor kembali apa adanya — itu yang membuatnya berguna sebagai cadangan, bukan sekadar laporan.
    const rows: (string | number)[][] = [['nama', 'nomor wa', 'kategori', 'kuota', 'dari', 'anak', 'jenis undangan', 'catatan', 'status', 'terkirim_pada', 'tautan']]
    for (let page = 1; ; page++) {
      const chunk = await guestsApi.list(invitationId.value, { page, pageSize: 100 })
      for (const guest of chunk.items) rows.push([guest.displayName, guest.phone ?? '', guest.category ?? '', guest.quota, guestFromLabel(guest.guestFrom), guest.childCount ?? '', invitationKindLabel(guest.invitationKind), guest.notes ?? '', guest.sentAt ? 'Terkirim' : 'Belum', guest.sentAt ?? '', guestUrl(guest)])
      if (chunk.items.length < 100) break
    }
    downloadCsv(`tamu-${invitation.value?.slug ?? 'undangan'}.csv`, rows)
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  } finally {
    exporting.value = false
  }
}

/* ── Statistik ────────────────────────────────────────────────────────────── */

const totalAll = computed(() => (status.value === 'semua' && !q.value && !category.value ? result.value.total : Math.max(result.value.total, result.value.sent)))
const sentPercent = computed(() => (totalAll.value ? Math.round((result.value.sent / totalAll.value) * 100) : 0))
const filtered = computed(() => Boolean(q.value || category.value || status.value !== 'semua'))

useHead({ title: () => invitation.value?.title
  ? `Generator WhatsApp · ${invitation.value.title} — Aruna Dewa`
  : 'Generator WhatsApp — Aruna Dewa' })
</script>

<template>
  <DashboardShell
    v-if="invitation"
    :invitation-id="invitation.id"
    :title="invitation.title"
    eyebrow="WhatsApp Broadcast · Buku Tamu & Generator"
    heading="Manajemen Tamu & Broadcast WhatsApp"
  >
    <template #subheading>
      <p class="copy m-0">
        Pilih gaya bahasa undangan, lihat pratinjau pesan personal, dan kelola daftar tamu untuk broadcast WhatsApp resmi.
      </p>
      <NuxtLink id="generator-back-editor" :to="`/dashboard/${invitation.id}/editor`" class="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline">
        <ArrowLeft :size="16" aria-hidden="true" />
        Kembali ke editor
      </NuxtLink>
    </template>

    <DashboardGeneratorStyleCards v-model="settings.preset" />

    <DashboardGeneratorComposer
      v-model="template"
      :preset="settings.preset"
      :default-text="defaultText"
      :save-state="saveState"
      :public-url="publicUrl"
      @reset="resetTemplate"
    />

    <section class="grid gap-4" aria-labelledby="guest-list-title">
      <div class="grid gap-1">
        <h2 id="guest-list-title" class="m-0 font-display text-h3 font-semibold text-ink">Daftar Tamu Undangan Terdaftar</h2>
        <p class="m-0 text-ui-lg text-ink-muted">Tamu wajib terdaftar untuk menghindari manipulasi URL — tiap tamu mendapat tautan personalnya sendiri.</p>
      </div>

      <dl class="m-0 grid gap-3 sm:grid-cols-3">
        <div class="card grid gap-1.5 p-5">
          <dt class="text-caption font-semibold uppercase tracking-[0.1em] text-ink-subtle">Total tamu</dt>
          <dd id="guest-stat-total" class="m-0 font-display text-stat leading-none font-semibold text-ink">{{ totalAll }} <span class="text-body font-normal text-ink-muted">orang</span></dd>
        </div>
        <div class="card grid gap-1.5 p-5">
          <dt class="text-caption font-semibold uppercase tracking-[0.1em] text-ink-subtle">Sudah terkirim</dt>
          <dd id="guest-stat-sent" class="m-0 font-display text-stat leading-none font-semibold text-success">{{ result.sent }} <span class="text-body font-normal text-ink-muted">({{ sentPercent }}%)</span></dd>
        </div>
        <div class="card grid gap-1.5 p-5">
          <dt class="text-caption font-semibold uppercase tracking-[0.1em] text-ink-subtle">Belum terkirim</dt>
          <dd id="guest-stat-unsent" class="m-0 font-display text-stat leading-none font-semibold text-gold">{{ Math.max(0, totalAll - result.sent) }}</dd>
        </div>
      </dl>

      <div class="flex flex-wrap items-center gap-2">
        <UiButton id="guest-add-toggle" class="bg-success hover:bg-success/90" @click="openAdd">
          <Plus :size="17" aria-hidden="true" />
          Tambah tamu
        </UiButton>
        <UiButton id="guest-import-file-toggle" tone="outline" @click="openImport('file')">
          <Upload :size="17" aria-hidden="true" />
          Import Excel / CSV
        </UiButton>
        <UiButton id="guest-import-text-toggle" tone="outline" @click="openImport('text')">
          <ClipboardPaste :size="17" aria-hidden="true" />
          Tempel teks
        </UiButton>
        <UiButton id="guest-template-xlsx" tone="ghost" @click="downloadTemplateXlsx">
          <FileSpreadsheet :size="17" aria-hidden="true" />
          Template Excel
        </UiButton>
        <UiButton id="guest-template-download" tone="ghost" @click="downloadTemplate">
          <FileSpreadsheet :size="17" aria-hidden="true" />
          Template CSV
        </UiButton>
        <UiButton id="guest-export" tone="ghost" :loading="exporting" :disabled="!result.total" @click="exportCsv">
          <Download :size="17" aria-hidden="true" />
          Export CSV
        </UiButton>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="relative min-w-[16rem] flex-1">
          <label class="sr-only" for="guest-search">Cari tamu</label>
          <Search :size="17" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <input id="guest-search" v-model="q" class="control pl-10" placeholder="Cari nama tamu, nomor HP, atau kategori...">
        </div>

        <div class="inline-flex rounded-full border border-border-strong bg-surface p-1" role="group" aria-label="Filter status kirim">
          <button
            v-for="[value, label] in ([['semua', 'Semua'], ['belum', 'Belum'], ['terkirim', 'Terkirim']] as const)"
            :id="`guest-filter-${value}`"
            :key="value"
            type="button"
            :class="cn('min-h-10 rounded-full px-4 text-ui font-semibold transition-colors', status === value ? 'bg-success-soft text-success' : 'text-ink-muted hover:bg-surface-2 hover:text-ink')"
            :aria-pressed="status === value"
            @click="status = value"
          >
            {{ label }}
            <span v-if="value === 'semua'" class="tabular-nums">({{ totalAll }})</span>
            <span v-else-if="value === 'terkirim'" class="tabular-nums">({{ result.sent }})</span>
            <span v-else class="tabular-nums">({{ Math.max(0, totalAll - result.sent) }})</span>
          </button>
        </div>

        <div class="min-w-[12rem]">
          <label class="sr-only" for="guest-category">Filter kategori</label>
          <UiSelect id="guest-category" v-model="category">
            <option value="">Semua kategori</option>
            <option v-for="item in result.categories" :key="item" :value="item">{{ item }}</option>
          </UiSelect>
        </div>
      </div>

      <p v-if="error" class="notice m-0" role="alert">
        {{ error }}
        <button id="guest-retry" class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
      </p>

      <p v-if="selected.size" id="guest-selection-bar" class="m-0 flex flex-wrap items-center gap-3 rounded-md bg-sage-soft px-4 py-2.5 text-ui-lg text-ink">
        <span><strong class="font-semibold">{{ selected.size }}</strong> tamu dipilih</span>
        <UiButton id="guest-send-next" size="sm" tone="ink" :disabled="!nextSelected" @click="sendNext">
          <DashboardGeneratorWhatsAppGlyph :size="15" />
          Kirim WA ke {{ nextSelected ? nextSelected.displayName : 'berikutnya' }}
        </UiButton>
        <button id="guest-selection-clear" type="button" class="button button-quiet" @click="selected = new Set()">Batalkan pilihan</button>
      </p>

      <DashboardGeneratorGuestTable
        v-model:selected="selected"
        :guests="result.items"
        :loading="loading"
        :filtered="filtered"
        @send="sendWhatsApp"
        @copy="copyLink"
        @edit="openEdit"
        @remove="remove"
      />

      <div class="flex flex-wrap items-center justify-between gap-3 text-ui-lg text-ink-muted">
        <span>{{ result.total }} tamu{{ filtered ? ' cocok' : '' }}</span>
        <div class="flex items-center gap-3">
          <UiButton id="guest-page-prev" tone="outline" size="sm" :disabled="result.page <= 1" @click="result.page--; load()">Sebelumnya</UiButton>
          <span>Halaman {{ result.page }}</span>
          <UiButton id="guest-page-next" tone="outline" size="sm" :disabled="result.items.length < result.pageSize" @click="result.page++; load()">Berikutnya</UiButton>
        </div>
      </div>
    </section>

    <DashboardGeneratorGuestDialog
      v-model:open="dialogOpen"
      :guest="editing"
      :categories="result.categories"
      :saving="saving"
      :error="formError"
      @submit="submitGuest"
    />

    <DashboardGeneratorImportDialog
      v-model:open="importOpen"
      :mode="importMode"
      :invitation-id="invitation.id"
      @imported="load"
    />
  </DashboardShell>
</template>
