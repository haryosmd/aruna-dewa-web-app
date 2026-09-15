<script setup lang="ts">
import { canEditDesign as designUnlocked, createDefaultDocument, designFeatureId, galleryPhotoLimit, giftAccountLimit, invitationDocumentSchema, normalizeGift, selectableFonts, type FontChoice, type TemplateId } from '@aruna/contracts'
import {
  selectableAttire, selectableCoverLayouts, selectableGalleryMotions, selectableVenues,
  toAttire, toCoverLayout, toGalleryMotion,
} from '~/utils/invitation-options'
import { selectableIntensities, toIntensity } from '~/utils/ornaments'
import type { Invitation, InvitationDocument } from '~/types/aruna'
import type { MusicTrack } from '~/utils/music-library'
import { AlertCircle, ArrowDown, ArrowUp, Check, Eye, Laptop, Lock, Pause, Play, Plus, Redo2, RotateCcw, Save, Send, Smartphone, Tablet, Trash2, Undo2, Wand2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({ middleware: 'auth', layout: false })

const route = useRoute()
const invitationsApi = useInvitations()
const { fetchCatalog } = useCatalog()
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

/*
 * Pratinjau perangkat.
 *
 * Pertanyaan yang sebenarnya dipegang pasangan saat menyunting bukan "apa yang saya lihat",
 * melainkan "apa yang dilihat tamu saya". Tamu hampir selalu membuka dari ponsel, jadi
 * bawaannya ponsel — bukan lebar rel yang kebetulan tersedia.
 *
 * Lebarnya dirender sungguhan lalu diperkecil, bukan diperkecil lalu dirender: undangannya
 * memakai container query di seluruh badannya (`.iv-root`), jadi render selebar 390px
 * berperilaku persis seperti ponsel selebar 390px. Skalanya tidak pernah melebihi 1 —
 * memperbesar render hanya akan mengaburkan gambar dan berbohong soal ukuran huruf.
 */
const previewDevices = [
  { id: 'ponsel', label: 'Ponsel', width: 390, icon: Smartphone },
  { id: 'tablet', label: 'Tablet', width: 834, icon: Tablet },
  { id: 'laptop', label: 'Laptop', width: 1280, icon: Laptop },
] as const
type PreviewDevice = (typeof previewDevices)[number]['id']

const previewDevice = ref<PreviewDevice>('ponsel')
const previewWidth = computed(() => previewDevices.find(d => d.id === previewDevice.value)!.width)

/*
 * Diukur pada viewport yang menggulung, bukan pada rel di luarnya.
 *
 * Selisihnya selebar scrollbar, dan itu cukup: skala yang dihitung dari lebar rel membuat
 * render Tablet dan Laptop persis selebar rel, lalu tergunting belasan piksel di kanan oleh
 * scrollbar-nya sendiri. `scrollbar-gutter: stable` memastikan lebar itu tidak lagi berubah
 * saat isinya cukup pendek untuk tidak menggulung — tanpa itu, tinggi mengubah lebar,
 * lebar mengubah skala, dan skala mengubah tinggi lagi.
 */
const previewViewport = ref<HTMLElement | null>(null)
const previewStage = ref<HTMLElement | null>(null)
const { width: viewportWidth } = useElementSize(previewViewport)
const { height: stageHeight } = useElementSize(previewStage)

const previewScale = computed(() =>
  viewportWidth.value ? Math.min(1, viewportWidth.value / previewWidth.value) : 1,
)
const previewScalePct = computed(() => Math.round(previewScale.value * 100))
const galleryUrl = ref('')
const watchReady = ref(false)
const designAddon = ref<{ name: string; price: number } | null>(null)
const undoStack = ref<InvitationDocument[]>([])
const redoStack = ref<InvitationDocument[]>([])

const { confirm } = usePopup()

/*
 * Autosave dicabut di fase 18, dan ini yang menggantikannya.
 *
 * Yang lama menyimpan sendiri 900ms setelah tiap perubahan, lalu menimpa dokumen lokal dengan
 * jawaban server. Jawaban itu nol informasi — `saveDraft` cuma menggemakan dokumen yang baru
 * dikirim — tapi penugasannya mengubah identitas ref, memicu watcher yang sama, dan penjaganya
 * selalu lolos karena `saving` sudah `false` sebelum antrean watcher Vue di-flush. Terukur:
 * satu suntingan menghasilkan 13 revisi dalam 12 detik, lalu terus begitu selamanya, sambil
 * menghidupkan kembali foto yang baru dihapus.
 *
 * Sekarang simpan hanya berangkat lewat tombol, dan keadaannya dibaca dari cuplikan ini.
 * Cuplikannya diambil **sebelum** permintaan berangkat dan baru dipasang setelah berhasil,
 * jadi suntingan yang datang selagi permintaan terbang tetap terhitung belum tersimpan.
 */
const savedSnapshot = ref('')
const dirty = computed(() => JSON.stringify(document.value) !== savedSnapshot.value)

/**
 * URL aset yang sudah lepas dari dokumen tapi berkasnya belum dihapus.
 *
 * Penghapusan menunggu simpan berhasil; alasannya di `utils/asset-release.ts`.
 */
const pendingReleases = ref<string[]>([])

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
    const catalog = await fetchCatalog()
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
    const result = await invitationsApi.get(String(route.params.id))
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
    error.value = apiErrorMessage(cause)
  } finally {
    loading.value = false
    /*
     * Cuplikan "tersimpan" diambil di sini, bukan tepat setelah `document.value` diisi.
     * `watch(selected, …, { immediate: true })` di bawah menulis ulang `section.data` hadiah
     * berbentuk lama begitu section-nya terpilih; cuplikan yang diambil lebih dini membuat
     * editor lahir dalam keadaan "belum tersimpan", dan tiap perpindahan halaman memunculkan
     * popup yang tidak dimengerti siapa pun.
     */
    nextTick(() => {
      watchReady.value = true
      savedSnapshot.value = JSON.stringify(document.value)
    })
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

async function save() {
  // Tombolnya sudah ter-disable selagi `saving`, tapi `publish()` juga lewat sini: tanpa
  // penjaga ini dua permintaan bisa berbarengan, dan yang kedua membawa `revision` basi.
  if (saving.value) return
  error.value = ''
  conflict.value = false
  const parsed = invitationDocumentSchema.safeParse(document.value)
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Rancangan belum valid.'
    return
  }
  // Diambil sebelum berangkat. Suntingan yang datang selagi permintaan terbang tidak ikut
  // tertandai tersimpan — dan tidak pula ditimpa, karena dokumen lokal tidak disentuh.
  const snapshot = JSON.stringify(document.value)
  saving.value = true
  try {
    const result = await invitationsApi.saveDraft(String(route.params.id), { document: parsed.data, revision: revision.value })
    /*
     * Hanya `revision` yang diambil dari jawaban. `result.document` adalah gema dari dokumen
     * yang baru saja dikirim — klien sudah mem-parse-nya dengan skema yang sama sebelum
     * berangkat — jadi menugaskannya kembali bukan sinkronisasi, melainkan penimpaan.
     */
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
  // Draft boleh disimpan dengan warna apa pun — pasangan sering berhenti di tengah
  // penyetelan. Yang tidak boleh adalah versi publik yang tak terbaca oleh tamu.
  if (paletteIssues.value.length) {
    error.value = `Warna undangan belum memenuhi ambang keterbacaan (${paletteIssues.value.length} dari 4 pasangan). Perbaiki di panel Tema & warna sebelum menerbitkan.`
    toast.error('Perbaiki kontras warna dulu sebelum menerbitkan.')
    return
  }
  // Draf yang sudah bersih tidak perlu revisi baru hanya untuk diterbitkan.
  if (dirty.value) await save()
  if (error.value) return
  publishing.value = true
  try {
    await invitationsApi.publish(String(route.params.id))
    toast.success('Versi publik diperbarui.')
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause)
    toast.error(error.value)
  } finally {
    publishing.value = false
  }
}

async function reset() {
  const jawaban = await confirm({
    title: 'Kembalikan ke preset awal?',
    description: 'Seluruh isi draft diganti preset tema ini. Perubahan yang belum tersimpan akan hilang.',
    tone: 'danger',
    actions: [
      { id: 'kembali', label: 'Kembali', tone: 'outline' },
      { id: 'reset', label: 'Ya, kembalikan', tone: 'ink' },
    ],
    dismissId: 'kembali',
  })
  if (jawaban !== 'reset') return
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
 *
 * `image` dan `credit` ikut dikecualikan bukan karena tertutup, melainkan karena sudah punya
 * panel sendiri di atas — tanpa ini keduanya muncul dua kali di layar yang sama.
 */
const enumKeys = new Set(['layout', 'ornamentIntensity', 'motion', 'venueIllustration', 'image', 'credit'])

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

/* ── Unggahan media ─────────────────────────────────────────────────────────── */

const media = useMediaUploads(() => String(route.params.id))
const gallerySlotsLeft = computed(() => Math.max(0, galleryPhotoLimit - galleryImages.value.length))

/**
 * Satu jatuhan, satu langkah undo.
 *
 * `checkpoint()` dipanggil sekali untuk seluruh jatuhan, bukan per foto: menjatuhkan sepuluh
 * foto terasa seperti satu tindakan, dan undo yang mengembalikannya satu per satu akan
 * menghabiskan seluruh tumpukan 30-langkah untuk satu gerakan tangan.
 */
async function onGalleryFiles(files: File[]) {
  if (!selected.value || selected.value.type !== 'gallery') return
  const urls = await media.upload(files)
  if (!urls.length) return
  checkpoint()
  galleryImages.value.push(...urls)
  toast.success(urls.length === 1
    ? 'Foto ditambahkan. Foto tampil publik setelah undangan diterbitkan.'
    : `${urls.length} foto ditambahkan. Foto tampil publik setelah undangan diterbitkan.`)
}

/**
 * Melepas berkasnya, bukan cuma tautannya — tapi menunggu gilirannya.
 *
 * Batas foto dihitung dari aset yang tersimpan di server, jadi tanpa penghapusan ini pasangan
 * yang mengunggah lalu berganti pikiran lima belas kali akan mentok selamanya tanpa punya satu
 * pun foto. Yang berubah di fase 18 adalah **kapan**: dulu berkasnya dihapus begitu URL-nya
 * lepas dari dokumen di layar, dan draf di server menyusul 900ms kemudian lewat autosave.
 * Tanpa autosave, urutan itu meninggalkan draf tersimpan yang menunjuk aset mati sampai
 * pasangan menekan Simpan. Jadi URL-nya mengantre di sini dan dilepas sesudah simpan berhasil.
 */
function queueRelease(url: string) {
  if (!url || !mediaAssetIdFromUrl(url)) return
  if (pendingReleases.value.includes(url)) return
  pendingReleases.value = [...pendingReleases.value, url]
}

/** Dipanggil hanya dari `save()` yang berhasil, dengan dokumen yang benar-benar tersimpan. */
async function flushReleases(savedDocumentJson: string) {
  const releasing = releasableUrls(pendingReleases.value, savedDocumentJson)
  // Yang masih disebut dokumen tetap mengantre; pasangan boleh melepasnya lagi nanti.
  pendingReleases.value = stillQueued(pendingReleases.value, savedDocumentJson)
  for (const url of releasing) await media.release(url)
}

function removeGalleryImage(index: number) {
  const url = String(galleryImages.value[index] ?? '')
  removeRow(galleryImages.value, index)
  queueRelease(url)
}

/* ── Musik latar ────────────────────────────────────────────────────────────── */

/**
 * Tiga jalur masuk, berurutan dari yang paling ramah: pustaka, unggah, tempel URL.
 *
 * Pustakanya ada karena kebanyakan pasangan tidak punya berkas MP3 dan tidak tahu harus
 * mencarinya di mana. Sebelum ini section `music` jatuh ke kotak teks berlabel "URL" — fitur
 * yang backend-nya sudah menerima `audio/mpeg` sejak awal tapi tidak punya satu pun jalan masuk.
 */
const musicUpload = useMediaUploads(() => String(route.params.id))
const musicUrl = computed(() => String(selected.value?.data.url ?? ''))
const musicCredit = computed(() => String(selected.value?.data.credit ?? ''))
const musicTitle = computed(() => String(selected.value?.data.title ?? ''))
const preview = ref<HTMLAudioElement | null>(null)
const previewing = ref('')

function writeMusic(url: string, title: string, credit: string) {
  const section = selected.value
  if (!section) return
  const previous = String(section.data.url ?? '')
  checkpoint()
  section.data.url = url
  section.data.title = title
  section.data.credit = credit
  // Memilih lagu lalu bertanya-tanya kenapa senyap adalah jebakan yang tidak perlu ada.
  if (url) section.enabled = true
  if (previous && previous !== url) queueRelease(previous)
}

function selectTrack(track: MusicTrack) {
  writeMusic(track.url, track.title, track.credit)
}

async function onMusicFiles(files: File[]) {
  const [url] = await musicUpload.upload(files, 'audio')
  if (!url) return
  writeMusic(url, files[0]?.name.replace(/\.[^.]+$/u, '') ?? 'Lagu pilihan kami', '')
}

function clearMusic() {
  stopPreview()
  writeMusic('', '', '')
  const section = selected.value
  if (section) section.enabled = false
}

function stopPreview() {
  preview.value?.pause()
  previewing.value = ''
}

async function togglePreview(url: string) {
  const player = preview.value
  if (!player) return
  if (previewing.value === url) { stopPreview(); return }
  player.src = url
  try {
    await player.play()
    previewing.value = url
  } catch {
    // Diblokir browser atau berkasnya tidak terjangkau; pasangan tetap bisa menyimpan pilihannya.
    previewing.value = ''
  }
}

// Berpindah bagian tidak boleh meninggalkan lagu yang masih berbunyi di latar.
watch(selectedId, stopPreview)
onBeforeUnmount(stopPreview)

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

/* ── Perubahan yang belum tersimpan ─────────────────────────────────────────── */

/**
 * Pengganti autosave: pasangan diberi tahu, bukan disimpankan diam-diam.
 *
 * Dua permukaan, karena dua kejadian yang berbeda. Berpindah halaman bisa kita tahan sendiri
 * dan tawarkan tiga jalan keluar. Menutup tab tidak bisa — dialognya milik browser, tanpa
 * kalimat kita dan tanpa tombol kita — tapi membiarkannya lewat tanpa peringatan sama sekali
 * berarti seluruh sore penyuntingan hilang tanpa satu pun kalimat.
 */
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
  // Simpan yang ditolak server (revisi bentrok, dokumen tidak valid) tidak boleh berakhir
  // sebagai kepindahan diam-diam: pesannya ada di halaman ini, jadi pasangan tetap di sini.
  return !error.value
})

useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
  if (!dirty.value) return
  event.preventDefault()
})
</script>

<template>
  <DashboardShell v-if="invitation" :invitation-id="invitation.id" :title="invitation.title" width="wide">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="grid gap-1.5">
        <p class="eyebrow">Editor undangan</p>
        <h1 class="m-0 font-display text-h1 font-semibold text-ink">{{ invitation.title }}</h1>
        <p class="m-0 text-caption text-ink-subtle">
          Draft r{{ revision }} · versi publik hanya berubah saat kalian menerbitkan.
        </p>
        <!--
          Tanpa autosave, keadaan "sudah tersimpan atau belum" tidak boleh ditebak-tebak.
          Karena itu ia tertulis, bukan disiratkan lewat tombol yang aktif atau tidak.
        -->
        <p id="editor-save-state" class="m-0 flex items-center gap-1.5 text-caption" :class="dirty ? 'text-primary-strong' : 'text-ink-subtle'">
          <AlertCircle v-if="dirty" :size="14" aria-hidden="true" />
          <Check v-else :size="14" aria-hidden="true" />
          {{ dirty ? 'Ada perubahan yang belum tersimpan' : 'Semua perubahan tersimpan' }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UiButton id="editor-view-public" as="NuxtLink" :to="`/i/${invitation.slug}`" target="_blank" tone="outline" size="sm">
          <Eye :size="16" aria-hidden="true" />
          Lihat publik
        </UiButton>
        <UiButton id="editor-undo" tone="ghost" size="sm" :disabled="!undoStack.length" aria-label="Undo" @click="undo">
          <Undo2 :size="16" aria-hidden="true" />
        </UiButton>
        <UiButton id="editor-redo" tone="ghost" size="sm" :disabled="!redoStack.length" aria-label="Redo" @click="redo">
          <Redo2 :size="16" aria-hidden="true" />
        </UiButton>
        <UiButton id="editor-reset" tone="outline" size="sm" @click="reset">
          <RotateCcw :size="16" aria-hidden="true" />
          Reset
        </UiButton>
        <UiButton id="editor-save" size="sm" :loading="saving" :disabled="!dirty" @click="() => save()">
          <Save v-if="!saving" :size="16" aria-hidden="true" />
          {{ saving ? 'Menyimpan…' : 'Simpan draft' }}
        </UiButton>
        <UiButton id="editor-publish" tone="ink" size="sm" :loading="publishing" @click="publish">
          <Send v-if="!publishing" :size="16" aria-hidden="true" />
          {{ publishing ? 'Menerbitkan…' : 'Publikasikan' }}
        </UiButton>
      </div>
    </header>

    <p v-if="error" class="notice m-0" role="alert">
      {{ error }}
      <button v-if="conflict" id="editor-reload-server" class="button button-secondary ml-2" type="button" @click="load">Muat ulang versi server</button>
    </p>

    <!-- Mobile can only show one pane at a time. -->
    <div class="flex gap-1 rounded-full bg-surface-3 p-1 xl:hidden" role="tablist" aria-label="Panel editor">
      <button
        v-for="tab in [{ id: 'settings', label: 'Pengaturan' }, { id: 'preview', label: 'Pratinjau' }]"
        :id="`editor-panel-${tab.id}`"
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

    <!--
      Tiga tingkat, bukan dua.

      Sebelumnya lompatannya langsung dari tata letak ponsel ke tiga kolom di `xl` (1280px),
      jadi laptop 13" — 1024 sampai 1280 — melihat satu panel bertab padahal ruangnya cukup
      untuk dua. Jalur tengah memakai `minmax(0, 1fr)` supaya isinya benar-benar boleh
      menyusut; `1fr` polos punya `min-width: auto` dan akan menolak menyempit di bawah lebar
      isi terlebarnya.
    -->
    <div
      class="grid gap-5 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-x-8 xl:grid-cols-[14.5rem_minmax(0,1fr)_minmax(18rem,20rem)] lg:items-start"
    >
      <!-- Section list -->
      <aside :class="cn('grid content-start gap-2', mobilePanel === 'preview' && 'hidden lg:grid')">
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
              'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-md border px-1.5 transition-colors duration-200',
              selectedId === section.id ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-surface-2',
            )"
          >
            <!--
              `minmax(0, 1fr)` untuk label, `auto` untuk kluster kontrol. Dulu barisnya `flex`
              dan muatnya kebetulan: centang 36px + dua panah 28px + jarak dan padding menyisakan
              ~94px teks di jalur 240px, dan label yang lebih panjang mendorong panahnya keluar
              jalur sampai menempel ke kolom sebelah. Dengan grid, kolom label yang menyusut —
              berapa pun panjang namanya, `truncate` yang menanggungnya.
            -->
            <button
              :id="`editor-section-${section.id}`"
              type="button"
              class="flex min-h-11 min-w-0 items-center gap-2 rounded-md px-1.5 text-left text-[0.875rem] font-medium text-ink"
              @click="selectedId = section.id; mobilePanel = 'settings'"
            >
              <span
                :class="cn('h-2 w-2 shrink-0 rounded-full', section.enabled ? 'bg-sage' : 'bg-border-strong')"
                aria-hidden="true"
              />
              <!--
                Membungkus, bukan dipotong. `truncate` memotong tiga dari tiga belas nama jadi
                "Video & live str…" — persis nama bagian yang sedang dicari pasangan. Dua baris
                pada `leading-snug` masih muat di dalam tinggi baris 44px yang sudah ada, jadi
                nama utuh tidak menukar apa pun.
              -->
              <span class="leading-snug">{{ sectionLabels[section.type] ?? section.type }}</span>
            </button>

            <!-- Target sentuh tetap 44px tingginya; yang dirapikan lebarnya, bukan jangkauannya. -->
            <div class="flex items-center">
              <label class="grid h-11 w-9 shrink-0 cursor-pointer place-items-center">
                <input :id="`editor-section-toggle-${section.id}`" v-model="section.enabled" type="checkbox" class="h-4 w-4 accent-[var(--color-primary)]">
                <span class="sr-only">Tampilkan {{ sectionLabels[section.type] ?? section.type }}</span>
              </label>

              <button
                :id="`editor-section-up-${section.id}`"
                type="button"
                class="grid h-11 w-7 shrink-0 place-items-center rounded-md text-ink-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="!canEditDesign || index === 0"
                :aria-label="`Naikkan ${sectionLabels[section.type] ?? section.type}`"
                :aria-describedby="canEditDesign ? undefined : 'design-locked-order'"
                @click="move(index, -1)"
              >
                <ArrowUp :size="15" aria-hidden="true" />
              </button>
              <button
                :id="`editor-section-down-${section.id}`"
                type="button"
                class="grid h-11 w-7 shrink-0 place-items-center rounded-md text-ink-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="!canEditDesign || index === document.sections.length - 1"
                :aria-label="`Turunkan ${sectionLabels[section.type] ?? section.type}`"
                :aria-describedby="canEditDesign ? undefined : 'design-locked-order'"
                @click="move(index, 1)"
              >
                <ArrowDown :size="15" aria-hidden="true" />
              </button>
            </div>
          </li>
        </ul>
      </aside>

      <!-- Settings -->
      <!--
        `@container`, bukan breakpoint viewport.

        Lebar panel ini datang dari jalur grid di atas, bukan dari lebar layar. `sm:grid-cols-2`
        di sini benar pada viewport 1440 sekalipun kolomnya cuma 312px — dan itulah yang dulu
        terjadi: `input[type=date]` selebar 128px, kartu tema selebar 80px. Setiap varian di
        dalam sini wajib bertanya pada wadahnya, tidak pernah pada layar.

        Ambangnya `@xs` (320px), bukan `@sm` (384px). Diukur, bukan ditaksir: jalur pratinjau
        mengambil lebar maksimumnya lebih dulu, jadi kolom ini justru lebih sempit di 1280
        daripada di 1024. Dengan `@sm`, pasangan yang melebarkan jendelanya dari 1024 ke 1280
        akan melihat kolomnya mundur jadi satu-up. Ambang yang dipilih dari satu lebar saja
        selalu salah di lebar yang lain.
      -->
      <section :class="cn('@container grid content-start gap-5', mobilePanel === 'preview' && 'hidden xl:grid')">
        <template v-if="selected">
          <div class="grid gap-1">
            <p class="eyebrow">Pengaturan bagian</p>
            <!-- `text-h3`: ini judul panel. Judul halaman adalah nama undangan di atas, dan `text-h2` (40px di 1440) membuat keduanya berebut. -->
            <h2 class="m-0 font-display text-h3 font-semibold text-ink">{{ sectionLabels[selected.type] ?? selected.type }}</h2>
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

            <UiField id="editor-cover-layout" v-slot="{ id }" label="Komposisi cover" :hint="selectableCoverLayouts.find(option => option.id === coverLayout)?.hint">
              <UiSelect :id="id" :model-value="coverLayout" @update:model-value="value => writeOption('layout', String(value))">
                <option v-for="option in selectableCoverLayouts" :key="option.id" :value="option.id">{{ option.label }}</option>
              </UiSelect>
            </UiField>

            <UiField id="editor-cover-intensity" v-slot="{ id }" label="Kepekatan ornamen" :hint="selectableIntensities.find(option => option.id === coverIntensity)?.hint">
              <UiSelect :id="id" :model-value="coverIntensity" @update:model-value="value => writeOption('ornamentIntensity', String(value))">
                <option v-for="option in selectableIntensities" :key="option.id" :value="option.id">{{ option.label }}</option>
              </UiSelect>
            </UiField>
            <p class="m-0 text-caption text-ink-subtle">Berlaku untuk seluruh undangan, bukan hanya bagian pembuka.</p>

            <DashboardPhotoField
              id="editor-cover-image"
              :invitation-id="invitation.id"
              label="Foto cover"
              hint="Gambar pertama yang dilihat tamu. Potret lebih aman daripada lanskap — hampir semua tamu membuka dari ponsel."
              :model-value="String(selected.data.image || '')"
              @update:model-value="next => updateValue('image', next)"
              @release="queueRelease"
            />
          </div>

          <div v-else-if="selected.type === 'couple'" class="card grid gap-4 p-5">
            <div class="grid gap-1">
              <p class="eyebrow">Potret mempelai</p>
              <p class="m-0 text-caption text-ink-subtle">Opsional. Tanpa foto, bagian ini memakai ladang ornamen temanya.</p>
            </div>

            <DashboardPhotoField
              id="editor-couple-image"
              :invitation-id="invitation.id"
              label="Foto mempelai"
              :model-value="String(selected.data.image || '')"
              @update:model-value="next => updateValue('image', next)"
              @release="queueRelease"
            />
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
                    :id="`editor-dresscode-attire-${option.id}`"
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
                <UiField :id="`editor-dresscode-color-${index + 1}`" v-slot="{ id }" label="Warna" class="basis-24">
                  <input :id="id" class="control" type="color" :value="String(color.hex || '#E8DCC8')" @input="color.hex = ($event.target as HTMLInputElement).value">
                </UiField>
                <UiField :id="`editor-dresscode-name-${index + 1}`" v-slot="{ id }" label="Nama warna" hint="Wajib — tamu harus bisa membacanya, bukan hanya melihatnya." class="min-w-0 flex-1 basis-full @xs:basis-48">
                  <UiInput :id="id" :model-value="String(color.name || '')" placeholder="Terakota" @update:model-value="value => color.name = value" />
                </UiField>
                <button
                  :id="`editor-dresscode-remove-${index + 1}`"
                  type="button"
                  class="grid h-12 w-11 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus warna ${index + 1}`"
                  @click="removeRow(dresscodeColors, index)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </article>

              <UiButton id="editor-dresscode-add" tone="outline" class="justify-self-start" @click="addColor">
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
                  :id="`editor-story-remove-${index + 1}`"
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus langkah ${index + 1}`"
                  @click="removeRow(storySteps, index)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </div>

              <div class="grid gap-3 @xs:grid-cols-2">
                <UiField :id="`editor-story-title-${index + 1}`" v-slot="{ id }" label="Judul langkah">
                  <UiInput :id="id" :model-value="String(step.title || '')" placeholder="Perpustakaan kecil, 2022" @update:model-value="value => step.title = value" />
                </UiField>
                <UiField :id="`editor-story-side-${index + 1}`" v-slot="{ id }" label="Sisi masuk">
                  <UiSelect :id="id" :model-value="String(step.side || 'kiri')" @update:model-value="value => step.side = value">
                    <option value="kiri">Kiri</option>
                    <option value="kanan">Kanan</option>
                  </UiSelect>
                </UiField>
              </div>

              <UiField :id="`editor-story-text-${index + 1}`" v-slot="{ id }" label="Cerita">
                <UiTextarea :id="id" rows="3" :model-value="String(step.text || '')" @update:model-value="value => step.text = value" />
              </UiField>

              <DashboardPhotoField
                :id="`editor-story-image-${index + 1}`"
                :invitation-id="invitation.id"
                label="Foto langkah"
                hint="Opsional. Kosongkan untuk memakai foto galeri."
                :model-value="String(step.image || '')"
                @update:model-value="value => step.image = value"
                @release="queueRelease"
              />
            </article>

            <UiButton id="editor-story-add" tone="outline" class="justify-self-start" @click="addStoryStep">
              <Plus :size="16" aria-hidden="true" />
              Tambah langkah
            </UiButton>
          </div>

          <!-- Events -->
          <div v-if="selected.type === 'events'" class="grid gap-4">
            <UiField id="editor-events-venue" v-slot="{ id }" label="Ilustrasi gedung" hint="Ditampilkan di atas kartu acara, mengikuti warna tema.">
              <UiSelect :id="id" :model-value="venueIllustration" @update:model-value="value => writeOption('venueIllustration', String(value))">
                <option value="">Tanpa ilustrasi</option>
                <option v-for="option in selectableVenues" :key="option.id" :value="option.id">{{ option.label }}</option>
              </UiSelect>
            </UiField>

            <article v-for="(event, index) in eventRows" :key="String(event.id)" class="card grid gap-3 p-5">
              <div class="flex items-center justify-between gap-3">
                <strong class="text-ink">Acara {{ index + 1 }}</strong>
                <button
                  :id="`editor-event-remove-${index + 1}`"
                  type="button"
                  class="grid h-11 w-11 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus acara ${index + 1}`"
                  @click="removeRow(eventRows, index)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </div>

              <div class="grid gap-3 @xs:grid-cols-2">
                <UiField :id="`editor-event-name-${index + 1}`" v-slot="{ id }" label="Nama acara">
                  <UiInput :id="id" :model-value="String(event.name || '')" @update:model-value="value => event.name = value" />
                </UiField>
                <UiField :id="`editor-event-date-${index + 1}`" v-slot="{ id }" label="Tanggal">
                  <UiInput :id="id" type="date" :model-value="String(event.date || '')" @update:model-value="value => event.date = value" />
                </UiField>
                <UiField :id="`editor-event-time-${index + 1}`" v-slot="{ id }" label="Waktu">
                  <UiInput :id="id" :model-value="String(event.time || '')" placeholder="09.00 WIB" @update:model-value="value => event.time = value" />
                </UiField>
                <UiField :id="`editor-event-venue-${index + 1}`" v-slot="{ id }" label="Lokasi">
                  <UiInput
                    :id="id"
                    :model-value="String(event.venue || '')"
                    :disabled="sameVenue && index > 0"
                    @update:model-value="value => writeVenue(index, 'venue', value ?? '')"
                  />
                </UiField>
              </div>

              <UiField :id="`editor-event-address-${index + 1}`" v-slot="{ id }" label="Alamat">
                <UiTextarea
                  :id="id"
                  rows="2"
                  :model-value="String(event.address || '')"
                  :disabled="sameVenue && index > 0"
                  @update:model-value="value => writeVenue(index, 'address', value ?? '')"
                />
              </UiField>
              <UiField :id="`editor-event-map-${index + 1}`" v-slot="{ id }" label="Tautan peta" hint="Tempel tautan Google Maps lokasinya. Tamu akan melihat tombol “Buka peta”.">
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
                  :id="`editor-event-public-${index + 1}`"
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
                id="editor-event-same-venue"
                type="checkbox"
                class="h-4 w-4 accent-[var(--color-primary)]"
                :checked="sameVenue"
                @change="toggleSameVenue(($event.target as HTMLInputElement).checked)"
              >
              Lokasi akad dan resepsi sama
            </label>

            <UiButton id="editor-event-add" tone="outline" class="justify-self-start" @click="addEvent">
              <Plus :size="16" aria-hidden="true" />
              Tambah acara
            </UiButton>
          </div>

          <!-- Gallery -->
          <div v-else-if="selected.type === 'gallery'" class="grid gap-4">
            <UiField id="editor-gallery-motion" v-slot="{ id }" label="Gaya galeri" :hint="selectableGalleryMotions.find(option => option.id === galleryMotion)?.hint">
              <UiSelect :id="id" :model-value="galleryMotion" @update:model-value="value => writeOption('motion', String(value))">
                <option v-for="option in selectableGalleryMotions" :key="option.id" :value="option.id">{{ option.label }}</option>
              </UiSelect>
            </UiField>

            <p class="m-0 text-[0.9375rem] text-ink-muted">
              Maksimal {{ galleryPhotoLimit }} foto — terpakai {{ galleryImages.length }}.
              Foto yang diunggah baru tampil publik setelah undangan diterbitkan.
            </p>

            <UiDropzone
              id="editor-gallery-upload"
              kind="image"
              multiple
              :pending="media.pending.value"
              :remaining="gallerySlotsLeft"
              @files="onGalleryFiles"
            />

            <p v-if="media.pending.value && media.total.value > 1" class="m-0 text-caption text-ink-muted">
              Foto {{ media.done.value + 1 }} dari {{ media.total.value }}…
            </p>

            <ul v-if="media.failures.value.length" role="alert" class="m-0 grid gap-1 p-0 list-none">
              <li v-for="message in media.failures.value" :key="message" class="text-caption font-medium text-danger">{{ message }}</li>
            </ul>

            <ul class="m-0 grid gap-2 p-0 list-none">
              <li v-for="(image, index) in galleryImages" :key="image" class="card flex items-center gap-3 p-2.5">
                <img :src="image" alt="" class="h-14 w-14 shrink-0 rounded-md object-cover">
                <input :id="`editor-gallery-url-${index + 1}`" v-model="galleryImages[index]" class="control min-w-0 flex-1" aria-label="URL foto">
                <button
                  :id="`editor-gallery-remove-${index + 1}`"
                  type="button"
                  class="grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  :aria-label="`Hapus foto ${index + 1}`"
                  @click="removeGalleryImage(index)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </li>
            </ul>

            <form class="flex flex-wrap gap-2" @submit.prevent="addGalleryUrl">
              <label class="sr-only" for="editor-gallery-url">URL foto baru</label>
              <input id="editor-gallery-url" v-model="galleryUrl" class="control min-w-0 flex-1 basis-56" type="url" placeholder="https://…">
              <UiButton id="editor-gallery-add-url" type="submit" tone="outline">Tambah URL</UiButton>
            </form>
          </div>

          <!-- Rundown -->
          <div v-else-if="selected.type === 'rundown'" class="grid gap-3">
            <article v-for="(item, index) in rundownRows" :key="String(item.id)" class="card flex flex-wrap items-end gap-3 p-4">
              <UiField :id="`editor-rundown-time-${index + 1}`" v-slot="{ id }" label="Waktu" class="basis-28">
                <UiInput :id="id" :model-value="String(item.time || '')" placeholder="09.00" @update:model-value="value => item.time = value" />
              </UiField>
              <UiField :id="`editor-rundown-title-${index + 1}`" v-slot="{ id }" label="Kegiatan" class="min-w-0 flex-1 basis-56">
                <UiInput :id="id" :model-value="String(item.title || '')" @update:model-value="value => item.title = value" />
              </UiField>
              <UiField :id="`editor-rundown-note-${index + 1}`" v-slot="{ id }" label="Keterangan" class="min-w-0 basis-full">
                <UiInput :id="id" :model-value="String(item.description || '')" placeholder="Opsional — mis. “Tamu dipersilakan menempati kursi”" @update:model-value="value => item.description = value" />
              </UiField>
              <button
                :id="`editor-rundown-remove-${index + 1}`"
                type="button"
                class="grid h-12 w-11 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                :aria-label="`Hapus bagian ${index + 1}`"
                @click="removeRow(rundownRows, index)"
              >
                <Trash2 :size="16" aria-hidden="true" />
              </button>
            </article>

            <UiButton id="editor-rundown-add" tone="outline" class="justify-self-start" @click="addRundown">
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

            <UiField id="editor-gift-title" v-slot="{ id }" label="Judul bagian">
              <UiInput :id="id" :model-value="String(selected.data.title || '')" placeholder="Hadiah untuk kami" @update:model-value="next => updateValue('title', next ?? '')" />
            </UiField>
            <UiField id="editor-gift-note" v-slot="{ id }" label="Kalimat pengantar" hint="Kosongkan untuk memakai kalimat bawaan.">
              <UiTextarea :id="id" rows="3" :model-value="String(selected.data.note || '')" @update:model-value="next => updateValue('note', next ?? '')" />
            </UiField>

            <article v-for="(account, index) in giftAccounts" :key="String(account.id)" class="card grid gap-3 p-5">
              <div class="flex items-center justify-between gap-3">
                <strong class="text-ink">Rekening {{ index + 1 }}</strong>
                <button
                  :id="`editor-gift-remove-${index + 1}`"
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
              <UiField :id="`editor-gift-bank-${index + 1}`" v-slot="{ id }" label="Bank">
                <UiSelect :id="id" :model-value="String(account.bankId || 'bca')" @update:model-value="value => account.bankId = value">
                  <option v-for="option in bankOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                </UiSelect>
              </UiField>

              <UiField v-if="account.bankId === 'other'" :id="`editor-gift-bank-label-${index + 1}`" v-slot="{ id }" label="Nama bank" hint="Ditulis apa adanya pada kartu.">
                <UiInput :id="id" :model-value="String(account.bankLabel || '')" @update:model-value="value => account.bankLabel = value" />
              </UiField>

              <div class="grid gap-3 @xs:grid-cols-2">
                <UiField :id="`editor-gift-number-${index + 1}`" v-slot="{ id }" label="Nomor rekening">
                  <UiInput :id="id" inputmode="numeric" :model-value="String(account.number || '')" @update:model-value="value => account.number = value" />
                </UiField>
                <UiField :id="`editor-gift-holder-${index + 1}`" v-slot="{ id }" label="Atas nama">
                  <UiInput :id="id" :model-value="String(account.holder || '')" @update:model-value="value => account.holder = value" />
                </UiField>
              </div>
            </article>

            <UiButton v-if="giftAccounts.length < giftAccountLimit" id="editor-gift-add" tone="outline" class="justify-self-start" @click="addGiftAccount">
              <Plus :size="16" aria-hidden="true" />
              Tambah rekening
            </UiButton>
            <p v-else class="notice m-0">Sudah {{ giftAccountLimit }} rekening — batasnya di sini supaya bagian hadiah tidak berubah jadi daftar bank.</p>

            <UiField id="editor-gift-address" v-slot="{ id }" label="Alamat kirim hadiah" hint="Opsional, untuk tamu yang ingin mengirim kado fisik.">
              <UiTextarea :id="id" rows="2" :model-value="String(selected.data.address || '')" @update:model-value="next => updateValue('address', next ?? '')" />
            </UiField>
          </div>

          <!-- Music -->
          <div v-else-if="selected.type === 'music'" class="grid gap-5">
            <p class="m-0 text-[0.9375rem] text-ink-muted">
              Musik mulai setelah tamu menekan “Buka Undangan”, tidak pernah sebelum itu — browser
              memang melarangnya, dan tamu yang dikejutkan suara akan menutup tab, bukan mengecilkan
              volume. Tombol jeda selalu tersedia buat mereka.
            </p>

            <!-- Satu elemen audio dipakai bersama: memutar satu lagu menghentikan yang lain. -->
            <audio ref="preview" preload="none" @ended="previewing = ''" />

            <div v-if="musicUrl" class="card grid gap-2 p-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="grid min-w-0 gap-0.5">
                  <strong class="truncate text-ink">{{ musicTitle || 'Lagu pilihan kalian' }}</strong>
                  <span v-if="musicCredit" class="truncate text-caption text-ink-subtle">{{ musicCredit }}</span>
                </div>
                <div class="flex shrink-0 gap-2">
                  <UiButton id="editor-music-preview" tone="outline" @click="togglePreview(musicUrl)">
                    <Pause v-if="previewing === musicUrl" :size="16" aria-hidden="true" />
                    <Play v-else :size="16" aria-hidden="true" />
                    {{ previewing === musicUrl ? 'Hentikan' : 'Dengarkan' }}
                  </UiButton>
                  <button
                    id="editor-music-clear"
                    type="button"
                    class="grid h-11 w-11 place-items-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                    aria-label="Hapus musik"
                    @click="clearMusic"
                  >
                    <Trash2 :size="16" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
            <p v-else class="notice m-0">Belum ada musik. Undangan tetap bisa diterbitkan tanpa lagu.</p>

            <div class="grid gap-2.5">
              <div class="grid gap-1">
                <p class="eyebrow">Pustaka lagu</p>
                <p class="m-0 text-caption text-ink-subtle">
                  Semuanya domain publik atau CC0 — aman dipakai tanpa izin siapa pun, dan sudah
                  dipotong jadi dua menit karena pemutarnya mengulang.
                </p>
              </div>

              <article
                v-for="track in musicLibrary"
                :key="track.id"
                :class="cn(
                  'card flex flex-wrap items-center gap-3 p-4',
                  musicUrl === track.url && 'border-primary bg-primary-soft/40',
                )"
              >
                <div class="grid min-w-0 flex-1 basis-48 gap-0.5">
                  <strong class="truncate text-ink">{{ track.title }}</strong>
                  <span class="truncate text-caption text-ink-subtle">{{ track.mood }} · {{ trackLength(track.seconds) }}</span>
                  <span class="truncate text-caption text-ink-subtle">{{ track.credit }}</span>
                </div>
                <div class="flex shrink-0 gap-2">
                  <UiButton :id="`editor-music-listen-${track.id}`" tone="ghost" @click="togglePreview(track.url)">
                    <Pause v-if="previewing === track.url" :size="16" aria-hidden="true" />
                    <Play v-else :size="16" aria-hidden="true" />
                    {{ previewing === track.url ? 'Hentikan' : 'Dengarkan' }}
                  </UiButton>
                  <UiButton
                    :id="`editor-music-pick-${track.id}`"
                    :tone="musicUrl === track.url ? 'primary' : 'outline'"
                    @click="selectTrack(track)"
                  >
                    <Check v-if="musicUrl === track.url" :size="16" aria-hidden="true" />
                    {{ musicUrl === track.url ? 'Dipakai' : 'Pakai lagu ini' }}
                  </UiButton>
                </div>
              </article>
            </div>

            <div class="grid gap-2.5">
              <div class="grid gap-1">
                <p class="eyebrow">Atau pakai lagu sendiri</p>
                <p class="m-0 text-caption text-ink-subtle">
                  Pastikan kalian punya hak memakai lagunya. Lagu komersial yang diunggah ke undangan
                  publik tetap tanggung jawab kalian, bukan kami.
                </p>
              </div>

              <UiDropzone
                id="editor-music-upload"
                kind="audio"
                label="Jatuhkan MP3 di sini, atau pilih berkas"
                :pending="musicUpload.pending.value"
                @files="onMusicFiles"
              />

              <ul v-if="musicUpload.failures.value.length" role="alert" class="m-0 grid gap-1 p-0 list-none">
                <li v-for="message in musicUpload.failures.value" :key="message" class="text-caption font-medium text-danger">{{ message }}</li>
              </ul>
            </div>

            <UiField id="editor-music-url" v-slot="{ id }" label="atau tempel URL lagu" hint="Harus berupa tautan langsung ke berkas audio, bukan tautan halaman pemutar.">
              <UiInput
                :id="id"
                type="url"
                placeholder="https://…"
                :model-value="musicUrl"
                @update:model-value="next => writeMusic(next ?? '', musicTitle, musicCredit)"
              />
            </UiField>
          </div>

          <!-- Plain text fields -->
          <div v-else class="grid gap-4">
            <UiField v-for="[key, value] in textFields" :id="`editor-text-${key}`" :key="key" v-slot="{ id }" :label="label(key)">
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

            <div class="grid gap-2 @xs:grid-cols-2 @md:grid-cols-3">
              <button
                v-for="theme in invitationThemes"
                :id="`editor-theme-${theme.id}`"
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

            <div class="grid gap-3 @xs:grid-cols-3">
              <UiField id="editor-color-background" v-slot="{ id }" label="Latar belakang">
                <input :id="id" v-model="document.tokens.background" class="control disabled:cursor-not-allowed disabled:opacity-60" type="color" :disabled="!canEditDesign" :aria-describedby="canEditDesign ? undefined : 'design-locked'">
              </UiField>
              <UiField id="editor-color-foreground" v-slot="{ id }" label="Warna teks">
                <input :id="id" v-model="document.tokens.foreground" class="control disabled:cursor-not-allowed disabled:opacity-60" type="color" :disabled="!canEditDesign" :aria-describedby="canEditDesign ? undefined : 'design-locked'">
              </UiField>
              <UiField id="editor-color-primary" v-slot="{ id }" label="Warna aksi">
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

              <button v-if="paletteIssues.length && canEditDesign" id="editor-repair-palette" type="button" class="button button-secondary justify-self-start" @click="repairPaletteColors">
                <Wand2 :size="15" aria-hidden="true" />
                Perbaiki warna otomatis
              </button>
            </div>

            <UiField id="editor-font" v-slot="{ id }" label="Jenis huruf judul">
              <UiSelect :id="id" v-model="(document.tokens.font as FontChoice)" :disabled="!canEditDesign" :aria-describedby="canEditDesign ? undefined : 'design-locked'">
                <option v-for="font in selectableFonts" :key="font.id" :value="font.id">{{ font.label }}</option>
              </UiSelect>
            </UiField>
          </section>
        </template>
      </section>

      <!-- Preview -->
      <!--
        `xl:col-start-3` wajib ada: tanpa itu `lg:col-start-2` ikut berlaku di `xl` dan
        pratinjau mendarat menindih panel pengaturan.
      -->
      <aside
        :class="cn(
          'lg:col-start-2 lg:sticky lg:top-8 lg:self-start xl:col-start-3',
          mobilePanel === 'settings' && 'hidden xl:block',
        )"
      >
        <div class="grid gap-3">
          <div class="grid gap-2">
            <p class="eyebrow">Pratinjau draft</p>

            <!--
              Pemilih perangkat, bukan sakelar zoom. Labelnya nama benda yang dipegang tamu,
              dan lebar sungguhannya ikut ditulis — tanpa angka itu, pratinjau yang diperkecil
              jadi misteri: pasangan tidak tahu apakah hurufnya memang sekecil itu di ponsel
              atau hanya kelihatan kecil di sini.
            -->
            <div
              class="flex gap-1 rounded-full bg-surface-3 p-1"
              role="group"
              aria-label="Lebar pratinjau"
            >
              <button
                v-for="device in previewDevices"
                :id="`editor-preview-${device.id}`"
                :key="device.id"
                type="button"
                :aria-pressed="previewDevice === device.id"
                :class="cn(
                  'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[0.8125rem] font-semibold transition-colors duration-200',
                  previewDevice === device.id ? 'bg-surface text-ink shadow-hairline' : 'text-ink-muted hover:text-ink',
                )"
                @click="previewDevice = device.id"
              >
                <component :is="device.icon" :size="15" aria-hidden="true" />
                {{ device.label }}
              </button>
            </div>

            <p class="m-0 flex items-center justify-between gap-2 text-caption text-ink-subtle">
              <span>Selebar {{ previewWidth }}px</span>
              <span v-if="previewScalePct < 100" class="tabular-nums">diperkecil {{ previewScalePct }}%</span>
            </p>
          </div>

          <!--
            Tingginya mengikuti layar, bukan angka tetap. `36rem` dulu berarti panel ini
            berhenti di 576px bahkan di layar 1000px — pasangan melihat 40% lebih sedikit
            dari undangan yang justru jadi alasan mereka membuka editor.

            Bayangan di tepi bawah ada karena panel ini memotong isinya di tengah huruf.
            Scrollbar overlay macOS tidak terlihat sampai disentuh, jadi tanpa isyarat itu
            potongannya terbaca sebagai render yang rusak, bukan sebagai "masih ada lagi".
          -->
          <div class="relative overflow-hidden rounded-xl border border-border shadow-float after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-10 after:bg-gradient-to-t after:from-ink/12 after:to-transparent">
            <div
              ref="previewViewport"
              class="max-h-[36rem] overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] xl:max-h-[calc(100svh-14rem)]"
            >
              <!--
                `transform` tidak mengubah tata letak, jadi pembungkus ini yang memegang ukuran
                hasil perkecilan. Tanpa itu panel menyisakan ruang kosong setinggi undangan yang
                belum diperkecil — di Laptop yang diperkecil ke 25%, tiga perempat panelnya jadi
                kosong. Lebarnya ikut ditulis supaya render yang lebih sempit dari relnya —
                Ponsel 390px di rel 424px — berdiri di tengah, bukan menempel ke kiri.
              -->
              <div
                :style="{
                  width: `${Math.round(previewWidth * previewScale)}px`,
                  height: `${Math.round(stageHeight * previewScale)}px`,
                  marginInline: 'auto',
                }"
              >
                <div
                  ref="previewStage"
                  data-preview-stage
                  :style="{
                    width: `${previewWidth}px`,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                  }"
                >
                  <InvitationRenderer :document="document" compact />
                </div>
              </div>
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
      <button id="editor-retry" class="button button-secondary ml-2" type="button" @click="load">Coba lagi</button>
    </p>
  </div>
</template>
