<script setup lang="ts">
import { Copy, ExternalLink, Lock, RotateCcw } from 'lucide-vue-next'
import type {
  BackdropChoice, BackdropWeight, EntranceStyle, EnvelopeSpeed, FontChoice, LayoutFocus, LiveTemplateId,
  SectionBackground, SectionMotion, ShareCardStyle, TextStyle,
} from '@aruna/contracts'
import {
  canEditDesign as designUnlocked, createDefaultDocument, designFeatureId, invitationDocumentSchema, isLiveTemplateId,
  isV2SectionType, migrateLegacyDocument, templateById,
} from '@aruna/contracts'
import { toOrnamentOverrides } from '~/utils/invitation-options'
import { ornament, type LayerSlot, type OrnamentId, type UploadedOrnament } from '~/utils/ornaments'
import { bolehUnggah, sectionOrnamentSlots, terapkanOverrides, type OrnamentOverrides, type OrnamentSlotKey } from '~/utils/ornament-slots'
import { bawaanSlot } from '~/utils/ornament-search'
import { invitationThemes, themeOrnaments } from '~/utils/theme'
import type { ThemePalette } from '~/utils/theme-palettes'
import { filterSections, pindahkan, sectionLabels, visibleCount } from '~/utils/editor-sections'
import { releasableUrls, stillQueued } from '~/utils/asset-release'
import { mediaAssetIdFromUrl } from '~/utils/media-file'
import { checkPalette, repairPalette } from '~/utils/contrast'
import type { Invitation, InvitationDocument } from '~/types/aruna'

/*
 * Studio editor (fase 72): header referensi (Editor | Generator | Ucapan), rail struktur,
 * panggung hidup, inspektor empat tab. Form bagian **digenerate dari kontrak** (`SectionForm`),
 * jadi berkas ini tinggal memegang state, alur simpan/publish, dan penulisan dokumen lewat
 * `checkpoint()` — bukan lagi 1.700 baris cabang form per tipe.
 *
 * Dokumen v1 (struktur lama) dimigrasi **di sini saat dimuat** (`migrateLegacyDocument`), bukan
 * di server: versi terbit tamu tetap v1 sampai pasangan menekan Simpan lalu Publikasikan, dan
 * status "belum tersimpan" jujur mengatakan bahwa strukturnya sudah berubah di layar.
 */
const toast = useToast()
definePageMeta({ middleware: 'auth', layout: false })

const route = useRoute()
const config = useRuntimeConfig()
const invitationsApi = useInvitations()
const { fetchCatalog } = useCatalog()
const auth = useAuthStore()
const { confirm, alert } = usePopup()
const { pilih: bukaPustaka } = useMediaLibrary()

const invitation = ref<Invitation | null>(null)
const document = ref<InvitationDocument>(createDefaultDocument())
const revision = ref(0)
const selectedId = ref('opening-envelope')
const loading = ref(true)
const saving = ref(false)
const publishing = ref(false)
const error = ref('')
const conflict = ref(false)
const mobilePanel = ref<'settings' | 'preview'>('settings')
const prefs = useEditorPrefs()
const sectionQuery = ref('')
const designAddon = ref<{ name: string; price: number } | null>(null)
const { canUndo, canRedo, checkpoint, undo, redo, reset: resetRiwayat } = useDocumentHistory(document)

/*
 * Autosave dicabut di fase 18: simpan hanya berangkat lewat tombol, dan keadaannya dibaca dari
 * cuplikan ini — diambil **sebelum** permintaan berangkat dan dipasang setelah berhasil, jadi
 * suntingan yang datang selagi permintaan terbang tetap terhitung belum tersimpan.
 */
const savedSnapshot = ref('')
const dirty = computed(() => JSON.stringify(document.value) !== savedSnapshot.value)
const pendingReleases = ref<string[]>([])

const selected = computed(() => document.value.sections.find(section => section.id === selectedId.value) ?? document.value.sections[0])
const sectionEntries = computed(() => filterSections(document.value.sections, sectionQuery.value, sectionLabels))
const sectionsVisible = computed(() => visibleCount(document.value.sections))
const themeName = computed(() => templateById(document.value.templateId)?.name ?? 'Aruna')
const themeAccent = computed(() => templateById(document.value.templateId)?.accent ?? '#7A8B6F')
const published = computed(() => Boolean(invitation.value?.publishedAt))
// `useRequestURL()` sama di server dan klien — `window.location` di sini memicu ketidakcocokan hidrasi.
const origin = useRequestURL().origin
const publicUrl = computed(() => `${origin}/i/${invitation.value?.slug ?? ''}`)
const pngUrl = computed(() => `${config.public.apiBase}/public/share-card/${invitation.value?.slug ?? ''}.png?v=${revision.value}`)

const canEditDesign = computed(() => designUnlocked({ isOperator: auth.isOperator, features: invitation.value?.features ?? [] }))
const lockedBy = computed(() => designAddon.value ? `Add-on ${designAddon.value.name} (${formatRupiah(designAddon.value.price)}) membukanya.` : undefined)
const templatePensiun = computed(() => {
  const id = document.value?.templateId
  if (!id || isLiveTemplateId(id)) return null
  return templateById(id) ?? null
})

async function loadDesignAddon() {
  if (canEditDesign.value || designAddon.value) return
  try {
    const catalog = await fetchCatalog()
    designAddon.value = catalog.addons.find(addon => addon.id === designFeatureId) ?? null
  } catch { designAddon.value = null }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await invitationsApi.get(String(route.params.id))
    invitation.value = result
    const asli = (result.document as InvitationDocument | undefined) ?? createDefaultDocument()
    const dimigrasi = migrateLegacyDocument(asli)
    document.value = dimigrasi
    revision.value = result.revision ?? 0
    selectedId.value = document.value.sections[0]?.id ?? 'opening-envelope'
    conflict.value = false
    resetRiwayat()
    await loadDesignAddon()
    // Cuplikan dari dokumen SERVER: draft v1 yang baru dimigrasi jujur terbaca "belum tersimpan".
    savedSnapshot.value = JSON.stringify(asli)
    if (dimigrasi !== asli) toast.message('Undangan diperbarui ke struktur Elegance. Simpan untuk menerapkannya.')
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    loading.value = false
  }
}
await load()

useHead({ title: () => `${invitation.value?.title ?? 'Editor undangan'} — Aruna Dewa` })

/* ── Rail ───────────────────────────────────────────────────────────────────── */
const fokusPanggung = ref<{ type: string, nonce: number } | null>(null)
function fokuskanPanggung(id: string) {
  const type = document.value.sections.find(section => section.id === id)?.type
  if (!type) return
  fokusPanggung.value = { type, nonce: (fokusPanggung.value?.nonce ?? 0) + 1 }
}
function selectSection(id: string) {
  selectedId.value = id
  mobilePanel.value = 'settings'
  if (prefs.value.inspectorTab === 'kartu') prefs.value.inspectorTab = 'bagian'
  fokuskanPanggung(id)
}
watch(mobilePanel, (panel) => { if (panel === 'preview') fokuskanPanggung(selectedId.value) })

function toggleSection(id: string, enabled: boolean) {
  const section = document.value.sections.find(candidate => candidate.id === id)
  if (!section || section.enabled === enabled) return
  checkpoint()
  section.enabled = enabled
}
function move(index: number, direction: -1 | 1) {
  reorder(index, index + direction)
}
/**
 * Urutan baru disusun dari **`toRaw`**, bukan dari `document.value.sections` langsung.
 *
 * `document.value.sections.slice()` menghasilkan larik berisi PROXY tiap bagian, dan menugaskannya
 * kembali menanam proxy itu di dalam dokumen mentah — dulu itu cukup untuk membuat `undo()`
 * melempar dan riwayat habis tanpa mengembalikan apa pun. `toRaw` di sini sabuk kedua, bukan yang
 * pertama: yang benar-benar menutup kelas bug itu adalah `salinDokumen` di `useDocumentHistory`,
 * karena editor menanam proxy juga lewat `ExtrasForm` dan `terapkanPalet`. Keduanya dipertahankan.
 */
function reorder(from: number, to: number) {
  if (!canEditDesign.value) return
  const urutan = pindahkan(toRaw(document.value).sections, from, to)
  if (!urutan) return
  checkpoint()
  document.value.sections = urutan.map(section => toRaw(section))
}

/* ── Tulisan bagian ─────────────────────────────────────────────────────────── */
function tulis(key: string, value: unknown) {
  const section = selected.value
  if (!section) return
  checkpoint()
  section.data[key] = value
}
function tulisGaya(key: string, style: TextStyle | null) {
  const section = selected.value
  if (!section || !canEditDesign.value) return
  checkpoint()
  const styles = { ...((section.data.textStyles as Record<string, TextStyle> | undefined) ?? {}) }
  if (style) styles[key] = style
  else delete styles[key]
  if (Object.keys(styles).length) section.data.textStyles = styles
  else delete section.data.textStyles
}
function tulisLatar(patch: Partial<SectionBackground> | null) {
  const section = selected.value
  if (!section) return
  checkpoint()
  const latar: SectionBackground = { ...((section.data.background as SectionBackground | undefined) ?? {}), ...(patch ?? {}) }
  for (const key of Object.keys(latar) as (keyof SectionBackground)[]) if (latar[key] === undefined || latar[key] === '') delete latar[key]
  if (!patch || !Object.keys(latar).length) delete section.data.background
  else section.data.background = latar
}
function tulisGerak(motion: SectionMotion) {
  const section = selected.value
  if (!section) return
  checkpoint()
  if (motion === 'tema') delete section.data.motion
  else section.data.motion = motion
}

/* ── Global ─────────────────────────────────────────────────────────────────── */
function tulisMusik(patch: { url?: string; title?: string; volume?: number }) {
  checkpoint()
  const settings = { ...(document.value.settings ?? {}) }
  if (patch.url !== undefined) { if (patch.url) settings.musicUrl = patch.url; else { delete settings.musicUrl; delete settings.musicTitle } }
  if (patch.title !== undefined) { if (patch.title && settings.musicUrl) settings.musicTitle = patch.title; else delete settings.musicTitle }
  if (patch.volume !== undefined) settings.musicVolume = patch.volume
  if (Object.keys(settings).length) document.value.settings = settings
  else delete document.value.settings
}
function tulisLayout(layout: LayoutFocus) {
  if (!canEditDesign.value) return
  checkpoint()
  if (layout === 'kartu') delete document.value.tokens.layout
  else document.value.tokens.layout = layout
}
function terapkanPalet(palette: ThemePalette) {
  if (!canEditDesign.value) return
  checkpoint()
  document.value.tokens = { ...document.value.tokens, ...palette.tokens }
}
function tulisWarna(key: 'background' | 'foreground' | 'primary', value: string) {
  if (!canEditDesign.value) return
  checkpoint()
  document.value.tokens[key] = value
}
const paletteIssues = computed(() => checkPalette(document.value.tokens).filter(check => !check.passes))
function repairPaletteColors() {
  if (!canEditDesign.value) return
  checkpoint()
  document.value.tokens = { ...document.value.tokens, ...repairPalette(document.value.tokens) }
  if (paletteIssues.value.length) toast.warning('Warna sudah didekatkan sebisanya. Latar yang sangat gelap masih menyisakan pasangan yang kurang terbaca.')
  else toast.success('Warna disetel ke versi terdekat yang terbaca.')
}
function applyTemplate(id: LiveTemplateId) {
  if (!canEditDesign.value && !templatePensiun.value) return
  const preset = invitationThemes.find(theme => theme.id === id)
  if (!preset) return
  checkpoint()
  document.value.templateId = id
  document.value.tokens = { ...document.value.tokens, ...preset.tokens }
}
function tulisFont(key: 'font' | 'bodyFont', value: FontChoice | '') {
  if (!canEditDesign.value) return
  checkpoint()
  if (key === 'font') { if (value) document.value.tokens.font = value; return }
  if (value) document.value.tokens.bodyFont = value
  else delete document.value.tokens.bodyFont
}
function tulisBackdrop(pilihan: BackdropChoice) {
  checkpoint()
  if (pilihan === 'tema') delete document.value.tokens.backdrop
  else document.value.tokens.backdrop = pilihan
}
function tulisBackdropWeight(bobot: BackdropWeight) {
  checkpoint()
  document.value.tokens.backdropWeight = bobot
}
function tulisMotion(patch: { amplop?: EnvelopeSpeed, masuk?: EntranceStyle | 'tema' }) {
  if (!canEditDesign.value) return
  checkpoint()
  const motion = { ...(document.value.tokens.motion ?? {}) }
  if ('amplop' in patch) { if (patch.amplop && patch.amplop !== 'sedang') motion.amplop = patch.amplop; else delete motion.amplop }
  if ('masuk' in patch) { if (patch.masuk && patch.masuk !== 'tema') motion.masuk = patch.masuk; else delete motion.masuk }
  if (Object.keys(motion).length) document.value.tokens.motion = motion
  else delete document.value.tokens.motion
}

/* ── Kartu bagikan ──────────────────────────────────────────────────────────── */
function tulisKartu(patch: Partial<ShareCardStyle> | null) {
  checkpoint()
  if (!patch) { delete document.value.shareCard; return }
  const kartu = { ...(document.value.shareCard ?? {}), ...patch }
  document.value.shareCard = kartu
}

/* ── Ornamen ────────────────────────────────────────────────────────────────── */
/** Penukaran ornamen hidup di bagian pertama: `opening-envelope` (v2) atau `cover` (v1). */
const ornamentHost = computed(() => document.value.sections.find(section => section.type === 'opening-envelope' || section.type === 'cover'))
const ornamentOverrides = computed(() => toOrnamentOverrides(ornamentHost.value?.data.ornamentOverrides, document.value.templateId))
const ornamentSet = computed(() => themeOrnaments(document.value.templateId))
const slotBagianIni = computed(() => (selected.value ? sectionOrnamentSlots[selected.value.type] ?? [] : []))

const studio = ref<{ slot?: OrnamentSlotKey, layer?: LayerSlot, semula: OrnamentOverrides } | null>(null)
const studioAktif = computed(() => {
  if (!studio.value) return null
  const { slot, layer } = studio.value
  const berlaku = terapkanOverrides(ornamentSet.value, ornamentOverrides.value)
  const aktif = layer ? berlaku.layers.find(id => ornament(id).slot === layer)! : berlaku[slot!]
  return { slot, layer, aktif, bawaan: bawaanSlot({ slot, layer, templateId: document.value.templateId })! }
})
function bukaStudio(target: { slot?: OrnamentSlotKey, layer?: LayerSlot }) {
  if (!canEditDesign.value) return
  checkpoint()
  studio.value = { ...target, semula: salinOverrides() }
}
function tulisOverrides(berikut: OrnamentOverrides) {
  const host = ornamentHost.value
  if (!host) return
  const bersih = toOrnamentOverrides(berikut, document.value.templateId)
  if (Object.keys(bersih).length) host.data.ornamentOverrides = bersih
  else delete host.data.ornamentOverrides
}
const salinOverrides = (): OrnamentOverrides => ({ ...ornamentOverrides.value, layers: { ...ornamentOverrides.value.layers }, unggahan: { ...ornamentOverrides.value.unggahan } })
function pilihOrnamen(glyph: OrnamentId) {
  const target = studio.value
  if (!target) return
  const berikut = salinOverrides()
  if (target.layer) berikut.layers = { ...berikut.layers, [target.layer]: glyph }
  else { berikut[target.slot!] = glyph; if (berikut.unggahan && bolehUnggah(target.slot!)) delete berikut.unggahan[target.slot!] }
  tulisOverrides(berikut)
}
function pilihUnggahan(item: UploadedOrnament) {
  const target = studio.value
  if (!target?.slot || !bolehUnggah(target.slot)) return
  const berikut = salinOverrides()
  berikut.unggahan = { ...berikut.unggahan, [target.slot]: item }
  delete berikut[target.slot]
  tulisOverrides(berikut)
}
function kembalikanSlot() {
  const target = studio.value
  if (!target) return
  const berikut = salinOverrides()
  if (target.layer) delete berikut.layers?.[target.layer]
  else { delete berikut[target.slot!]; if (bolehUnggah(target.slot!)) delete berikut.unggahan?.[target.slot!] }
  tulisOverrides(berikut)
}
function batalkanStudio() { if (studio.value) tulisOverrides(studio.value.semula) }
function kembalikanSemuaOrnamen() {
  if (!canEditDesign.value) return
  checkpoint()
  tulisOverrides({})
}

/* ── Media ──────────────────────────────────────────────────────────────────── */
const media = useMediaUploads(() => String(route.params.id))
function queueRelease(url: string) {
  if (!url || !mediaAssetIdFromUrl(url)) return
  if (pendingReleases.value.includes(url)) return
  pendingReleases.value = [...pendingReleases.value, url]
}
async function flushReleases(savedDocumentJson: string) {
  const releasing = releasableUrls(pendingReleases.value, savedDocumentJson)
  pendingReleases.value = stillQueued(pendingReleases.value, savedDocumentJson)
  for (const url of releasing) await media.release(url)
}

/* ── Simpan & publikasi ─────────────────────────────────────────────────────── */
async function save() {
  if (saving.value) return
  error.value = ''
  conflict.value = false
  const parsed = invitationDocumentSchema.safeParse(document.value)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    error.value = issue ? `${issue.message}${issue.path.length ? ` (${issue.path.join('.')})` : ''}` : 'Rancangan belum valid.'
    return
  }
  const snapshot = JSON.stringify(document.value)
  saving.value = true
  try {
    const result = await invitationsApi.saveDraft(String(route.params.id), { document: parsed.data, revision: revision.value })
    revision.value = result.revision
    savedSnapshot.value = snapshot
    toast.success('Draft tersimpan.')
    await flushReleases(snapshot)
  } catch (cause) {
    const apiError = cause as { code?: string; message: string }
    conflict.value = apiError.code === 'CONFLICT' || apiError.code === 'REVISION_CONFLICT'
    error.value = apiError.message
  } finally {
    saving.value = false
  }
}

async function publish() {
  if (paletteIssues.value.length) {
    error.value = `Warna undangan belum memenuhi ambang keterbacaan (${paletteIssues.value.length} dari 4 pasangan). Perbaiki di tab Global sebelum menerbitkan.`
    toast.error('Perbaiki kontras warna dulu sebelum menerbitkan.')
    prefs.value.inspectorTab = 'global'
    return
  }
  if (dirty.value) await save()
  if (error.value) return
  publishing.value = true
  try {
    await invitationsApi.publish(String(route.params.id))
    toast.success('Versi publik diperbarui.')
    await load()
    await dialogTerbit()
  } catch (cause) {
    error.value = apiErrorMessage(cause)
    toast.error(error.value)
  } finally {
    publishing.value = false
  }
}

async function dialogTerbit() {
  const jawaban = await confirm({
    title: 'Undangan telah published',
    description: `Undangan Anda sudah aktif. Alamat undangan siap dibagikan kepada para tamu:\n${publicUrl.value}\n\nGunakan menu Generator untuk membuat tautan personal dengan nama setiap tamu.`,
    actions: [
      { id: 'salin', label: 'Salin URL' },
      { id: 'buka', label: 'Buka undangan', tone: 'outline' },
      { id: 'tutup', label: 'Tutup', tone: 'ghost' },
    ],
    dismissId: 'tutup',
  })
  if (jawaban === 'salin') {
    try { await navigator.clipboard.writeText(publicUrl.value); toast.success('URL undangan disalin.') }
    catch { toast.error('Tidak bisa menyalin. Salin manual dari bilah alamat.') }
  }
  if (jawaban === 'buka') window.open(publicUrl.value, '_blank', 'noopener')
}

async function reset() {
  const jawaban = await confirm({
    title: 'Kembalikan ke preset awal?',
    description: 'Seluruh isi draft diganti struktur Elegance bawaan tema ini. Perubahan yang belum tersimpan akan hilang.',
    tone: 'danger',
    actions: [{ id: 'kembali', label: 'Kembali', tone: 'outline' }, { id: 'reset', label: 'Ya, kembalikan', tone: 'ink' }],
    dismissId: 'kembali',
  })
  if (jawaban !== 'reset') return
  checkpoint()
  const couple = document.value.sections.find(section => section.type === 'couple')?.data ?? {}
  const nama = (key: string, fallback: string) => (typeof couple[key] === 'string' && (couple[key] as string).trim()) ? (couple[key] as string) : fallback
  document.value = createDefaultDocument(nama('brideName', nama('partner1', 'Aruna')), nama('groomName', nama('partner2', 'Dewa')), document.value.templateId as LiveTemplateId)
  toast.message('Preset dimuat kembali. Simpan untuk menerapkannya.')
}

/* ── Dialog kecil di baris ikon ─────────────────────────────────────────────── */
function pintasan() {
  alert({
    title: 'Pintasan keyboard',
    description: 'Ctrl/⌘ + Z — undo · Ctrl/⌘ + Shift + Z atau Ctrl + Y — redo · Ctrl/⌘ + S — simpan draft · ↑/↓ pada pegangan bagian — geser urutan · Esc — tutup dialog.',
  })
}
function riwayat() {
  alert({
    title: 'Riwayat versi',
    description: `Draft ini di revisi ${revision.value}. Riwayat versi otomatis (kembali ke versi sebelumnya) menyusul di fase berikutnya; untuk sekarang undo/redo memegang 30 langkah terakhir sesi ini.`,
  })
}
function pustaka() { bukaPustaka({ judul: 'Kelola foto & musik' }) }
async function salinUrl() {
  try { await navigator.clipboard.writeText(publicUrl.value); toast.success('URL undangan disalin.') }
  catch { toast.error('Tidak bisa menyalin. Salin manual dari bilah alamat.') }
}

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  const mengetik = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  const mod = event.metaKey || event.ctrlKey
  if (!mod) return
  if (event.key.toLowerCase() === 's') { event.preventDefault(); if (dirty.value) save(); return }
  if (mengetik) return
  if (event.key.toLowerCase() === 'z' && event.shiftKey) { event.preventDefault(); redo(); return }
  if (event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); return }
  if (event.key.toLowerCase() === 'y') { event.preventDefault(); redo() }
})

/* ── Perubahan yang belum tersimpan ─────────────────────────────────────────── */
onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  const jawaban = await confirm({
    title: 'Perubahan belum tersimpan',
    description: 'Draft ini punya perubahan yang belum dikirim ke server. Mau disimpan dulu sebelum pindah halaman?',
    actions: [
      { id: 'simpan', label: 'Simpan perubahan' },
      { id: 'tinggalkan', label: 'Tinggalkan halaman', tone: 'outline' },
      { id: 'kembali', label: 'Kembali menyunting', tone: 'ghost' },
    ],
    dismissId: 'kembali',
  })
  if (jawaban === 'tinggalkan') return true
  if (jawaban !== 'simpan') return false
  await save()
  return !error.value
})
useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
  if (!dirty.value) return
  event.preventDefault()
})
</script>

<template>
  <DashboardShell v-if="invitation" :invitation-id="invitation.id" :title="invitation.title" width="wide" variant="studio">
    <div class="flex min-h-0 flex-col lg:h-full">
      <DashboardEditorToolbar
        :title="invitation.title"
        :slug="invitation.slug"
        :invitation-id="invitation.id"
        :theme-name="themeName"
        :revision="revision"
        :dirty="dirty"
        :saving="saving"
        :publishing="publishing"
        :published="published"
        :error="error"
        :conflict="conflict"
        @publish="publish"
        @reload="load"
      />

      <div class="border-b border-border bg-surface px-4 py-2 xl:hidden">
        <div class="flex gap-1 rounded-full bg-surface-3 p-1" role="tablist" aria-label="Panel editor">
          <button
            v-for="tab in [{ id: 'settings', label: 'Pengaturan' }, { id: 'preview', label: 'Pratinjau' }]"
            :id="`editor-panel-${tab.id}`"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="mobilePanel === tab.id"
            :class="cn('min-h-11 flex-1 rounded-full text-[0.9375rem] font-semibold transition-colors duration-200', mobilePanel === tab.id ? 'bg-surface text-ink shadow-hairline' : 'text-ink-muted')"
            @click="mobilePanel = tab.id as 'settings' | 'preview'"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!--
        Tiga tingkat: satu kolom di bawah `lg`, rail + (panggung|inspektor) di `lg`, tiga kolom di
        `xl`. `minmax(0,1fr)` di setiap tingkat — `auto` membuat panggung menolak menyusut.
        Rail dan inspektor yang diciutkan menyusut ke 3.5rem.
      -->
      <div
        :class="cn(
          'grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)]',
          prefs.railCollapsed ? 'lg:grid-cols-[3.5rem_minmax(0,1fr)]' : 'lg:grid-cols-[17rem_minmax(0,1fr)]',
          prefs.railCollapsed
            ? (prefs.inspectorCollapsed ? 'xl:grid-cols-[3.5rem_minmax(0,1fr)_4rem]' : 'xl:grid-cols-[3.5rem_minmax(0,1fr)_24rem] 2xl:grid-cols-[3.5rem_minmax(0,1fr)_26rem]')
            : (prefs.inspectorCollapsed ? 'xl:grid-cols-[17rem_minmax(0,1fr)_4rem]' : 'xl:grid-cols-[17rem_minmax(0,1fr)_24rem] 2xl:grid-cols-[17rem_minmax(0,1fr)_26rem]'),
        )"
      >
        <DashboardEditorSectionRail
          v-model:query="sectionQuery"
          v-model:collapsed="prefs.railCollapsed"
          :entries="sectionEntries"
          :selected-id="selectedId"
          :labels="sectionLabels"
          :can-edit-design="canEditDesign"
          :total="document.sections.length"
          :visible="sectionsVisible"
          :class="cn(mobilePanel === 'preview' && 'hidden lg:grid')"
          @select="selectSection"
          @move="move"
          @reorder="reorder"
          @toggle="toggleSection"
        />

        <section
          v-if="prefs.inspectorTab === 'kartu'"
          :class="cn('min-h-0 overflow-y-auto bg-surface-3 [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] p-5', mobilePanel === 'settings' && 'hidden xl:block')"
          aria-label="Pratinjau kartu bagikan"
        >
          <DashboardEditorShareCardPreview :document="document" :slug="invitation.slug" :png-url="pngUrl" />
        </section>
        <DashboardEditorStage
          v-else
          v-model:device="prefs.device"
          v-model:zoom="prefs.zoom"
          :document="document"
          :focus-section="fokusPanggung"
          :class="cn(mobilePanel === 'settings' && 'hidden xl:flex')"
        />

        <DashboardEditorInspector
          v-if="selected"
          v-model:tab="prefs.inspectorTab"
          v-model:collapsed="prefs.inspectorCollapsed"
          :can-undo="canUndo"
          :can-redo="canRedo"
          :dirty="dirty"
          :saving="saving"
          :class="cn(mobilePanel === 'preview' && 'hidden xl:grid')"
          @undo="undo"
          @redo="redo"
          @save="() => save()"
          @pustaka="pustaka"
          @riwayat="riwayat"
          @pintasan="pintasan"
        >
          <template #bagian>
            <DashboardEditorSectionForm
              v-if="isV2SectionType(selected.type)"
              :key="selected.id"
              :section="selected"
              :document="document"
              :invitation-id="invitation.id"
              :can-edit-design="canEditDesign"
              :locked-by="lockedBy"
              @tulis="tulis"
              @tulis-gaya="tulisGaya"
              @tulis-latar="tulisLatar"
              @tulis-gerak="tulisGerak"
              @release="queueRelease"
            />
            <p v-else class="notice m-0">Bagian {{ sectionLabels[selected.type] ?? selected.type }} berasal dari struktur lama. Simpan draft untuk memindahkannya ke struktur baru.</p>

            <UiButton id="editor-reset" tone="quiet" size="sm" class="justify-self-start" @click="reset">
              <RotateCcw :size="15" aria-hidden="true" />
              Kembalikan ke preset tema
            </UiButton>
          </template>

          <template #global>
            <DashboardEditorGlobalPanel
              :document="document"
              :can-edit-design="canEditDesign"
              :locked-by="lockedBy"
              :template-pensiun="templatePensiun"
              :accent="themeAccent"
              @musik="tulisMusik"
              @layout="tulisLayout"
              @palet="terapkanPalet"
              @warna="tulisWarna"
              @perbaiki-warna="repairPaletteColors"
              @tema="applyTemplate"
              @font="tulisFont"
              @backdrop="tulisBackdrop"
              @backdrop-weight="tulisBackdropWeight"
              @motion="tulisMotion"
            />
          </template>

          <template #ornamen>
            <p v-if="!canEditDesign" class="m-0 flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3.5 text-[0.8125rem] text-ink-muted">
              <Lock :size="15" class="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
              <span>Mengganti ornamen terkunci pada preset undangan ini. <span v-if="lockedBy" class="text-ink">{{ lockedBy }}</span></span>
            </p>
            <DashboardOrnamentSlotSummary
              v-if="slotBagianIni.length"
              :set="ornamentSet"
              :overrides="ornamentOverrides"
              :slots="slotBagianIni"
              :tokens="document.tokens"
              :accent="themeAccent"
              :terkunci="!canEditDesign"
              :locked-by="lockedBy"
              @buka="bukaStudio"
            />
            <p v-else class="m-0 rounded-md border border-border bg-surface-2 p-3.5 text-caption text-ink-muted">
              Bagian {{ sectionLabels[selected.type] ?? selected.type }} tidak memakai keping ornamen; latar ladangnya mengikuti tema.
            </p>
            <DashboardOrnamentSlotSummary
              :set="ornamentSet"
              :overrides="ornamentOverrides"
              :tokens="document.tokens"
              :accent="themeAccent"
              :terkunci="!canEditDesign"
              :locked-by="lockedBy"
              @buka="bukaStudio"
              @kembalikan-semua="kembalikanSemuaOrnamen"
            />
          </template>

          <template #kartu>
            <DashboardEditorKartuPanel :document="document" @tulis="tulisKartu" />
            <div class="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-2 p-3.5 text-caption text-ink-muted">
              <span class="min-w-0 flex-1 truncate">{{ publicUrl }}</span>
              <button id="editor-kartu-salin-url" type="button" class="flex items-center gap-1 text-ink underline-offset-2 hover:underline" @click="salinUrl">
                <Copy :size="13" aria-hidden="true" /> Salin
              </button>
              <a :href="publicUrl" target="_blank" rel="noopener" class="flex items-center gap-1 text-ink underline-offset-2 hover:underline">
                <ExternalLink :size="13" aria-hidden="true" /> Buka
              </a>
            </div>
          </template>
        </DashboardEditorInspector>
      </div>
    </div>

    <!-- Dialog ber-portal dipasang di dalam `DashboardShell`, bukan di cabang memuat/galat (lihat fase 59). -->
    <DashboardOrnamentStudio
      v-if="studioAktif"
      :open="Boolean(studio)"
      :slot-key="studioAktif.slot"
      :layer="studioAktif.layer"
      :template-id="document.templateId"
      :aktif="studioAktif.aktif"
      :bawaan="studioAktif.bawaan"
      :tokens="document.tokens"
      :accent="themeAccent"
      :invitation-id="invitation.id"
      @update:open="terbuka => { if (!terbuka) studio = null }"
      @pilih="pilihOrnamen"
      @pilih-unggahan="pilihUnggahan"
      @kembalikan="kembalikanSlot"
      @batal="batalkanStudio"
    />
    <DashboardMediaLibrary :invitation-id="invitation.id" />
  </DashboardShell>

  <div v-else class="shell section grid gap-4">
    <p v-if="loading" class="m-0 text-ink-muted">Memuat editor…</p>
    <p v-else class="notice m-0" role="alert">
      {{ error }}
      <button id="editor-retry" class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
    </p>
  </div>
</template>
