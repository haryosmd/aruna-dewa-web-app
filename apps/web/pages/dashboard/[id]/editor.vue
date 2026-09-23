<script setup lang="ts">
import { Copy, ExternalLink, Lock, RotateCcw } from 'lucide-vue-next'
import type {
  BackdropChoice, BackdropWeight, EntranceStyle, EnvelopeSpeed, FontChoice, LayoutFocus, LiveTemplateId,
  SectionBackground, SectionMotion, ShareCardStyle, TextStyle,
} from '@aruna/contracts'
import type { RevisionSummary } from '@aruna/contracts/api'
import {
  canEditDesign as designUnlocked, createDefaultDocument, defaultInputFromDocument, designFeatureId, documentStructureId, documentThemeId,
  invitationDocumentSchema, isLiveTemplateId, liveStructureIds, maxGalleryPhotoLimit, restructureDocument, sectionMeta, structures, type StructureId,
  isV2SectionType, migrateLegacyDocument, templateById,
} from '@aruna/contracts'
import { toOrnamentOverrides } from '~/utils/invitation-options'
import {
  arahDariPutar, bacaKanvas, lapisBaru, normalSudut, slotDariKunci, terapkanKeping, terapkanTambahan, type AksiKanvas, type ArahSudut, type InfoKeping, type Kanvas,
  putarUntukArah,
} from '~/utils/kanvas'
import { sectionDomId } from '~/utils/editor-sections'
import { maksTambahanKanvas, sectionFields as kolomBagian, type V2SectionType } from '@aruna/contracts'
import type { OrnamentCategory } from '~/utils/ornaments'
import { ornamentRamp, rampStyle } from '~/utils/ornament-palette'
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
const dashPrefs = useDashboardPrefs()

/*
 * Fokus pratinjau (fase 81): satu tombol yang melipat navigasi, rail, dan inspektor sekaligus.
 * Tanpa ini desktop 1280 di kolom panggung 528px (1440×900, semua panel terbuka) hanya bisa
 * dipratinjau di ±0,37. Keadaan sebelumnya diingat supaya menekan lagi mengembalikan persis apa
 * yang tadi terbuka, bukan membuka semuanya.
 */
const fokus = computed(() => prefs.value.railCollapsed && prefs.value.inspectorCollapsed && dashPrefs.value.sidebarCollapsed)
let sebelumFokus: { rail: boolean, inspector: boolean, nav: boolean } | null = null
function toggleFokus() {
  if (fokus.value) {
    const awal = sebelumFokus ?? { rail: false, inspector: false, nav: false }
    sebelumFokus = null
    prefs.value = { ...prefs.value, railCollapsed: awal.rail, inspectorCollapsed: awal.inspector }
    dashPrefs.value = { ...dashPrefs.value, sidebarCollapsed: awal.nav }
    return
  }
  sebelumFokus = { rail: prefs.value.railCollapsed, inspector: prefs.value.inspectorCollapsed, nav: dashPrefs.value.sidebarCollapsed }
  prefs.value = { ...prefs.value, railCollapsed: true, inspectorCollapsed: true }
  dashPrefs.value = { ...dashPrefs.value, sidebarCollapsed: true }
}
/** Nonce ▶ gerak (fase 81): naik → panggung memutar ulang gerak masuk yang sedang terlihat. */
const putarGerak = ref(0)
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
/**
 * Kuota foto galeri, DARI SERVER (fase 75). Tidak dihitung ulang di sini dan tidak diturunkan dari
 * `features`: entitlement cuma daftar fitur, dan dua paket bisa membuka fitur yang sama dengan
 * kuota berbeda. Sebelum jawaban pertama datang, plafon katalog dipakai supaya form tidak sempat
 * menampilkan angka yang lebih kecil lalu melompat.
 */
const photoLimit = computed(() => invitation.value?.photoLimit ?? maxGalleryPhotoLimit)
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

/**
 * Panggung → rail (fase 76): bagian yang sedang berdiri di tengah layar ikut ditandai di rail.
 *
 * Sengaja **bukan** `selectSection`. Yang itu memanggil `fokuskanPanggung()`, dan panggilan itu
 * akan menggulir panggung ke bagian yang baru saja digulir sendiri oleh pasangan — pantulan yang
 * terbaca sebagai panggung yang menolak digulir.
 *
 * **Dan sejak fase 80 ia juga bukan `selectedId`.** Sebelumnya sorotan ini menulis `selectedId`,
 * yang sama dengan kunci form Inspector — jadi menambah satu langkah cerita (bagiannya memanjang,
 * posisi gulir yang sama kini jatuh di Rundown) mengganti form yang sedang diisi pasangan dengan
 * form Rundown. Gulir kini hanya memindahkan penanda; form hanya berganti oleh klik.
 */
const terlihatId = ref<string | null>(null)
function sorotSection(type: string) {
  terlihatId.value = document.value.sections.find(section => section.type === type)?.id ?? null
}

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
 * melempar dan riwayat habis tanpa mengembalikan apa pun.
 *
 * Reorder BUKAN satu-satunya penanam, dan itu yang membuat perbaikan 2026-09-20 terbaca lebih
 * lengkap dari yang sebenarnya. Enam situs menanam proxy sampai fase 74.1: keempat penulis larik
 * di `ExtrasForm`, `tulisGaya()` yang menyalin dangkal `textStyles` berisi objek, dan ketiga
 * penulis `tokens` yang membawa `tokens.motion` by-reference. Semuanya kini lewat `bersihkan()`,
 * dan `salinDokumen` di `useDocumentHistory` tinggal jaring terakhir.
 */
function reorder(from: number, to: number) {
  if (!canEditDesign.value) return
  const urutan = pindahkan(toRaw(document.value).sections, from, to)
  if (!urutan) return
  checkpoint()
  document.value.sections = urutan.map(section => toRaw(section))
}

/* ── Tulisan bagian ─────────────────────────────────────────────────────────── */
/**
 * Gerbang tunggal yang dilewati setiap form bagian, termasuk `ExtrasForm`.
 *
 * `bersihkan()` bukan kehati-hatian berlebih: `ExtrasForm` menyusun larik barunya dari
 * `props.section.data[key]`, jadi `[...rows('steps'), {…}]` membawa SELURUH baris lama sebagai
 * proxy Vue. Dibersihkan di sini sekali, keempat penulis di sana ikut tertutup.
 */
function tulis(key: string, value: unknown) {
  const section = selected.value
  if (!section) return
  checkpoint()
  section.data[key] = bersihkan(value)
}
function tulisGaya(key: string, style: TextStyle | null) {
  const section = selected.value
  if (!section || !canEditDesign.value) return
  checkpoint()
  // Salinan dangkal: tiap nilai `textStyles` adalah OBJEK, jadi tanpa `bersihkan` gaya yang
  // sudah ada masuk kembali ke dokumen sebagai proxy.
  const styles = bersihkan({ ...((section.data.textStyles as Record<string, TextStyle> | undefined) ?? {}) })
  if (style) styles[key] = bersihkan(style)
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
  // `tokens.motion` (fase 69) adalah objek: sebaran dangkal membawanya by-reference, jadi
  // proxy-nya ditanam kembali ke dokumen mentah. Sama untuk dua penulis `tokens` di bawah.
  document.value.tokens = bersihkan({ ...document.value.tokens, ...palette.tokens })
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
  document.value.tokens = bersihkan({ ...document.value.tokens, ...repairPalette(document.value.tokens) })
  if (paletteIssues.value.length) toast.warning('Warna sudah didekatkan sebisanya. Latar yang sangat gelap masih menyisakan pasangan yang kurang terbaca.')
  else toast.success('Warna disetel ke versi terdekat yang terbaca.')
}
function applyTemplate(id: LiveTemplateId) {
  if (!canEditDesign.value && !templatePensiun.value) return
  const preset = invitationThemes.find(theme => theme.id === id)
  if (!preset) return
  checkpoint()
  document.value.templateId = id
  document.value.tokens = bersihkan({ ...document.value.tokens, ...preset.tokens })
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

const studio = ref<{
  slot?: OrnamentSlotKey
  layer?: LayerSlot
  semula: OrnamentOverrides
  /** Fase 81: ganti satu keping di tempatnya saja. */
  keping?: InfoKeping
  /** Fase 81: tambah ornamen ke bagian; `id` terisi sesudah pilihan pertama. */
  tambah?: { bagianId: string, id?: string }
  semulaKanvas?: { bagianId: string, kanvas: unknown }
} | null>(null)
const studioAktif = computed(() => {
  if (!studio.value) return null
  if (studio.value.keping) return studioKeping(studio.value.keping)
  if (studio.value.tambah) return studioTambah(studio.value.tambah)
  const { slot, layer } = studio.value
  const berlaku = terapkanOverrides(ornamentSet.value, ornamentOverrides.value)
  const aktif = layer ? berlaku.layers.find(id => ornament(id).slot === layer)! : berlaku[slot!]
  return {
    slot, layer, aktif: aktif ?? null, bawaan: bawaanSlot({ slot, layer, templateId: document.value.templateId }) ?? null,
    mode: 'slot' as const, kategori: undefined as OrnamentCategory | undefined, tempat: undefined as string | undefined, arah: null as ArahSudut | null,
  }
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
  if (target.keping) { ubahKanvas(target.keping, { glyph, unggahan: undefined }, false); return }
  if (target.tambah) { tambahkanPilihan(target.tambah, { glyph }); return }
  const berikut = salinOverrides()
  if (target.layer) berikut.layers = { ...berikut.layers, [target.layer]: glyph }
  else { berikut[target.slot!] = glyph; if (berikut.unggahan && bolehUnggah(target.slot!)) delete berikut.unggahan[target.slot!] }
  tulisOverrides(berikut)
}
function pilihUnggahan(item: UploadedOrnament) {
  const target = studio.value
  if (target?.keping) { ubahKanvas(target.keping, { unggahan: item, glyph: undefined }, false); return }
  if (target?.tambah) { tambahkanPilihan(target.tambah, { unggahan: item }); return }
  if (!target?.slot || !bolehUnggah(target.slot)) return
  const berikut = salinOverrides()
  berikut.unggahan = { ...berikut.unggahan, [target.slot]: item }
  delete berikut[target.slot]
  tulisOverrides(berikut)
}
function kembalikanSlot() {
  const target = studio.value
  if (!target) return
  if (target.keping) { ubahKanvas(target.keping, { glyph: undefined, unggahan: undefined }, false); return }
  if (target.tambah) return
  const berikut = salinOverrides()
  if (target.layer) delete berikut.layers?.[target.layer]
  else { delete berikut[target.slot!]; if (bolehUnggah(target.slot!)) delete berikut.unggahan?.[target.slot!] }
  tulisOverrides(berikut)
}
function batalkanStudio() {
  const target = studio.value
  if (!target) return
  tulisOverrides(target.semula)
  if (target.semulaKanvas) {
    const section = bagianDari(target.semulaKanvas.bagianId)
    if (section) {
      if (target.semulaKanvas.kanvas) section.data.kanvas = bersihkan(target.semulaKanvas.kanvas)
      else delete section.data.kanvas
    }
    if (target.tambah?.id && kepingTerpilih.value?.kunci === `a:${target.tambah.id}`) kepingTerpilih.value = null
  }
}
function tutupStudio() {
  const target = studio.value
  studio.value = null
  // Ornamen tambahan yang baru jadi langsung terpilih: pasangan biasanya ingin segera memindahnya.
  if (target?.tambah?.id) {
    const kunci = `a:${target.tambah.id}`
    kepingTerpilih.value = { bagianId: target.tambah.bagianId, kunci, label: 'Ornamen tambahan', jenis: 'tambahan', terkunci: false, tersembunyi: false }
  }
}

/* ── Kanvas bebas (fase 81) ─────────────────────────────────────────────────── */
/**
 * Keping yang dipilih di kanvas panggung. Memilihnya membuka bagiannya di form dan tab Elemen —
 * klik adalah klik, jadi aturan fase 80 "hanya klik yang mengganti form" tetap terpenuhi.
 */
const kepingTerpilih = ref<InfoKeping | null>(null)
const daftarKeping = ref<InfoKeping[]>([])
function terimaDaftar(daftar: InfoKeping[]) { daftarKeping.value = daftar }
const bagianDari = (id: string) => document.value.sections.find(section => section.id === id)
watch(() => kepingTerpilih.value && `${kepingTerpilih.value.bagianId}|${kepingTerpilih.value.kunci}`, (kunci) => {
  const info = kepingTerpilih.value
  if (!kunci || !info) return
  if (selectedId.value !== info.bagianId) selectedId.value = info.bagianId
  prefs.value.inspectorTab = 'elemen'
})
/** Pilihan dari rail menutup pilihan keping di bagian lain. */
watch(selectedId, (id) => { if (kepingTerpilih.value && kepingTerpilih.value.bagianId !== id) kepingTerpilih.value = null })

function kanvasBagian(section: { data: Record<string, unknown> }): Kanvas | undefined {
  return section.data.kanvas ? bersihkan(section.data.kanvas as Kanvas) : undefined
}
function simpanKanvas(section: { data: Record<string, unknown> }, kanvas: Kanvas | undefined) {
  if (kanvas) section.data.kanvas = kanvas
  else delete section.data.kanvas
}

/** Satu-satunya penulis kanvas. `catat` = satu langkah undo (gerakan pertama sebuah seretan). */
function ubahKanvas(target: Pick<InfoKeping, 'bagianId' | 'kunci' | 'jenis'>, patch: Record<string, unknown> | null, catat = true) {
  if (!canEditDesign.value) return
  const section = bagianDari(target.bagianId)
  if (!section) return
  if (catat) checkpoint()
  const kanvas = kanvasBagian(section)
  const bersihPatch = patch ? bersihkan(patch) : null
  simpanKanvas(section, target.jenis === 'tambahan'
    ? terapkanTambahan(kanvas, target.kunci.slice(2), bersihPatch)
    : terapkanKeping(kanvas, target.kunci, bersihPatch))
}

/** Nilai tersimpan keping terpilih — dibaca panel Elemen dan aksi toggle. */
function nilaiKeping(target: Pick<InfoKeping, 'bagianId' | 'kunci' | 'jenis'> | null): Record<string, unknown> {
  if (!target) return {}
  const kanvas = bacaKanvas(bagianDari(target.bagianId)?.data)
  if (target.jenis === 'tambahan') return { ...(kanvas.tambahan.find(item => `a:${item.id}` === target.kunci) ?? {}) }
  return { ...(kanvas.keping[target.kunci] ?? {}) }
}
const nilaiTerpilih = computed(() => nilaiKeping(kepingTerpilih.value))
/** Ringkasan per keping untuk daftar Lapisan: urutan, arah (pratinjau kecilnya), dan cuplikan teks. */
const ringkasDaftar = computed(() => Object.fromEntries(daftarKeping.value.map((item) => {
  const nilai = nilaiKeping(item)
  const teks = item.jenis === 'teks' ? String(bagianDari(item.bagianId)?.data[item.kunci.slice(2)] ?? '').slice(0, 60) : undefined
  return [item.kunci, {
    lapis: nilai.lapis as number | undefined, putar: nilai.putar as number | undefined,
    cerminX: nilai.cerminX as boolean | undefined, cerminY: nilai.cerminY as boolean | undefined, teks,
  }]
})))
const rampLapisan = computed(() => rampStyle(ornamentRamp(document.value.tokens, themeAccent.value)))
const jumlahTambahan = computed(() => (selected.value ? bacaKanvas(selected.value.data).tambahan.length : 0))
/** Keping kanvas dipakai terus — nilai terkunci/tersembunyi dari dokumen, bukan dari DOM saat diklik. */
const kepingSegar = computed(() => {
  const info = kepingTerpilih.value
  if (!info) return null
  const nilai = nilaiTerpilih.value
  return { ...info, terkunci: Boolean(nilai.terkunci), tersembunyi: nilai.tampil === false }
})

/** Isi dan ukuran huruf kolom teks yang dipilih. */
const kolomTerpilih = computed(() => {
  const info = kepingTerpilih.value
  if (info?.jenis !== 'teks') return undefined
  const type = bagianDari(info.bagianId)?.type as V2SectionType | undefined
  return type ? kolomBagian[type]?.find(field => field.key === info.kunci.slice(2)) : undefined
})
const teksTerpilih = computed(() => {
  const info = kepingTerpilih.value
  return info?.jenis === 'teks' ? String(bagianDari(info.bagianId)?.data[info.kunci.slice(2)] ?? '') : undefined
})
const hurufTerpilih = computed(() => {
  const info = kepingTerpilih.value
  if (info?.jenis !== 'teks') return undefined
  const gaya = (bagianDari(info.bagianId)?.data.textStyles as Record<string, TextStyle> | undefined)?.[info.kunci.slice(2)]
  if (gaya?.fontSize) return gaya.fontSize
  // Belum pernah diubah: ukuran yang sedang dirender, supaya kolomnya tidak kosong.
  const el = globalThis.document?.querySelector<HTMLElement>(`[data-iv-el="${info.kunci}"][data-iv-bagian="${info.bagianId}"]`)
  return el ? Math.round(Number.parseFloat(getComputedStyle(el).fontSize)) : undefined
})

function tulisTeksKanvas(target: InfoKeping, nilai: string) {
  const section = bagianDari(target.bagianId)
  if (!section || target.jenis !== 'teks') return
  checkpoint()
  section.data[target.kunci.slice(2)] = nilai
}
function ukurTeksKanvas(target: InfoKeping, ukuran: number, catat = true) {
  const section = bagianDari(target.bagianId)
  if (!section || !canEditDesign.value || target.jenis !== 'teks') return
  if (catat) checkpoint()
  const kolom = target.kunci.slice(2)
  const styles = bersihkan({ ...((section.data.textStyles as Record<string, TextStyle> | undefined) ?? {}) })
  styles[kolom] = { ...(styles[kolom] ?? {}), fontSize: Math.round(Math.min(96, Math.max(10, ukuran))) }
  section.data.textStyles = styles
}

function aksiKanvas(nama: AksiKanvas, target: InfoKeping) {
  const nilai = nilaiKeping(target)
  switch (nama) {
    case 'ganti': bukaStudioKeping(target); return
    case 'kunci': ubahKanvas(target, { terkunci: nilai.terkunci ? undefined : true }); return
    case 'sembunyikan': ubahKanvas(target, { tampil: false }); return
    case 'putar90': ubahKanvas(target, { putar: normalSudut(Number(nilai.putar ?? 0) + 90) || undefined }); return
    case 'cerminX': ubahKanvas(target, { cerminX: nilai.cerminX ? undefined : true }); return
    case 'kembalikan': ubahKanvas(target, null); return
    case 'hapus':
      ubahKanvas(target, null)
      if (kepingTerpilih.value?.kunci === target.kunci) kepingTerpilih.value = null
      return
    case 'putarGerak': putarGerak.value++; return
    case 'depan': case 'belakang': case 'naik': case 'turun': {
      const daftar = daftarKeping.value.filter(item => item.bagianId === target.bagianId)
        .map(item => ({ kunci: item.kunci, lapis: nilaiKeping(item).lapis as number | undefined }))
      ubahKanvas(target, { lapis: lapisBaru(daftar.length ? daftar : [{ kunci: target.kunci }], target.kunci, nama) })
    }
  }
}
function tampilKeping(target: InfoKeping, tampil: boolean) {
  ubahKanvas(target, { tampil: tampil ? true : false })
}

/** Studio untuk SATU keping: sudut hanya sudut, ladang hanya ladang, dst. */
function studioKeping(info: InfoKeping) {
  const nilai = nilaiKeping(info)
  const slot = slotDariKunci(info.kunci) ?? undefined
  const aktif = (nilai.unggahan as UploadedOrnament | undefined) ?? (nilai.glyph as OrnamentId | undefined) ?? (info.glyph as OrnamentId | undefined) ?? null
  const kategori = !slot && info.glyph ? ornament(info.glyph as OrnamentId).category : undefined
  return {
    slot, layer: undefined, aktif, bawaan: null, mode: 'keping' as const, kategori,
    tempat: `${sectionLabels[bagianDari(info.bagianId)?.type ?? ''] ?? ''} · ${info.label}`,
    arah: slot === 'corner' ? arahDariPutar(info.kunci.split(':')[2] ?? '', Number(nilai.putar ?? 0)) : null,
  }
}
function studioTambah(target: { bagianId: string, id?: string }) {
  const item = target.id ? bacaKanvas(bagianDari(target.bagianId)?.data).tambahan.find(baris => baris.id === target.id) : undefined
  return {
    slot: undefined, layer: undefined, aktif: (item?.unggahan ?? item?.glyph ?? null) as OrnamentId | UploadedOrnament | null,
    bawaan: null, mode: 'tambah' as const, kategori: undefined as OrnamentCategory | undefined, tempat: undefined, arah: null,
  }
}
function bukaStudioKeping(info: InfoKeping) {
  if (!canEditDesign.value) return
  if (nilaiKeping(info).terkunci) { toast.message('Keping ini terkunci. Buka kuncinya di tab Elemen untuk menggantinya dari kanvas.'); return }
  const section = bagianDari(info.bagianId)
  checkpoint()
  studio.value = { keping: info, semula: salinOverrides(), semulaKanvas: { bagianId: info.bagianId, kanvas: section?.data.kanvas ? bersihkan(section.data.kanvas) : undefined } }
}
function bukaTambahOrnamen() {
  const section = selected.value
  if (!canEditDesign.value || !section) return
  if (bacaKanvas(section.data).tambahan.length >= maksTambahanKanvas) return
  checkpoint()
  studio.value = { tambah: { bagianId: section.id }, semula: salinOverrides(), semulaKanvas: { bagianId: section.id, kanvas: section.data.kanvas ? bersihkan(section.data.kanvas) : undefined } }
}
/** Pilihan pertama di mode tambah melahirkan ornamennya di tengah bagian; pilihan berikutnya menggantinya. */
function tambahkanPilihan(target: { bagianId: string, id?: string }, sumber: { glyph?: OrnamentId, unggahan?: UploadedOrnament }) {
  const section = bagianDari(target.bagianId)
  if (!section) return
  const kanvas = kanvasBagian(section)
  if (target.id) {
    simpanKanvas(section, terapkanTambahan(kanvas, target.id, { glyph: sumber.glyph, unggahan: sumber.unggahan }))
    return
  }
  const id = `t-${Date.now().toString(36)}`
  // Tengah bagian yang sedang terlihat, dalam cqw (tinggi ÷ lebar render).
  const el = globalThis.document?.getElementById(sectionDomId(section.type))
  const y = el && el.clientWidth ? Math.round((el.clientHeight / el.clientWidth) * 50) : 30
  simpanKanvas(section, { ...kanvas, tambahan: [...(kanvas?.tambahan ?? []), bersihkan({ id, ...sumber, x: 50, y, lebar: 28 })] })
  target.id = id
}
/** "Terapkan ke semua sudut": pilihan tempat ini jadi nilai slot, dan tempat lain berhenti menimpanya. */
function terapkanKeSemua() {
  const target = studio.value?.keping
  if (!target) return
  const slot = slotDariKunci(target.kunci)
  const glyph = nilaiKeping(target).glyph as OrnamentId | undefined
  if (!slot || !glyph) return
  const berikut = salinOverrides()
  berikut[slot] = glyph
  if (berikut.unggahan && bolehUnggah(slot)) delete berikut.unggahan[slot]
  tulisOverrides(berikut)
  for (const section of document.value.sections) {
    const kanvas = kanvasBagian(section)
    if (!kanvas?.keping) continue
    let hasil: Kanvas | undefined = kanvas
    for (const kunci of Object.keys(kanvas.keping)) {
      if (kunci.startsWith(`o:${slot}:`)) hasil = terapkanKeping(hasil, kunci, { glyph: undefined, unggahan: undefined })
    }
    simpanKanvas(section, hasil)
  }
  toast.message('Dipakai di semua tempat sejenis.')
}
function arahStudio(arah: ArahSudut) {
  const target = studio.value?.keping
  if (!target) return
  ubahKanvas(target, { putar: putarUntukArah(target.kunci.split(':')[2] ?? '', arah) || undefined }, false)
}

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

/**
 * Pindah struktur undangan (fase 74.11).
 *
 * BUKAN klik di grid tema, dengan sengaja: ia mengganti seluruh dokumen, bukan paletnya. Jadi
 * tempatnya di sebelah `reset()`, dengan dialog yang MENYEBUTKAN apa yang terbawa dan apa yang
 * hilang — pasangan yang menekan ini berhak tahu bahwa bagian yang tidak ada di struktur tujuan
 * tidak akan kembali.
 *
 * Digerbangi `canEditDesign`: ia superset dari menggeser urutan, yang sudah digerbangi.
 */
/** Struktur hidup selain yang sedang dipakai. Kosong hari ini, dan kontrolnya ikut tidak tampil. */
const strukturLain = computed(() => liveStructureIds.filter(id => id !== documentStructureId(document.value)))

async function pindahStruktur(tujuan: StructureId) {
  if (!canEditDesign.value) return
  const sekarang = documentStructureId(document.value)
  if (sekarang === tujuan) return
  const hilang = [...new Set(document.value.sections.map(section => section.type))]
    .filter(type => !structures[tujuan].sectionTypes.includes(type))
    .map(type => sectionMeta[type as keyof typeof sectionMeta]?.label ?? type)
  const jawaban = await confirm({
    title: `Pindah ke ${structures[tujuan].name}?`,
    description: hilang.length
      ? `Isi yang sudah kalian tulis dibawa menurut jenis bagiannya, dan warna serta ornamen tetap. Yang tidak ada di tampilan ini akan hilang: ${hilang.join(', ')}.`
      : 'Isi yang sudah kalian tulis dibawa menurut jenis bagiannya; warna, ornamen, dan musik tetap.',
    tone: 'danger',
    actions: [{ id: 'batal', label: 'Batal', tone: 'outline' }, { id: 'pindah', label: 'Ya, pindah', tone: 'ink' }],
    dismissId: 'batal',
  })
  if (jawaban !== 'pindah') return
  checkpoint()
  document.value = bersihkan(restructureDocument(toRaw(document.value), tujuan))
  toast.message('Tampilan diganti. Simpan untuk menerapkannya.')
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
  /*
   * Tema, struktur, DAN fakta acara ikut terbawa.
   *
   * Barisnya sudah mengoper tema sejak dulu; strukturnya harus ikut sejak fase 74.9, kalau tidak
   * pasangan yang menekan "kembalikan preset" diam-diam kehilangan strukturnya dan mendapat
   * `elegance` bawaan. Argumen keempat dulu `{}`, dan itu cacat ketiga yang lolos lebih lama:
   * tanggal, gedung, dan alamat yang diisi di wizard `/order` dibuang, jadi "kembalikan ke preset"
   * juga berarti "lupakan kapan dan di mana menikahnya" — seluruh bagian acara kembali ke
   * "Hari / 00 / Bulan Tahun" dan lokasinya jadi "Lokasi akan diumumkan".
   */
  const masukan = defaultInputFromDocument(document.value, { partner1: 'Aruna', partner2: 'Dewa' })
  document.value = createDefaultDocument(
    masukan.partner1,
    masukan.partner2,
    documentThemeId(document.value),
    masukan,
    documentStructureId(document.value),
  )
  toast.message('Preset dimuat kembali. Simpan untuk menerapkannya.')
}

/* ── Dialog kecil di baris ikon ─────────────────────────────────────────────── */
function pintasan() {
  alert({
    title: 'Pintasan keyboard',
    description: 'Ctrl/⌘ + Z — undo · Ctrl/⌘ + Shift + Z atau Ctrl + Y — redo · Ctrl/⌘ + S — simpan draft · ↑/↓ pada pegangan bagian — geser urutan · Esc — tutup dialog.',
  })
}
/* ── Riwayat versi (fase 75) ────────────────────────────────────────────────── */
const riwayatOpen = ref(false)
const riwayatList = ref<RevisionSummary[]>([])
const riwayatLoading = ref(false)
const riwayatError = ref('')
const riwayatRestoring = ref<number | null>(null)

async function riwayat() {
  riwayatOpen.value = true
  riwayatError.value = ''
  riwayatLoading.value = true
  try { riwayatList.value = await invitationsApi.listRevisions(String(route.params.id)) }
  catch (cause) { riwayatError.value = apiErrorMessage(cause) }
  finally { riwayatLoading.value = false }
}

/**
 * Memulihkan menulis ke draft lewat endpoint yang memakai jalur simpan yang sama, jadi gerbang
 * desain dan penjaga konflik revisi tetap berlaku. Yang dikerjakan di sini cuma akibatnya di layar:
 * dokumen lokal diganti, revisi lokal ikut naik, dan `checkpoint()` dipanggil LEBIH DULU supaya
 * pemulihan bisa di-undo dalam sesi yang sama.
 */
async function pulihkan(target: number) {
  const jawaban = await confirm({
    title: `Pulihkan versi ${target}?`,
    description: 'Isi draft sekarang diganti isi versi itu, dan perubahan yang belum tersimpan hilang. Tamu belum melihatnya sampai kalian menekan Publikasikan lagi.',
    tone: 'danger',
    actions: [{ id: 'batal', label: 'Batal', tone: 'outline' }, { id: 'pulihkan', label: 'Ya, pulihkan', tone: 'ink' }],
    dismissId: 'batal',
  })
  if (jawaban !== 'pulihkan') return
  riwayatRestoring.value = target
  riwayatError.value = ''
  try {
    checkpoint()
    const hasil = await invitationsApi.restoreRevision(String(route.params.id), { revision: target, draftRevision: revision.value })
    document.value = bersihkan(hasil.document as InvitationDocument)
    revision.value = hasil.revision
    // Server sudah menyimpannya, jadi draft ini BERSIH — `savedSnapshot` disamakan supaya
    // `dirty` tidak menyala dan pasangan tidak diminta menyimpan sesuatu yang sudah tersimpan.
    savedSnapshot.value = JSON.stringify(document.value)
    riwayatOpen.value = false
    toast.success(`Versi ${target} dipulihkan ke draft. Publikasikan untuk menayangkannya.`)
  } catch (cause) {
    riwayatError.value = apiErrorMessage(cause)
  } finally {
    riwayatRestoring.value = null
  }
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
            :class="cn('min-h-11 flex-1 rounded-full text-ui-lg font-semibold transition-colors duration-200', mobilePanel === tab.id ? 'bg-surface text-ink shadow-hairline' : 'text-ink-muted')"
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
          :visible-id="terlihatId"
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
          :class="cn('min-h-0 overflow-y-auto bg-surface [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] p-5', mobilePanel === 'settings' && 'hidden xl:block')"
          aria-label="Pratinjau kartu bagikan"
        >
          <DashboardEditorShareCardPreview :document="document" :slug="invitation.slug" :png-url="pngUrl" />
        </section>
        <DashboardEditorStage
          v-else
          v-model:device="prefs.device"
          v-model:zoom="prefs.zoom"
          v-model:statis="prefs.statis"
          v-model:terpilih="kepingTerpilih"
          :document="document"
          :focus-section="fokusPanggung"
          :fokus="fokus"
          :putar="putarGerak"
          :bagian-aktif="selectedId"
          :bisa-desain="canEditDesign"
          :class="cn(mobilePanel === 'settings' && 'hidden xl:flex')"
          @section-in-view="sorotSection"
          @fokus="toggleFokus"
          @ubah="ubahKanvas"
          @ukur-teks="ukurTeksKanvas"
          @teks="tulisTeksKanvas"
          @aksi="aksiKanvas"
          @daftar="terimaDaftar"
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
              :photo-limit="photoLimit"
              @tulis="tulis"
              @tulis-gaya="tulisGaya"
              @tulis-latar="tulisLatar"
              @tulis-gerak="tulisGerak"
              @putar="putarGerak++"
              @release="queueRelease"
            />
            <p v-else class="notice m-0">Bagian {{ sectionLabels[selected.type] ?? selected.type }} berasal dari struktur lama. Simpan draft untuk memindahkannya ke struktur baru.</p>

            <UiButton id="editor-reset" tone="quiet" size="sm" class="justify-self-start" @click="reset">
              <RotateCcw :size="15" aria-hidden="true" />
              Kembalikan ke preset tema
            </UiButton>

            <!--
              Pindah struktur (fase 74.11). `v-if` sama seperti di `/order`: selama baru ada satu
              struktur hidup, kontrolnya tidak tampil sama sekali dan muncul sendiri begitu
              struktur kedua didaftarkan. Ia di sini, bukan di grid Tema, karena ia mengganti
              seluruh dokumen — bukan warnanya.
            -->
            <div v-if="strukturLain.length && canEditDesign" class="grid gap-1.5 justify-self-start">
              <p class="m-0 text-caption text-ink-muted">Ganti tampilan undangan — isi yang sudah ditulis dibawa menurut jenis bagiannya.</p>
              <div class="flex flex-wrap gap-1.5">
                <UiButton
                  v-for="id in strukturLain"
                  :id="`editor-struktur-${id}`"
                  :key="id"
                  tone="quiet"
                  size="sm"
                  @click="pindahStruktur(id)"
                >
                  {{ structures[id].name }}
                </UiButton>
              </div>
            </div>
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

          <template #elemen>
            <DashboardEditorElemenPanel
              :info="kepingSegar"
              :nilai="nilaiTerpilih"
              :daftar="daftarKeping"
              :ringkas="ringkasDaftar"
              :ramp="rampLapisan"
              :latar="document.tokens.background"
              :label-bagian="sectionLabels[selected.type] ?? selected.type"
              :bisa-desain="canEditDesign"
              :locked-by="lockedBy"
              :kolom="kolomTerpilih"
              :teks="teksTerpilih"
              :ukuran-huruf="hurufTerpilih"
              :jumlah-tambahan="jumlahTambahan"
              @ubah="patch => kepingTerpilih && ubahKanvas(kepingTerpilih, patch)"
              @aksi="nama => kepingTerpilih && aksiKanvas(nama, kepingTerpilih)"
              @pilih="info => kepingTerpilih = info"
              @tampil="tampilKeping"
              @kunci="info => aksiKanvas('kunci', info)"
              @teks="nilai => kepingTerpilih && tulisTeksKanvas(kepingTerpilih, nilai)"
              @ukur-teks="ukuran => kepingTerpilih && ukurTeksKanvas(kepingTerpilih, ukuran)"
              @tambah="bukaTambahOrnamen"
            />
          </template>

          <template #ornamen>
            <p v-if="!canEditDesign" class="m-0 flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3.5 text-caption text-ink-muted">
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
      :mode="studioAktif.mode"
      :kategori="studioAktif.kategori"
      :tempat="studioAktif.tempat"
      :arah="studioAktif.arah"
      @update:open="terbuka => { if (!terbuka) tutupStudio() }"
      @terapkan-semua="terapkanKeSemua"
      @arah="arahStudio"
      @pilih="pilihOrnamen"
      @pilih-unggahan="pilihUnggahan"
      @kembalikan="kembalikanSlot"
      @batal="batalkanStudio"
    />
    <DashboardMediaLibrary :invitation-id="invitation.id" />

    <DashboardEditorRiwayatDialog
      v-model:open="riwayatOpen"
      :revisions="riwayatList"
      :loading="riwayatLoading"
      :error="riwayatError"
      :draft-revision="revision"
      :restoring="riwayatRestoring"
      @restore="pulihkan"
    />
  </DashboardShell>

  <div v-else class="shell section grid gap-4">
    <p v-if="loading" class="m-0 text-ink-muted">Memuat editor…</p>
    <p v-else class="notice m-0" role="alert">
      {{ error }}
      <button id="editor-retry" class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
    </p>
  </div>
</template>
