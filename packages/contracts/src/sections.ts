import { z } from 'zod'
import { fontChoices } from './fonts'

/*
 * Struktur bagian "Elegance" (fase 72) — template utama Aruna Dewa.
 *
 * Keputusan pemilik 2026-09-19/20: struktur undangan mengikuti format bawaan Undangan Studio
 * (undang.site) — dua belas bagian dengan kata-kata **di dalam `data` tiap bagian**, bukan
 * lagi 44 `copyKeys` global. Satu bagian = satu wadah isi + gaya teks per kolom + latar +
 * gerak masuknya, sehingga rail struktur di editor sama persis dengan struktur dokumennya.
 *
 * Berkas ini adalah satu-satunya sumber untuk tiga hal sekaligus: (1) daftar kolom tiap
 * bagian beserta label form-nya, (2) skema zod `data` per bagian yang diturunkan dari daftar
 * itu, dan (3) dokumen bawaan berbahasa Indonesia. Editor menggenerate form-nya dari
 * `sectionFields`, jadi menambah satu kolom di sini berarti form, validasi, dan bawaannya
 * ikut sekaligus.
 */

/* ── Tipe bagian ─────────────────────────────────────────────────────────── */

/** Tipe bagian dokumen v1 (sebelum fase 72). Tetap sah dibaca; tidak lagi dibuat baru. */
export const legacySectionTypes = ['cover', 'couple', 'events', 'countdown', 'gallery', 'story', 'rundown', 'dresscode', 'video', 'gift', 'rsvp', 'wishes', 'closing', 'music'] as const
export type LegacySectionType = (typeof legacySectionTypes)[number]

/** Dua belas bagian template Elegance, urut seperti tamu membacanya. */
export const eleganceSectionTypes = ['opening-envelope', 'hero', 'couple', 'countdown', 'event', 'map', 'unduh-mantu', 'quote', 'gallery', 'gift', 'wishes', 'closing'] as const
export type EleganceSectionType = (typeof eleganceSectionTypes)[number]

/** Bagian tambahan milik kita yang tidak ada di referensi; opsional dan mati secara bawaan. */
export const extraSectionTypes = ['story', 'rundown', 'dresscode', 'video'] as const
export type ExtraSectionType = (typeof extraSectionTypes)[number]

/** Semua tipe bagian dokumen v2, urut bawaan. */
export const v2SectionTypes = [...eleganceSectionTypes, ...extraSectionTypes] as const
export type V2SectionType = (typeof v2SectionTypes)[number]

/**
 * Setiap tipe yang pernah sah di dalam sebuah dokumen. **Hanya tumbuh** — alasan yang sama
 * dengan `templateIds`: ia sumber `z.enum`, dan mencabut satu tipe mematikan revisi terbit.
 */
export const sectionTypes = [...legacySectionTypes, 'opening-envelope', 'hero', 'event', 'map', 'unduh-mantu', 'quote'] as const
export type SectionType = (typeof sectionTypes)[number]

/**
 * Tipe yang memang TIDAK punya komponen di peta renderer, dan kenapa.
 *
 * `music` (v1) adalah pemutar mengambang, bukan bagian yang digulir; `opening-envelope` (v2)
 * adalah gerbang di depan halaman, dirender sebelum daftar bagian. Keduanya dicatat di sini,
 * bukan sebagai pengecualian yang diketik ulang di dalam tes: daftar pengecualian yang hidup
 * di dalam tes hanya menyalin ulang bug-nya kalau suatu saat daftarnya salah.
 *
 * Dibaca `apps/web/test/renderer-coverage.spec.ts` (fase 74.4).
 */
export const headlessSectionTypes: ReadonlySet<SectionType> = new Set<SectionType>(['music', 'opening-envelope'])

/** Bagian yang tidak bisa disembunyikan di undangan v2. */
export const requiredSectionTypes: ReadonlySet<SectionType> = new Set<SectionType>(['opening-envelope', 'hero', 'couple', 'event', 'closing'])
export const isRequiredSection = (type: SectionType) => requiredSectionTypes.has(type)

/**
 * Fitur paket yang membuka tiap tipe bagian. Bagian baru fase 72 menumpang fitur yang sudah
 * ada di `catalog` — entitlement di basis data tidak perlu disentuh.
 *
 * Yang dijamin paket dasar bukan "seluruh template Elegance" melainkan **seluruh bagian yang
 * menyala secara bawaan**. Bedanya bukan bahasa: `gift` adalah salah satu dari empat fitur yang
 * membedakan Mula dari Mekar, dan selama ia lahir menyala, setiap undangan baru di paket termurah
 * ditolak `publish()` dengan "Paket aktif belum mencakup seluruh section yang diaktifkan" — di
 * tombol Publikasikan, jauh dari berkas ini. Invariannya dijaga `tests/sections.test.ts`.
 */
export const sectionFeature: Record<SectionType, string> = {
  'cover': 'cover', 'opening-envelope': 'cover', 'hero': 'cover',
  'couple': 'couple', 'quote': 'couple',
  'events': 'events', 'event': 'events', 'map': 'events', 'unduh-mantu': 'events',
  'countdown': 'countdown', 'gallery': 'gallery', 'gift': 'gift',
  'rsvp': 'rsvp', 'wishes': 'wishes', 'closing': 'closing', 'music': 'music',
  'story': 'story', 'rundown': 'rundown', 'dresscode': 'dresscode', 'video': 'video',
}

/* ── Meta bagian & kolom ─────────────────────────────────────────────────── */

export interface SectionMeta {
  /** Nama di rail dan judul form, persis referensi. */
  label: string
  /** Satu kalimat di bawah judul form. */
  description: string
}

export const sectionMeta: Record<V2SectionType, SectionMeta> = {
  'opening-envelope': { label: 'Opening Envelope', description: 'Amplop pembuka dengan nama tamu.' },
  'hero': { label: 'Hero', description: 'Cover utama undangan.' },
  'couple': { label: 'Mempelai', description: 'Profil kedua mempelai.' },
  'countdown': { label: 'Hitung Mundur', description: 'Hitung mundur menuju hari pernikahan.' },
  'event': { label: 'Rangkaian Acara', description: 'Akad dan resepsi.' },
  'map': { label: 'Lokasi', description: 'Peta dan alamat acara.' },
  'unduh-mantu': { label: 'Unduh Mantu', description: 'Acara tambahan pihak pria.' },
  'quote': { label: 'Quote', description: 'Ayat atau kutipan pilihan.' },
  'gallery': { label: 'Galeri', description: 'Kumpulan foto bahagia.' },
  'gift': { label: 'Hadiah', description: 'Rekening atau hadiah digital.' },
  'wishes': { label: 'Ucapan', description: 'Kehadiran dan buku tamu.' },
  'closing': { label: 'Penutup', description: 'Ucapan terima kasih.' },
  'story': { label: 'Cerita Cinta', description: 'Perjalanan kalian sampai hari ini.' },
  'rundown': { label: 'Rundown', description: 'Susunan acara per jam.' },
  'dresscode': { label: 'Dresscode', description: 'Busana yang diharapkan.' },
  'video': { label: 'Video', description: 'Video atau siaran langsung.' },
}

/**
 * Jenis kolom form. `teks` satu baris; `paragraf` `<textarea>`; `foto` satu URL gambar dari
 * pustaka; `foto[]` beberapa; `tanggal` `datetime-local`; `url` tautan; `boolean` sakelar.
 */
export type FieldKind = 'teks' | 'paragraf' | 'tanggal' | 'url' | 'foto' | 'foto[]' | 'boolean'

export interface FieldMeta {
  key: string
  label: string
  kind: FieldKind
  /** Batas panjang teks. Bawaan: teks 120, paragraf 600, url 2048. */
  max?: number
  /** Kolom yang boleh diberi gaya teks (font/ukuran/warna) — semua `teks` dan `paragraf`. */
  gaya?: boolean
  /** Kolom foto galeri: batas jumlah. */
  limit?: number
  /** Kolom yang hanya tampil bila kolom boolean lain menyala (mis. rekening kedua). */
  bila?: string
}

const teks = (key: string, label: string, max = 120): FieldMeta => ({ key, label, kind: 'teks', max, gaya: true })
const paragraf = (key: string, label: string, max = 600): FieldMeta => ({ key, label, kind: 'paragraf', max, gaya: true })
const url = (key: string, label: string): FieldMeta => ({ key, label, kind: 'url', max: 2048 })
const foto = (key: string, label = 'Foto komponen'): FieldMeta => ({ key, label, kind: 'foto' })

/**
 * Kolom tiap bagian, **urut seperti form referensi**. Label ditulis menurut fungsi kolomnya di
 * mata pasangan (keputusan fase 71), dan nama key mengikuti format data referensi supaya
 * dokumen yang diekspor/diimpor antar alat tetap terbaca.
 */
export const sectionFields: Record<V2SectionType, FieldMeta[]> = {
  'opening-envelope': [
    teks('eyebrow', 'Label pembuka'),
    teks('kicker', 'Kicker'),
    teks('title', 'Nama mempelai'),
    teks('date', 'Tanggal'),
    teks('guestLabel', 'Label nama tamu'),
    teks('sealMonogram', 'Monogram segel', 12),
    teks('sealLabel', 'Teks segel', 24),
    teks('callout', 'Judul petunjuk', 40),
    teks('subtitle', 'Petunjuk segel', 60),
    teks('footer', 'Catatan bawah'),
  ],
  'hero': [
    teks('monogram', 'Monogram atas', 12),
    teks('kicker', 'Kicker'),
    teks('title', 'Nama mempelai'),
    teks('subtitle', 'Tanggal'),
    teks('guestLabel', 'Label nama tamu'),
    teks('scrollLabel', 'Petunjuk scroll', 24),
    foto('imageUrl'),
  ],
  'couple': [
    teks('bismillah', 'Bismillah'),
    teks('greeting', 'Salam pembuka'),
    paragraf('subtitle', 'Kalimat pengantar'),
    teks('brideLabel', 'Label mempelai wanita'),
    teks('brideName', 'Nama mempelai wanita'),
    teks('brideOrder', 'Urutan anak (wanita)'),
    paragraf('brideParents', 'Orang tua mempelai wanita', 240),
    teks('groomLabel', 'Label mempelai pria'),
    teks('groomName', 'Nama mempelai pria'),
    teks('groomOrder', 'Urutan anak (pria)'),
    paragraf('groomParents', 'Orang tua mempelai pria', 240),
    foto('imageUrl'),
  ],
  'countdown': [
    teks('subtitle', 'Label'),
    teks('title', 'Judul'),
    { key: 'targetDate', label: 'Target tanggal & waktu', kind: 'tanggal' },
    teks('daysLabel', 'Label hari', 20),
    teks('hoursLabel', 'Label jam', 20),
    teks('minutesLabel', 'Label menit', 20),
    teks('secondsLabel', 'Label detik', 20),
    teks('buttonLabel', 'Teks tombol kalender', 40),
    url('calendarUrl', 'URL kalender'),
    foto('backgroundImageUrl', 'Background image'),
  ],
  'event': [
    teks('eyebrow', 'Label section'),
    teks('title', 'Judul'),
    teks('subtitle', 'Kalimat pengantar', 240),
    teks('day', 'Hari', 20),
    teks('date', 'Tanggal', 8),
    teks('monthYear', 'Bulan dan tahun', 40),
    teks('akadTitle', 'Nama acara akad', 60),
    teks('akadTime', 'Waktu akad', 60),
    teks('akadNote', 'Catatan akad', 80),
    teks('receptionTitle', 'Nama acara resepsi', 60),
    teks('receptionTime', 'Waktu resepsi', 60),
    teks('receptionNote', 'Catatan resepsi', 80),
  ],
  'map': [
    teks('title', 'Label lokasi'),
    paragraf('subtitle', 'Alamat', 400),
    url('mapUrl', 'URL Google Maps'),
    teks('buttonLabel', 'Teks tombol Maps', 40),
  ],
  'unduh-mantu': [
    teks('kicker', 'Keterangan'),
    teks('title', 'Nama acara'),
    teks('subtitle', 'Tanggal acara'),
    paragraf('address', 'Alamat', 400),
    url('mapUrl', 'URL Google Maps'),
    teks('buttonLabel', 'Teks tombol Maps', 40),
  ],
  'quote': [
    paragraf('title', 'Kutipan', 400),
    teks('subtitle', 'Sumber'),
    foto('imageUrl'),
  ],
  'gallery': [
    teks('eyebrow', 'Label section'),
    teks('title', 'Judul'),
    teks('viewLabel', 'Label preview foto', 40),
    teks('subtitle', 'Caption'),
    teks('lightboxTitle', 'Nama di lightbox'),
    { key: 'imageUrls', label: 'Foto komponen', kind: 'foto[]', limit: 15 },
  ],
  'gift': [
    teks('eyebrow', 'Label section'),
    teks('title', 'Judul'),
    paragraf('subtitle', 'Kalimat pengantar', 400),
    teks('bank1', 'Bank pertama', 60),
    teks('account1', 'Nomor rekening pertama', 34),
    teks('holder1', 'Pemilik rekening pertama'),
    teks('buttonLabel', 'Teks tombol salin', 40),
    teks('copiedLabel', 'Teks setelah disalin', 40),
    { key: 'hasSecondAccount', label: 'Rekening kedua aktif', kind: 'boolean' },
    { ...teks('bank2', 'Nama bank / e-wallet kedua', 60), bila: 'hasSecondAccount' },
    { ...teks('account2', 'Nomor rekening kedua', 34), bila: 'hasSecondAccount' },
    { ...teks('holder2', 'Nama pemilik kedua'), bila: 'hasSecondAccount' },
  ],
  'wishes': [
    teks('eyebrow', 'Label section'),
    teks('title', 'Judul'),
    teks('formTitle', 'Judul form'),
    teks('subtitle', 'Deskripsi form', 240),
    teks('nameLabel', 'Label nama', 40),
    teks('namePlaceholder', 'Placeholder nama', 60),
    teks('attendanceLabel', 'Label kehadiran', 40),
    teks('presentLabel', 'Pilihan hadir', 40),
    teks('unsureLabel', 'Pilihan belum pasti', 40),
    teks('absentLabel', 'Pilihan berhalangan', 40),
    teks('messageLabel', 'Label ucapan', 40),
    teks('messagePlaceholder', 'Placeholder ucapan', 120),
    teks('submitLabel', 'Teks tombol kirim', 40),
    teks('savingLabel', 'Teks saat menyimpan', 40),
    teks('successLabel', 'Pesan berhasil', 80),
    teks('celebrationLabel', 'Pesan animasi', 80),
    teks('loadingLabel', 'Pesan saat memuat', 60),
    teks('emptyLabel', 'Pesan saat kosong'),
  ],
  'closing': [
    teks('title', 'Judul'),
    paragraf('copy', 'Paragraf penutup', 400),
    teks('subtitle', 'Nama mempelai'),
    teks('greeting', 'Salam penutup'),
    teks('date', 'Tanggal'),
    foto('imageUrl'),
  ],
  'story': [
    teks('kicker', 'Label section'),
    teks('title', 'Judul'),
    paragraf('text', 'Cerita'),
    teks('closing', 'Kalimat penutup cerita'),
  ],
  'rundown': [
    teks('kicker', 'Label section'),
    teks('title', 'Judul'),
  ],
  'dresscode': [
    teks('kicker', 'Label section'),
    teks('title', 'Judul'),
    paragraf('text', 'Keterangan', 400),
    teks('note', 'Catatan di bawah'),
  ],
  'video': [
    teks('kicker', 'Label section'),
    teks('title', 'Judul'),
    url('url', 'URL video / siaran'),
    teks('open', 'Teks tombol siaran', 40),
  ],
}

/** Kolom yang boleh menerima gaya teks pada sebuah tipe. */
export function styledFieldKeys(type: V2SectionType): string[] {
  return (sectionFields[type] ?? []).filter(field => field.gaya).map(field => field.key)
}

/* ── Gaya teks, latar, gerak per bagian ──────────────────────────────────── */

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/)

/**
 * Gaya satu kolom teks (fase 72.4), bentuknya mengikuti referensi: `fontFamily`, `fontSize`
 * dalam px, `color` hex, `fontWeight` tebal, `fontStyle` miring. Kunci yang absen berarti ikut
 * tema. `textAlign` tambahan kita.
 */
export const textStyleSchema = z.object({
  fontFamily: z.enum(fontChoices).optional(),
  fontSize: z.number().int().min(10).max(96).optional(),
  color: color.optional(),
  fontWeight: z.literal('bold').optional(),
  fontStyle: z.literal('italic').optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
}).strict()
export type TextStyle = z.infer<typeof textStyleSchema>

/** Latar per bagian: warna solid dan/atau gambar dari pustaka. */
export const sectionBackgroundSchema = z.object({
  color: color.optional(),
  imageUrl: z.string().max(2048).optional(),
  /** Kepekatan lapisan warna di atas gambar, 0–1. */
  overlay: z.number().min(0).max(1).optional(),
}).strict()
export type SectionBackground = z.infer<typeof sectionBackgroundSchema>

/** Gerak masuk per bagian: preset partitur tema, `tema` = ikut tema, `tanpa` = diam. */
export const sectionMotions = ['tema', 'rise', 'sweep', 'iris', 'silhouette', 'tanpa'] as const
export type SectionMotion = (typeof sectionMotions)[number]

const kindSchema = (field: FieldMeta): z.ZodTypeAny => {
  switch (field.kind) {
    case 'teks': return z.string().max(field.max ?? 120)
    case 'paragraf': return z.string().max(field.max ?? 600)
    case 'tanggal': return z.string().max(40)
    case 'url': return z.string().max(field.max ?? 2048)
    case 'foto': return z.string().max(2048)
    case 'foto[]': return z.array(z.string().max(2048)).max(field.limit ?? 15)
    case 'boolean': return z.boolean()
  }
}

/**
 * Struktur BERULANG milik bagian ekstra — yang tidak bisa dinyatakan sebagai satu `FieldMeta`.
 *
 * `sectionFields` memang tidak memuatnya, dan itu benar: `FieldMeta` menggambarkan satu kolom
 * form, sementara ini daftar baris yang disunting `ExtrasForm.vue`. Tapi sampai fase 74.3
 * akibatnya kunci-kunci ini lolos `.passthrough()` **tanpa batas apa pun** — satu-satunya
 * plafonnya adalah 200 KB seluruh dokumen, dan migrator menyalinnya bulat-bulat
 * (`Object.assign` di `migrateLegacyDocument`).
 *
 * Bentuknya mengikuti normalizer yang sudah dipakai renderer (`apps/web/utils/invitation-options.ts`:
 * `toStorySteps`, `toDresscodeColors`, `toAttire`) supaya kontrak dan layar tidak berselisih.
 * Tiap baris `.partial().passthrough()`: dokumen lama boleh punya kunci pendamping, dan kolom
 * yang belum diisi memang kosong — yang dijaga di sini adalah PANJANG dan JUMLAH, bukan
 * kelengkapan. `rundown` menerima `name` karena dokumen v1 memakainya dan `Rundown.vue` masih
 * membacanya sebagai cadangan `title`.
 */
/**
 * Sisi munculnya satu langkah cerita. Tinggal di kontrak sejak fase 74.3 karena skemanya
 * membacanya; `apps/web/utils/invitation-options.ts` mengimpornya dari sini supaya tidak ada
 * dua daftar yang bisa berselisih.
 */
export const storySides = ['kiri', 'kanan'] as const
export type StorySide = (typeof storySides)[number]

const baris = (bentuk: z.ZodRawShape) => z.object(bentuk).partial().passthrough()
const teksBaris = (max = 200) => z.string().max(max)

export const sectionExtraSchemas: Partial<Record<V2SectionType, z.ZodRawShape>> = {
  story: {
    steps: z.array(baris({
      id: teksBaris(64), title: teksBaris(), text: z.string().max(600),
      image: z.string().max(2048), side: z.enum(storySides),
    })).max(20).optional(),
  },
  rundown: {
    items: z.array(baris({
      id: teksBaris(64), time: teksBaris(40), title: teksBaris(),
      name: teksBaris(), description: z.string().max(400),
    })).max(30).optional(),
  },
  dresscode: {
    attire: z.array(z.string().max(80)).max(12).optional(),
    colors: z.array(baris({ hex: teksBaris(32), name: teksBaris(60) })).max(12).optional(),
  },
}

/**
 * Skema `data` sebuah bagian v2, diturunkan dari `sectionFields` + `sectionExtraSchemas`.
 * `passthrough`, bukan `strict`: `ornamentOverrides`, `imageLabel`, dan kunci pendamping lain
 * boleh ikut, tapi setiap kolom yang dikenal divalidasi bentuk dan panjangnya.
 */
export function sectionDataSchema(type: V2SectionType) {
  const fields = Object.fromEntries((sectionFields[type] ?? []).map(field => [field.key, kindSchema(field).optional()]))
  const styled = styledFieldKeys(type)
  return z.object({
    ...fields,
    ...(sectionExtraSchemas[type] ?? {}),
    textStyles: z.object(Object.fromEntries(styled.map(key => [key, textStyleSchema.optional()]))).strict().optional(),
    background: sectionBackgroundSchema.optional(),
    motion: z.enum(sectionMotions).optional(),
  }).passthrough()
}

export const isV2SectionType = (type: string): type is V2SectionType => (v2SectionTypes as readonly string[]).includes(type)

/* ── Pengaturan undangan (musik, tata letak, kartu bagikan) ──────────────── */

export const layoutFocuses = ['kartu', 'penuh'] as const
export type LayoutFocus = (typeof layoutFocuses)[number]

export const invitationSettingsSchema = z.object({
  musicUrl: z.string().max(2048).optional(),
  musicTitle: z.string().max(120).optional(),
  musicVolume: z.number().min(0).max(1).optional(),
}).strict()
export type InvitationSettings = z.infer<typeof invitationSettingsSchema>

export const cardStyles = ['template', 'elegan', 'minimal'] as const
export const cardBackgrounds = ['template', 'foto', 'warna'] as const
export const shareCardSchema = z.object({
  styleId: z.enum(cardStyles).optional(),
  backgroundMode: z.enum(cardBackgrounds).optional(),
  backgroundColor: color.optional(),
  imageUrl: z.string().max(2048).optional(),
  accent: color.optional(),
  text: color.optional(),
  textAlign: z.enum(['left', 'center']).optional(),
  showGuestName: z.boolean().optional(),
  showDate: z.boolean().optional(),
  showVenue: z.boolean().optional(),
}).strict()
export type ShareCardStyle = z.infer<typeof shareCardSchema>

/* ── Dokumen bawaan v2 ───────────────────────────────────────────────────── */

export interface DefaultDocumentInput {
  partner1: string
  partner2: string
  /** Tanggal ISO (`YYYY-MM-DD` atau lengkap). Kosong = teks placeholder. */
  date?: string
  venue?: string
  address?: string
  mapUrl?: string
}

const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

/** Pecahan tanggal untuk kolom-kolom teks referensi ("Sabtu", "03", "Oktober 2026", "03 · 10 · 2026"). */
export function dateParts(iso: string | undefined) {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return { day: '', date: '', monthYear: '', dotted: '', long: '', iso: '' }
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return {
    day: hari[d.getDay()]!,
    date: dd,
    monthYear: `${bulan[d.getMonth()]} ${yyyy}`,
    dotted: `${dd} · ${mm} · ${yyyy}`,
    long: `${hari[d.getDay()]} · ${dd} ${bulan[d.getMonth()]} · ${yyyy}`,
    iso: `${yyyy}-${mm}-${dd}T08:00`,
  }
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

export type V2Section = { id: string; type: SectionType; enabled: boolean; data: Record<string, unknown> }

/** Dua belas bagian Elegance + empat bagian ekstra, terisi kata-kata bawaan berbahasa Indonesia. */
export function createEleganceSections(input: DefaultDocumentInput): V2Section[] {
  const { partner1, partner2 } = input
  const pasangan = `${partner1} & ${partner2}`
  const mono = `${initial(partner1)} & ${initial(partner2)}`
  const t = dateParts(input.date)
  const venue = input.venue?.trim() || ''
  const address = input.address?.trim() || ''
  return [
    { id: 'opening-envelope', type: 'opening-envelope', enabled: true, data: {
      eyebrow: 'Dengan penuh kebahagiaan', kicker: 'The Wedding of', title: pasangan, date: t.dotted || 'Tanggal menyusul',
      guestLabel: 'Kepada Yth.', sealMonogram: mono, sealLabel: 'Buka', callout: 'Klik di sini', subtitle: 'untuk membuka',
      footer: 'Sebuah undangan istimewa untuk Anda',
    } },
    { id: 'hero', type: 'hero', enabled: true, data: {
      monogram: mono, kicker: 'The Wedding of', title: pasangan, subtitle: t.long || 'Tanggal menyusul',
      guestLabel: 'Kepada Yth.', scrollLabel: 'Scroll', imageUrl: '',
    } },
    { id: 'couple', type: 'couple', enabled: true, data: {
      bismillah: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيْم', greeting: 'Assalamu’alaikum Warahmatullahi Wabarakatuh',
      subtitle: 'Dengan memohon rahmat dan rida Allah SWT, kami bermaksud menyelenggarakan pernikahan putra-putri kami.',
      brideLabel: 'The Bride', brideName: partner1, brideOrder: 'Putri pertama dari', brideParents: 'Bapak … & Ibu …',
      groomLabel: 'The Groom', groomName: partner2, groomOrder: 'Putra pertama dari', groomParents: 'Bapak … & Ibu …',
      imageUrl: '',
    } },
    { id: 'countdown', type: 'countdown', enabled: true, data: {
      subtitle: 'Save the Date', title: 'Menuju Hari Bahagia', targetDate: t.iso,
      daysLabel: 'Hari', hoursLabel: 'Jam', minutesLabel: 'Menit', secondsLabel: 'Detik',
      buttonLabel: 'Simpan Tanggal', calendarUrl: '', backgroundImageUrl: '',
    } },
    { id: 'event', type: 'event', enabled: true, data: {
      eyebrow: 'Rangkaian Acara', title: 'Hari Bahagia Kami', subtitle: 'Insya Allah akan dilaksanakan pada:',
      day: t.day || 'Hari', date: t.date || '00', monthYear: t.monthYear || 'Bulan Tahun',
      akadTitle: 'Akad Nikah', akadTime: '08.00 WIB s.d selesai', akadNote: 'Pagi hari',
      receptionTitle: 'Resepsi', receptionTime: '11.00 – 14.00 WIB', receptionNote: 'Sampai selesai',
    } },
    { id: 'map', type: 'map', enabled: true, data: {
      title: 'Lokasi Akad & Resepsi', subtitle: [venue, address].filter(Boolean).join('\n') || 'Lokasi akan diumumkan',
      mapUrl: input.mapUrl?.trim() || '', buttonLabel: 'Buka Google Maps',
    } },
    { id: 'unduh-mantu', type: 'unduh-mantu', enabled: false, data: {
      kicker: 'Acara Keluarga Mempelai Pria', title: 'Unduh Mantu', subtitle: 'Tanggal menyusul',
      address: '', mapUrl: '', buttonLabel: 'Buka Google Maps',
    } },
    { id: 'quote', type: 'quote', enabled: true, data: {
      title: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram di sampingnya.',
      subtitle: 'QS. Ar-Rum: 21', imageUrl: '',
    } },
    { id: 'gallery', type: 'gallery', enabled: true, data: {
      eyebrow: 'Our Moments', title: 'Galeri Bahagia', viewLabel: 'lihat foto', subtitle: 'Two hearts, one beautiful story.',
      lightboxTitle: pasangan, imageUrls: [] as string[],
    } },
    { id: 'gift', type: 'gift', enabled: false, data: {
      eyebrow: 'Tanda Kasih', title: 'Wedding Gift',
      subtitle: 'Doa restu Anda merupakan hadiah terindah bagi kami. Namun bila ingin memberikan tanda kasih, dapat melalui rekening berikut.',
      bank1: 'Bank BCA', account1: '', holder1: `a.n. ${partner2}`, buttonLabel: 'Salin nomor', copiedLabel: 'Tersalin',
      hasSecondAccount: false, bank2: '', account2: '', holder2: '',
    } },
    { id: 'wishes', type: 'wishes', enabled: true, data: {
      eyebrow: 'Kirim Doa', title: 'Ucapan & Kehadiran', formTitle: 'Tinggalkan Pesan',
      subtitle: 'Setiap doa adalah hadiah terindah bagi kami', nameLabel: 'Nama Anda', namePlaceholder: 'Tulis nama lengkap',
      attendanceLabel: 'Konfirmasi Kehadiran', presentLabel: 'Hadir', unsureLabel: 'Belum pasti', absentLabel: 'Berhalangan hadir',
      messageLabel: 'Ucapan & Doa', messagePlaceholder: 'Tuliskan doa terbaik untuk kedua mempelai…',
      submitLabel: 'Kirim Ucapan', savingLabel: 'Menyimpan…', successLabel: 'Ucapan berhasil tersimpan.',
      celebrationLabel: 'Terima kasih atas doanya!', loadingLabel: 'Memuat ucapan…',
      emptyLabel: 'Jadilah yang pertama mengirimkan doa terbaik.',
    } },
    { id: 'closing', type: 'closing', enabled: true, data: {
      title: 'Terima Kasih',
      copy: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.',
      subtitle: pasangan, greeting: 'Wassalamu’alaikum Warahmatullahi Wabarakatuh', date: t.dotted || '', imageUrl: '',
    } },
    { id: 'story', type: 'story', enabled: false, data: { kicker: 'Cerita kami', title: 'Awal sebuah cerita', text: '', closing: '…dan sampailah kami di hari ini.', steps: [] as unknown[] } },
    { id: 'rundown', type: 'rundown', enabled: false, data: { kicker: 'Susunan acara', title: 'Rundown', items: [] as unknown[] } },
    { id: 'dresscode', type: 'dresscode', enabled: false, data: { kicker: 'Dresscode', title: 'Yang kami harapkan dikenakan', text: '', note: 'Kenakan yang membuat Anda nyaman.', attire: [] as string[], colors: [] as unknown[] } },
    { id: 'video', type: 'video', enabled: false, data: { kicker: 'Saksikan bersama', title: 'Saksikan kebahagiaan kami', url: '', open: 'Buka siaran' } },
  ]
}

/* ── Migrasi dokumen v1 → v2 ─────────────────────────────────────────────── */

type AnyDoc = { schemaVersion?: number; sections?: { id: string; type: string; enabled: boolean; data: Record<string, unknown> }[]; copy?: Record<string, string>; [k: string]: unknown }

const str = (v: unknown, fallback = '') => (typeof v === 'string' && v.trim() ? v : fallback)

/**
 * Menerjemahkan dokumen v1 (cover/couple/events/…) ke struktur Elegance. Murni dan idempoten:
 * dokumen yang sudah v2 dikembalikan apa adanya. Yang tidak punya padanan (mis. `rsvp`)
 * dilebur ke bagian v2 terdekat (`wishes` membawa pilihan kehadiran).
 *
 * Tiga kehilangan yang dipilih, bukan kecelakaan, dan masing-masing dipin sebuah tes:
 * `rsvp.data.deadline` (v2 tidak punya batas RSVP di dokumen), acara keempat dan seterusnya, dan
 * `closing` yang dimatikan di v1 (di v2 ia bagian wajib).
 */
export function migrateLegacyDocument<T extends AnyDoc>(document: T): T {
  if (document.schemaVersion === 2) return document
  const lama = new Map((document.sections ?? []).map(section => [section.type, section]))
  const cover = lama.get('cover')?.data ?? {}
  const couple = lama.get('couple')?.data ?? {}
  const eventsData = lama.get('events')?.data ?? {}
  const events = Array.isArray(eventsData.events) ? (eventsData.events as Record<string, unknown>[]) : []
  const akad = events[0] ?? {}
  const resepsi = events[1] ?? akad
  const countdown = lama.get('countdown')?.data ?? {}
  const gallery = lama.get('gallery')?.data ?? {}
  const gift = lama.get('gift')?.data ?? {}
  const closing = lama.get('closing')?.data ?? {}
  const music = lama.get('music')?.data ?? {}
  const copy = document.copy ?? {}

  const partner1 = str(couple.partner1, 'Aruna')
  const partner2 = str(couple.partner2, 'Dewa')
  // Tanggal acara datang dari `events[0].date` lebih dulu; `countdown.date` hanya cadangan.
  // Sebelumnya hanya hitung mundur yang dibaca, jadi undangan yang mengisi tanggal di form acara —
  // tempat yang wajar — mendarat di "Hari / 00 / Bulan Tahun".
  const tanggalIso = str(akad.date, str(countdown.date))
  const baru = createEleganceSections({ partner1, partner2, date: tanggalIso || undefined, venue: str(akad.venue), address: str(akad.address), mapUrl: str(akad.mapUrl) })
  const at = (type: string) => baru.find(section => section.type === type)!

  Object.assign(at('opening-envelope').data, {
    title: str(cover.title, `${partner1} & ${partner2}`),
    kicker: str(copy['gate.kicker'], 'The Wedding of'),
    guestLabel: str(copy['gate.greeting'], 'Kepada Yth.'),
    sealLabel: str(copy['gate.open'], 'Buka'),
    ...(cover.ornamentOverrides ? { ornamentOverrides: cover.ornamentOverrides } : {}),
    ...(cover.ornamentIntensity ? { ornamentIntensity: cover.ornamentIntensity } : {}),
  })
  Object.assign(at('hero').data, { title: str(cover.title, `${partner1} & ${partner2}`), kicker: str(cover.subtitle, 'The Wedding of'), imageUrl: str(cover.image) })
  Object.assign(at('couple').data, { subtitle: str(couple.description, at('couple').data.subtitle as string), imageUrl: str(couple.image) })
  if (events.length) {
    Object.assign(at('event').data, {
      akadTitle: str(akad.name, 'Akad Nikah'), akadTime: str(akad.time, ''), receptionTitle: str(resepsi.name, 'Resepsi'), receptionTime: str(resepsi.time, ''),
    })
  }
  /*
   * Resepsi di gedung lain ikut ke `map`: v2 hanya punya satu bagian lokasi, dan alamat kedua yang
   * lenyap tanpa jejak jauh lebih mahal daripada satu paragraf yang agak panjang.
   */
  const alamatDari = (acara: Record<string, unknown>) => [str(acara.venue), str(acara.address)].filter(Boolean).join('\n')
  const alamatResepsi = alamatDari(resepsi)
  if (resepsi !== akad && alamatResepsi && alamatResepsi !== alamatDari(akad)) {
    at('map').data.subtitle = `${at('map').data.subtitle as string}\n\n${str(resepsi.name, 'Resepsi')}\n${alamatResepsi}`.slice(0, 400)
  }
  /*
   * Acara ketiga mendarat di `unduh-mantu`: satu-satunya bagian Elegance yang memang berbentuk
   * "acara tambahan dengan tanggal, alamat, dan peta sendiri". Fiturnya `events`, jadi menyalakannya
   * tidak pernah membuat undangan paket Mula gagal terbit. Acara keempat dan seterusnya adalah
   * kehilangan yang dipilih — menambah bagian baru urusan fase sesudah ini, dan menyimpannya sebagai
   * kunci yang tidak dirender siapa pun lebih buruk daripada kehilangan yang tercatat.
   */
  const ketiga = events[2]
  if (ketiga) {
    at('unduh-mantu').enabled = true
    Object.assign(at('unduh-mantu').data, {
      kicker: 'Acara tambahan',
      title: str(ketiga.name, 'Acara ketiga').slice(0, 120),
      subtitle: [str(ketiga.date), str(ketiga.time)].filter(Boolean).join(' · ').slice(0, 120),
      address: alamatDari(ketiga).slice(0, 400),
      mapUrl: str(ketiga.mapUrl),
    })
  }
  Object.assign(at('gallery').data, { imageUrls: Array.isArray(gallery.images) ? gallery.images : [] })
  const accounts = Array.isArray(gift.accounts) ? (gift.accounts as Record<string, unknown>[]) : []
  const a1 = accounts[0]; const a2 = accounts[1]
  Object.assign(at('gift').data, {
    title: str(gift.title, 'Wedding Gift'), subtitle: str(gift.note, at('gift').data.subtitle as string),
    bank1: str(a1?.bankLabel, str(gift.bank, 'Bank')), account1: str(a1?.number, str(gift.account)), holder1: str(a1?.holder, str(gift.holder)),
    hasSecondAccount: Boolean(a2), bank2: str(a2?.bankLabel), account2: str(a2?.number), holder2: str(a2?.holder),
  })
  at('gift').enabled = lama.get('gift')?.enabled ?? false
  /*
   * `enabled` v1 → v2. Tanpa ini bagian yang sengaja dimatikan pasangan menyala lagi diam-diam,
   * dan mereka menemukannya dari undangan yang sudah beredar.
   *
   * Bagian WAJIB v2 (`opening-envelope`, `hero`, `couple`, `event`, `closing`) tidak punya sakelar
   * di rail, jadi selalu menyala: `closing` yang dimatikan di v1 akan kembali, dan itu satu-satunya
   * bagian yang berpindah dari opsional ke wajib. `quote` tidak punya padanan v1 dan ikut menyala
   * sebagai bagian dari wajah Elegance — satu klik untuk mematikannya.
   */
  const nyala = (type: string, bawaan: boolean) => lama.get(type)?.enabled ?? bawaan
  at('countdown').enabled = nyala('countdown', true)
  at('gallery').enabled = nyala('gallery', true)
  at('map').enabled = nyala('events', true)
  // `rsvp` dan `wishes` v1 melebur jadi satu bagian v2; cukup salah satunya menyala. Yang dihitung
  // hanya yang benar-benar ada di dokumen lama — dokumen tanpa keduanya ikut bawaan.
  const kehadiran = ['rsvp', 'wishes'].map(type => lama.get(type)).filter(Boolean)
  at('wishes').enabled = kehadiran.length ? kehadiran.some(section => section!.enabled) : true
  Object.assign(at('closing').data, { copy: str(closing.text, at('closing').data.copy as string) })
  for (const type of ['story', 'rundown', 'dresscode', 'video'] as const) {
    const old = lama.get(type)
    if (!old) continue
    at(type).enabled = old.enabled
    Object.assign(at(type).data, old.data)
  }
  const settings: InvitationSettings = {}
  // `enabled` ikut dibaca: di v1 renderer hanya memutar musik bila bagiannya menyala, jadi sebuah URL
  // yang tertinggal di draft yang sengaja dibisukan akan mulai berbunyi sesudah migrasi.
  if (lama.get('music')?.enabled && str(music.url)) { settings.musicUrl = str(music.url); settings.musicTitle = str(music.title) || undefined }
  const { copy: _copy, ...rest } = document
  return { ...rest, schemaVersion: 2, sections: baru, ...(Object.keys(settings).length ? { settings } : {}) } as T
}
