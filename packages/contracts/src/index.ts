import { z } from 'zod'

export function normalizeDisplayName(value: string): string {
  const name = value.normalize('NFC').trim()
  if (!name || [...name].length > 200 || /[\p{Cc}\p{Zl}\p{Zp}]/u.test(value)) throw new Error('Nama wajib, satu baris, maksimum 200 karakter.')
  return name
}

export function buildGuestUrl(base: string, slug: string, displayName: string, token?: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Slug tidak valid.')
  const url = new URL(`/i/${slug}`, base)
  url.searchParams.set('to', normalizeDisplayName(displayName))
  if (token) url.searchParams.set('g', token)
  return url.toString()
}

export * from './sections'
export * from './structures'
import { createLegacySections } from './structures'
import { sectionTypes, createEleganceSections, isV2SectionType, sectionDataSchema, invitationSettingsSchema, shareCardSchema, layoutFocuses, type DefaultDocumentInput } from './sections'
export { sectionTypes }

/**
 * Setiap id yang pernah sah di dalam sebuah dokumen, termasuk yang temanya sudah pensiun.
 *
 * Daftar ini **hanya tumbuh**. Ia satu-satunya sumber `z.enum(templateIds)`, jadi mencabut
 * sebuah id dari sini membuat tiap draft dan tiap revisi terbit yang memakainya gagal
 * divalidasi — undangan yang sedang dibaca tamu ikut mati. Yang dicabut saat sebuah tema
 * dipensiunkan adalah keanggotaannya di `liveTemplateIds`, bukan di sini.
 *
 * Bentuknya menyalin preseden `fontChoices` (12, termasuk `dm-sans` yang pensiun) versus
 * `selectableFonts` (11) di berkas yang sama.
 */
export const templateIds = ['aruna-bloom', 'aruna-wastra', 'aruna-hening', 'aruna-pelita', 'aruna-sekar', 'aruna-lumine', 'aruna-senja', 'aruna-alba', 'aruna-sogan', 'aruna-gonjong', 'aruna-mendung', 'aruna-kenanga', 'aruna-bentar'] as const
export type TemplateId = (typeof templateIds)[number]

/**
 * Id yang benar-benar punya wajah hari ini: palet, set ornamen, dan partitur.
 *
 * Inilah yang diiterasi setiap pemilih — kartu landing, langkah tema `/order`, grid tema
 * editor — jadi tema pensiun hilang dari ketiganya sekaligus tanpa satu pun ikut diubah.
 */
export const liveTemplateIds = ['aruna-bloom', 'aruna-wastra', 'aruna-hening', 'aruna-pelita', 'aruna-sekar'] as const satisfies readonly TemplateId[]
export type LiveTemplateId = (typeof liveTemplateIds)[number]

/**
 * Id pensiun → tema hidup yang menggantikan wajahnya.
 *
 * Tipenya `Record<Exclude<TemplateId, LiveTemplateId>, LiveTemplateId>` dengan sengaja: saat
 * sebuah id dicabut dari `liveTemplateIds`, compiler **menuntut** aliasnya ditulis di sini.
 * Tidak mungkin ada id pensiun yang tidak punya tujuan, dan tidak mungkin ada alias yang
 * menunjuk tema yang juga sudah pensiun.
 */
export const templateAliases: Record<Exclude<TemplateId, LiveTemplateId>, LiveTemplateId> = {
  /*
   * Dipetakan ke pengganti TERDEKAT, bukan semuanya ke bawaan.
   *
   * Pasangan yang temanya dipensiunkan tidak memilih perpindahan ini, jadi yang paling sedikit
   * mengejutkan adalah wajah yang paling dekat dengan yang dulu ia pilih. Dipilih dari watak,
   * bukan dari urutan: emas sampanye → emas malam, dan keempat tema yang dulu menyebut suku
   * tertentu → gaya etnik modern yang tidak mengklaim satu tradisi pun.
   */
  'aruna-lumine': 'aruna-pelita',
  'aruna-senja': 'aruna-wastra',
  'aruna-alba': 'aruna-hening',
  'aruna-sogan': 'aruna-wastra',
  'aruna-gonjong': 'aruna-wastra',
  'aruna-mendung': 'aruna-wastra',
  'aruna-kenanga': 'aruna-bloom',
  'aruna-bentar': 'aruna-wastra',
}

const liveTemplateIdSet: ReadonlySet<string> = new Set(liveTemplateIds)

export function isLiveTemplateId(id: string): id is LiveTemplateId {
  return liveTemplateIdSet.has(id)
}

/**
 * Terjemahkan id apa pun jadi tema yang benar-benar bisa dirender.
 *
 * Satu-satunya penerjemah: lapisan web memanggilnya di pintu masuk `themeOf()`,
 * `themeOrnaments()`, `themeStyle()`, dan `themeMotion()`, jadi tidak ada jalur render yang
 * bisa menerima id pensiun tanpa melewatinya. Id yang tidak dikenal sama sekali jatuh ke
 * tema pertama, bukan melempar — dokumen yang rusak tetap harus bisa dibuka pemiliknya.
 */
export function resolveTemplateId(id: string): LiveTemplateId {
  if (isLiveTemplateId(id)) return id
  return templateAliases[id as Exclude<TemplateId, LiveTemplateId>] ?? liveTemplateIds[0]
}

export { fontChoices, type FontChoice } from './fonts'
import { fontChoices, type FontChoice } from './fonts'
export const selectableFonts: { id: FontChoice; label: string }[] = [
  { id: 'cormorant', label: 'Cormorant Garamond' },
  { id: 'fraunces', label: 'Fraunces' },
  { id: 'italiana', label: 'Italiana' },
  { id: 'jost', label: 'Jost' },
  { id: 'jakarta', label: 'Plus Jakarta Sans' },
  { id: 'instrument', label: 'Instrument Serif' },
  { id: 'charm', label: 'Charm' },
  // Script kaligrafis. Hanya mengendalikan huruf JUDUL (`tokens.font` → `--iv-display`);
  // huruf body datang dari `themePresentation.body`, jadi aturan "script tidak pernah untuk
  // paragraf atau navigasi" di DESIGN.md tidak bisa dilanggar dari sini.
  { id: 'great-vibes', label: 'Great Vibes' },
  { id: 'parisienne', label: 'Parisienne' },
  { id: 'pinyon', label: 'Pinyon Script' },
  { id: 'allura', label: 'Allura' },
]

/**
 * Font yang boleh jadi huruf BODY, dan itu himpunan yang berbeda dari `selectableFonts`.
 *
 * `DESIGN.md` menyatakan "script/handwriting tidak pernah untuk paragraf atau navigasi" sebagai
 * aturan. Sampai fase 58 aturan itu ditegakkan oleh **struktur**: huruf body datang dari
 * `themePresentation.body` dan pasangan tidak bisa menyentuhnya, jadi tidak ada jalan
 * melanggarnya. Membuka pemilih body tanpa menyaring akan mencabut aturannya diam-diam — lima
 * script di `selectableFonts` semuanya berbobot 400 dan bersambung, dan paragraf 16px dalam
 * Allura tidak terbaca.
 *
 * `italiana` ikut di luar walau bukan script: ia display berbobot 400 dengan goresan sangat
 * tipis, dirancang untuk ukuran besar. Ia sah sebagai huruf judul (dan memang bawaan
 * `aruna-pelita`) dan tidak sah sebagai huruf paragraf.
 *
 * Validasinya tetap `z.enum(fontChoices)` supaya dokumen lama dengan nilai apa pun tetap
 * terbaca; yang disempitkan hanya apa yang DITAWARKAN. Pola yang sama persis dengan
 * `fontChoices` versus `selectableFonts` di atas.
 */
export const bodyFontChoices = ['jakarta', 'jost', 'cormorant', 'fraunces', 'instrument'] as const
export type BodyFontChoice = (typeof bodyFontChoices)[number]
export const selectableBodyFonts: { id: FontChoice; label: string }[] =
  selectableFonts.filter(font => (bodyFontChoices as readonly string[]).includes(font.id))

export function isBodyFont(value: unknown): value is BodyFontChoice {
  return typeof value === 'string' && (bodyFontChoices as readonly string[]).includes(value)
}

/**
 * Ubin latar yang bisa dipilih pasangan. **Append-only**, alasan yang sama dengan `templateIds`:
 * ia sumber `z.enum`, jadi mencabut sebuah id membuat tiap dokumen yang memakainya gagal
 * divalidasi — termasuk undangan yang sedang dibaca tamu.
 *
 * `'tema'` berarti ikut bawaan tema dan tidak sama dengan tidak memilih; `'tanpa'` berarti
 * pasangan sengaja mematikannya. Keduanya perlu, karena tanpa `'tanpa'` pasangan `aruna-sekar`
 * tidak punya cara melepas damask-nya.
 */
export const backdropTiles = ['catur', 'kawung', 'kenanga', 'mega-mendung', 'sekar-damask', 'songket'] as const
export type BackdropTile = (typeof backdropTiles)[number]
export const backdropChoices = ['tema', 'tanpa', ...backdropTiles] as const
export type BackdropChoice = (typeof backdropChoices)[number]

/**
 * Kepekatan latar dalam tiga tingkat, bukan angka bebas — meniru `ornamentIntensities`.
 *
 * Ubin dicat `background-color: var(--iv-accent)` tepat di belakang teks. Laporan keterbacaan
 * di editor mengukur teks terhadap `--iv-bg`, **bukan** terhadap ubin, jadi slider bebas akan
 * membuka jalan ke latar yang menelan paragraf tanpa satu pun gerbang menyadarinya. Angkanya
 * dipetakan di `apps/web/utils/backdrops.ts`; yang tertinggi sengaja dekat dengan nilai tema
 * yang sudah terbit (0,07), bukan jauh di atasnya.
 */
export const backdropWeights = ['halus', 'sedang', 'tegas'] as const
export type BackdropWeight = (typeof backdropWeights)[number]

/**
 * Curated starting point for each template. Couples on the `design` entitlement can
 * still override the three colours; the preset only decides where they start.
 */
export const templates: { id: LiveTemplateId; name: string; version: number; tagline: string; accent: string; tokens: { background: string; foreground: string; primary: string; font: FontChoice } }[] = [
  { id: 'aruna-bloom', name: 'Aruna Bloom', version: 1, tagline: 'Botanical ivory yang hangat dan klasik.', accent: '#7A8B6F', tokens: { background: '#FBF6EE', foreground: '#241A14', primary: '#A93F23', font: 'cormorant' } },
  { id: 'aruna-wastra', name: 'Aruna Wastra', version: 1, tagline: 'Etnik modern: motif diabstraksi jadi bidang besar.', accent: '#3E5C57', tokens: { background: '#F3EDE3', foreground: '#20191A', primary: '#7E3B2C', font: 'fraunces' } },
  { id: 'aruna-hening', name: 'Aruna Hening', version: 1, tagline: 'Editorial minimal: huruf yang jadi ornamennya.', accent: '#9AA3A8', tokens: { background: '#FAFAF8', foreground: '#14150F', primary: '#3A4F48', font: 'instrument' } },
  { id: 'aruna-pelita', name: 'Aruna Pelita', version: 1, tagline: 'Mewah gelap: emas pada bidang malam.', accent: '#8E6B3A', tokens: { background: '#141719', foreground: '#F1ECE2', primary: '#D9B978', font: 'italiana' } },
  /*
   * Paletnya DIUKUR, bukan dipilih dari selera.
   *
   * Keempat nilainya lahir dari histogram piksel sembilan referensi pemilik
   * (`imported/canva-sekar/measurements.json`): kertas krem, tinta cokelat, sogan, dan emas
   * `#C89F3B` — yang terakhir persis stop tengah gradient palsu referensi F.
   *
   * Lalu keempatnya diuji terhadap gerbang yang sudah ada sebelum ditulis ke sini. Tiga
   * kandidat sebelumnya gagal di tempat yang sama: "warna aksi di atas bidang bertinta"
   * mendarat di 3,79 · 4,44 · 4,31 terhadap ambang 4,5. Yang lolos adalah primary yang lebih
   * gelap DAN lebih kelabu — bukan emas yang lebih terang, yang justru memperburuknya.
   */
  { id: 'aruna-sekar', name: 'Aruna Sekar', version: 1, tagline: 'Krem sogan: damask, sulur, dan cat air bergradasi.', accent: '#C89F3B', tokens: { background: '#F3EBDE', foreground: '#382C24', primary: '#7A5C44', font: 'cormorant' } },
]

/** Preset sebuah id, dengan id pensiun diterjemahkan lebih dulu ke penggantinya. */
export function templateById(id: string) {
  const live = resolveTemplateId(id)
  return templates.find(template => template.id === live)
}

/**
 * Gerak per undangan (fase 69), terenumerasi — bukan angka bebas.
 *
 * `amplop` mengatur tempo gerbang amplop; `masuk` menimpa tata bahasa masuk section milik tema.
 * Keduanya opsional dan **tidak pernah menyimpan nilai "ikut tema"**: editor menghapus kuncinya,
 * dan `motion` yang kosong ikut dihapus, supaya preset tema tetap identik dengan dokumen baru dan
 * `designFingerprint` tidak membedakan `{}` dari absen. Angkanya milik web (`motion-envelope.ts`);
 * `motion-score.ts` tetap milik tema — dokumen hanya memilih dari yang tema sediakan.
 */
export const envelopeSpeeds = ['pelan', 'sedang', 'cepat'] as const
export type EnvelopeSpeed = (typeof envelopeSpeeds)[number]
export const entranceStyles = ['rise', 'sweep', 'iris', 'silhouette'] as const
export type EntranceStyle = (typeof entranceStyles)[number]
export const motionSchema = z.object({
  amplop: z.enum(envelopeSpeeds).optional(),
  masuk: z.enum(entranceStyles).optional(),
}).strict()
export type InvitationMotion = z.infer<typeof motionSchema>

/**
 * Kata-kata undangan yang boleh ditulis ulang pasangan (fase 69).
 *
 * Daftar kuncinya **tertutup** dan batas panjangnya per jenis, bukan `z.record(z.string())`:
 * setiap kunci di sini punya satu tempat render yang pasti, dan renderer hanya membaca kunci yang
 * ia kenal — kunci asing tidak pernah bisa "muncul" di undangan, jadi tidak ada gunanya
 * menyimpannya. Nilai bawaan tiap kunci hidup di `apps/web/utils/invitation-copy.ts`, bukan di
 * sini: kontrak menetapkan apa yang boleh diubah, wajah tema menetapkan bunyinya.
 *
 * String konten yang sudah lama bisa disunting lewat `section.data` (deskripsi mempelai, judul
 * cerita, catatan hadiah, penutup) **tidak** dipindah ke sini. Yang masuk hanya kalimat sistem
 * yang selama ini ditulis mati di komponen: kicker, judul bagian, label tombol, kalimat gerbang.
 */
export const copyKeys = [
  'gate.kicker', 'gate.greeting', 'gate.noGuest', 'gate.open', 'gate.music',
  'cover.kicker',
  'couple.kicker',
  'events.kicker', 'events.title', 'events.map', 'events.calendar',
  'countdown.kicker', 'countdown.arrived', 'countdown.tba',
  'gallery.kicker', 'gallery.title',
  'story.kicker', 'story.closing',
  'rundown.kicker', 'rundown.title',
  'dresscode.kicker', 'dresscode.title', 'dresscode.note',
  'video.kicker', 'video.open',
  'gift.kicker', 'gift.fallbackNote',
  'rsvp.kicker', 'rsvp.title', 'rsvp.thanks', 'rsvp.confirmed', 'rsvp.declined', 'rsvp.prayer',
  'rsvp.yes', 'rsvp.yesHint', 'rsvp.no', 'rsvp.noHint', 'rsvp.seats', 'rsvp.message', 'rsvp.submit',
  'wishes.kicker', 'wishes.title', 'wishes.add', 'wishes.submit',
] as const
export type CopyKey = (typeof copyKeys)[number]

/** Batas panjang per jenis kunci: label dan tombol 40, judul 80, kalimat 240. */
export function copyLimit(key: CopyKey): number {
  if (/\.(kicker|open|map|calendar|yes|no|seats|submit|add|confirmed|declined)$/.test(key)) return 40
  if (/\.title$/.test(key)) return 80
  return 240
}

export const copySchema = z.object(
  Object.fromEntries(copyKeys.map(key => [key, z.string().max(copyLimit(key))])) as Record<CopyKey, z.ZodString>,
).partial().strict()
export type InvitationCopy = z.infer<typeof copySchema>

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/)
export const invitationDocumentSchema = z.object({
  /** 1 = struktur lama (cover/events/rsvp…), 2 = struktur Elegance (fase 72). Lihat `sections.ts`. */
  schemaVersion: z.union([z.literal(1), z.literal(2)]), templateId: z.enum(templateIds), templateVersion: z.literal(1),
  /*
   * Ketiga key baru fase 59 **opsional dengan sengaja**, dan itu menyelesaikan tiga hal sekaligus.
   *
   * Dokumen yang ditulis sebelum fase ini tetap lolos tanpa migrasi. Preset tema tidak perlu
   * mengisinya, jadi `tests/contracts.test.ts` yang menuntut `document.tokens` identik dengan
   * `template.tokens` tetap hijau. Dan "kosong" tetap berarti "ikut tema" — yang membuat sebuah
   * tema bisa mengubah huruf atau latarnya kelak tanpa memaksa dokumen lama ikut berubah.
   *
   * Letaknya di `tokens`, bukan di `section.data`, karena `designFingerprint()` di API
   * menggerbangi `tokens` — jadi ketiganya otomatis ikut entitlement `design` bersama warna dan
   * huruf judul, tanpa satu cabang baru pun di sisi server.
   */
  tokens: z.object({
    background: color, foreground: color, primary: color,
    font: z.enum(fontChoices),
    bodyFont: z.enum(fontChoices).optional(),
    backdrop: z.enum(backdropChoices).optional(),
    backdropWeight: z.enum(backdropWeights).optional(),
    /** Fase 69. Di `tokens` supaya otomatis ikut gerbang `design`, seperti tiga key di atasnya. */
    motion: motionSchema.optional(),
    /** Fase 72: fokus tata letak di layar lebar — `kartu` 480px di tengah atau `penuh`. Absen = ikut tema. */
    layout: z.enum(layoutFocuses).optional(),
  }).strict(),
  sections: z.array(z.object({
    id: z.string().min(1).max(80), type: z.enum(sectionTypes), enabled: z.boolean(), data: z.record(z.unknown()),
  }).strict()).min(1).max(30),
  /** Opsional, seperti key `tokens` fase 59: absen berarti ikut kata-kata tema. Lihat `copyKeys`. */
  copy: copySchema.optional(),
  /** Fase 72: musik undangan (dulu section `music`). */
  settings: invitationSettingsSchema.optional(),
  /** Fase 72.7: gaya kartu bagikan (og:image / WhatsApp). */
  shareCard: shareCardSchema.optional(),
}).strict().superRefine((document, ctx) => {
  if (document.schemaVersion === 2) {
    document.sections.forEach((section, index) => {
      if (!isV2SectionType(section.type)) { ctx.addIssue({ code: 'custom', path: ['sections', index, 'type'], message: `Tipe bagian ${section.type} tidak dikenal pada dokumen v2.` }); return }
      const hasil = sectionDataSchema(section.type).safeParse(section.data)
      if (!hasil.success) for (const issue of hasil.error.issues) ctx.addIssue({ ...issue, path: ['sections', index, 'data', ...issue.path] })
    })
  }
  if (new Set(document.sections.map(s => s.id)).size !== document.sections.length) ctx.addIssue({ code: 'custom', path: ['sections'], message: 'ID section harus unik.' })
  if (JSON.stringify(document).length > 200_000) ctx.addIssue({ code: 'custom', message: 'Konten terlalu besar.' })
})
export type InvitationDocument = z.infer<typeof invitationDocumentSchema>
export type InvitationSection = InvitationDocument['sections'][number]

/**
 * Dokumen baru = struktur Elegance (fase 72). Template `templateId` hanya menentukan palet,
 * ornamen, dan partitur gerak; struktur bagian dan kata-katanya sama untuk semua tema.
 */
export function createDefaultDocument(partner1 = 'Aruna', partner2 = 'Dewa', templateId: TemplateId = 'aruna-bloom', input: Partial<DefaultDocumentInput> = {}): InvitationDocument {
  const template = templateById(templateId) ?? templates[0]!
  return {
    schemaVersion: 2, templateId: template.id, templateVersion: 1,
    tokens: { ...template.tokens },
    sections: createEleganceSections({ partner1, partner2, ...input }),
  }
}

/** Dokumen v1 — hanya untuk fixture tes dan migrasi. Undangan baru memakai `createDefaultDocument()`. */
export function createLegacyDocument(partner1 = 'Aruna', partner2 = 'Dewa', templateId: TemplateId = 'aruna-bloom'): InvitationDocument {
  // Id pensiun ditulis ke dokumen baru sebagai penggantinya, bukan apa adanya: dokumen yang
  // baru lahir tidak punya alasan membawa id yang sudah tidak punya wajah.
  const template = templateById(templateId) ?? templates[0]!
  return {
    schemaVersion: 1, templateId: template.id, templateVersion: 1,
    tokens: { ...template.tokens },
    // Bagiannya hidup di `structures.ts` sebagai `warisan.build` sejak fase 74.8 — satu sumber,
    // supaya struktur v1 punya pembangun seperti struktur lain dan tidak bisa berselisih.
    sections: createLegacySections({ partner1, partner2 }),
  }
}

/* ── Media: foto dan musik ─────────────────────────────────────────────────── */

/**
 * Satu-satunya tempat jenis dan ukuran media ditulis.
 *
 * Sebelumnya daftar MIME hidup di `media.service.ts`, batas ukuran hidup dua kali (service dan
 * multer), dan editor menulis `accept="image/*"` — yang meloloskan GIF, AVIF, dan SVG sampai
 * server menolaknya. Pasangan baru tahu berkasnya salah setelah 12 MB selesai naik lewat data
 * seluler. Aturannya di kontrak supaya kedua sisi menolak hal yang sama, pada saat yang sama.
 *
 * Ekstensi ikut dicantumkan karena MIME saja tidak cukup di klien: sebagian ponsel melaporkan
 * `.webp` sebagai `application/octet-stream`, dan `accept` yang hanya berisi MIME membuat
 * berkasnya tidak bisa dipilih sama sekali di pemilih berkas.
 */
export const mediaRules = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxBytes: 10 * 1024 * 1024,
    label: 'JPG, JPEG, PNG, atau WebP',
  },
  audio: {
    mimeTypes: ['audio/mpeg'],
    extensions: ['.mp3'],
    maxBytes: 10 * 1024 * 1024,
    label: 'MP3',
  },
  /**
   * Ornamen unggahan (fase 69): raster transparan saja. SVG **sengaja belum** — pemilik menunda
   * jalur sanitasinya ke fase lain. Batasnya kecil karena tiap keping dipasang berulang di
   * banyak section dan dikirim ke setiap tamu; foto galeri boleh 10 MB karena ia satu kali.
   */
  ornament: {
    mimeTypes: ['image/png', 'image/webp'],
    extensions: ['.png', '.webp'],
    maxBytes: 300 * 1024,
    label: 'PNG atau WebP transparan',
  },
} as const

export type MediaKind = keyof typeof mediaRules
export const mediaKinds = Object.keys(mediaRules) as MediaKind[]

/** Ornamen unggahan per undangan. Pagar, bukan fitur — sama seperti `audioAssetLimit`. */
export const ornamentAssetLimit = 12

/** Batas foto galeri. Paket menjanjikan 15/30/60, tapi `Invitation` belum menyimpan paketnya — sampai itu ada, satu angka untuk semua, ditulis sekali. */
export const galleryPhotoLimit = 15

/** Aset audio per undangan. Bukan fitur, cuma pagar: tanpa ini unggah ulang lagu menumpuk tanpa batas. */
export const audioAssetLimit = 5

/** `accept` untuk `<input type="file">` — MIME dan ekstensi sekaligus. */
export function mediaAccept(kind: MediaKind): string {
  return [...mediaRules[kind].mimeTypes, ...mediaRules[kind].extensions].join(',')
}

export function isAllowedMediaType(kind: MediaKind, mimeType: string): boolean {
  return (mediaRules[kind].mimeTypes as readonly string[]).includes(mimeType)
}

/** Semua jenis yang boleh masuk, apa pun jenisnya — dipakai penjaga unggah di server. */
export const allowedMediaTypes: readonly string[] = [...mediaRules.image.mimeTypes, ...mediaRules.audio.mimeTypes]

export function mediaKindOf(mimeType: string): MediaKind | null {
  if (isAllowedMediaType('image', mimeType)) return 'image'
  if (isAllowedMediaType('audio', mimeType)) return 'audio'
  return null
}

/** Batas terbesar di antara semua jenis — hanya untuk menyetel penjaga multer, bukan untuk validasi. */
export const maxMediaBytes = Math.max(mediaRules.image.maxBytes, mediaRules.audio.maxBytes)

/** "14,2 MB" — koma desimal, karena pesannya dibaca orang Indonesia. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0).replace('.', ',')} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/* ── Hadiah: rekening pasangan ─────────────────────────────────────────────── */

/**
 * Daftar bank tertutup. Ada di kontrak, bukan di lapisan web, karena validasi publish
 * di API harus bisa menolak bank yang tidak dikenal tanpa mengimpor `apps/web`.
 * Presentasinya (nama tampil, warna merek, path logo) hidup di `apps/web/utils/banks.ts`.
 */
export const bankIds = ['bca', 'mandiri', 'bri', 'bsi', 'jago', 'jenius', 'seabank', 'other'] as const
export type BankId = (typeof bankIds)[number]

/** Satu rekening tujuan. `owner` menandai mempelai pria/wanita; boleh kosong. */
export interface GiftAccount {
  id: string
  bankId: BankId
  /** Nama bank apa adanya. Dipakai saat `bankId` jatuh ke `other`, dan sebagai fallback teks. */
  bankLabel: string
  number: string
  holder: string
  owner: 'cpp' | 'cpw' | ''
}

/**
 * Delapan sejak 2026-09-12. Dua hanya cukup untuk mempelai pria dan wanita; pada
 * praktiknya pasangan juga mencantumkan rekening orang tua, e-wallet, dan satu rekening
 * khusus untuk keluarga di luar negeri. Batasnya tetap ada supaya section hadiah tidak
 * berubah jadi daftar bank.
 */
export const giftAccountLimit = 8

const bankAliases: [BankId, string[]][] = [
  ['bca', ['bca', 'central asia']],
  ['mandiri', ['mandiri']],
  ['bsi', ['bsi', 'syariah indonesia']],
  ['bri', ['bri', 'rakyat indonesia']],
  ['jago', ['jago']],
  ['jenius', ['jenius', 'smbc', 'btpn']],
  ['seabank', ['seabank', 'sea bank']],
]

/** Menebak `bankId` dari nama bank yang diketik bebas pada dokumen lama. */
export function matchBankAlias(label: string): BankId {
  const needle = label.toLowerCase()
  for (const [id, aliases] of bankAliases) {
    if (aliases.some(alias => needle.includes(alias))) return id
  }
  return 'other'
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export interface NormalizedGift {
  title: string
  note: string
  address: string
  accounts: GiftAccount[]
}

/**
 * Satu-satunya pembaca data section `gift`, dipakai renderer, editor, dan validasi publish.
 *
 * Dokumen lama menyimpan satu rekening datar (`{ bank, account, holder }`). Bentuk itu
 * diterjemahkan di sini supaya undangan yang sudah terbit tetap tampil benar tanpa migrasi
 * basis data; bentuk barunya baru ditulis saat pasangan menyentuh section ini di editor.
 */
export function normalizeGift(data: Record<string, unknown> | null | undefined): NormalizedGift {
  const source = data ?? {}
  const base = {
    title: asString(source.title) || 'Hadiah untuk kami',
    note: asString(source.note),
    address: asString(source.address),
  }

  if (Array.isArray(source.accounts)) {
    const accounts: GiftAccount[] = []
    for (const raw of source.accounts) {
      if (!raw || typeof raw !== 'object') continue
      const entry = raw as Record<string, unknown>
      const number = asString(entry.number).trim()
      if (!number) continue
      const bankLabel = asString(entry.bankLabel)
      const declared = asString(entry.bankId) as BankId
      const bankId = (bankIds as readonly string[]).includes(declared) ? declared : matchBankAlias(bankLabel)
      const owner = asString(entry.owner)
      accounts.push({
        id: asString(entry.id) || `rek-${accounts.length + 1}`,
        bankId,
        bankLabel,
        number,
        holder: asString(entry.holder),
        owner: owner === 'cpp' || owner === 'cpw' ? owner : '',
      })
      if (accounts.length === giftAccountLimit) break
    }
    return { ...base, accounts }
  }

  const legacyNumber = asString(source.account).trim()
  if (!legacyNumber) return { ...base, accounts: [] }
  const legacyBank = asString(source.bank)
  return {
    ...base,
    accounts: [{
      id: 'rek-1',
      bankId: matchBankAlias(legacyBank),
      bankLabel: legacyBank,
      number: legacyNumber,
      holder: asString(source.holder),
      owner: '',
    }],
  }
}

const baseFeatures = ['cover', 'couple', 'events', 'countdown', 'gallery', 'guests', 'imports', 'rsvp', 'wishes', 'closing', 'music']
export const premiumFeatures = ['story', 'gift', 'rundown', 'dresscode', 'video', 'design']
/** Yang dibuka paket tengah. Sisanya (`video`, `design`) hanya di paket teratas atau sebagai add-on. */
const growthFeatures = ['story', 'gift', 'rundown', 'dresscode']
export const catalog = {
  sandbox: true,
  packages: [
    { id: 'mula', name: 'Mula', price: 279000, features: [...baseFeatures], durationMonths: 12, photoLimit: 15 },
    { id: 'mekar', name: 'Mekar', price: 449000, features: [...baseFeatures, ...growthFeatures], durationMonths: 12, photoLimit: 30 },
    { id: 'purnama', name: 'Purnama', price: 699000, features: [...baseFeatures, ...premiumFeatures], durationMonths: 12, photoLimit: 60 },
  ],
  addons: premiumFeatures.map(id => ({ id, name: ({ story: 'Cerita cinta', gift: 'Hadiah', rundown: 'Rundown', dresscode: 'Dresscode', video: 'Video & live stream', design: 'Warna, font & urutan' } as Record<string, string>)[id]!, price: 25000 })),
  templates: templates.map(({ id, name, version, tagline, accent, tokens }) => ({ id, name, version, tagline, accent, tokens })),
}

export function priceOrder(packageId: string, addonIds: string[]) {
  const pack = catalog.packages.find(p => p.id === packageId)
  if (!pack || new Set(addonIds).size !== addonIds.length) throw new Error('Paket atau add-on tidak valid.')
  const addons = addonIds.map(id => {
    const addon = catalog.addons.find(a => a.id === id)
    if (!addon || pack.features.includes(id)) throw new Error('Add-on tidak tersedia atau sudah termasuk paket.')
    return addon
  })
  return { total: pack.price + addons.reduce((sum, a) => sum + a.price, 0), features: [...pack.features, ...addonIds], packageId, addonIds }
}

export type ImportRow = { row: number; displayName: string; phone?: string; group?: string; quota?: number; errors: string[]; warnings: string[] }
export function parseGuestText(text: string, format: 'csv' | 'tsv'): ImportRow[] {
  if (text.length > 10_000_000) throw new Error('Batas impor 10 MB.')
  const delimiter = format === 'csv' ? ',' : '\t'
  const records: string[][] = []; let record: string[] = []; let field = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++ }
      else if (quoted || field.length === 0) quoted = !quoted
      else field += c
    } else if (!quoted && c === delimiter) { record.push(field); field = '' }
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++
      record.push(field); if (record.some(v => v !== '')) records.push(record); record = []; field = ''
    } else field += c
  }
  if (quoted) throw new Error('Tanda kutip CSV tidak ditutup.')
  record.push(field); if (record.some(v => v !== '')) records.push(record)
  const first = records[0]?.map(v => v.replace(/^\uFEFF/, '').trim().toLowerCase()) ?? []
  const nameKeys = ['nama', 'nama undangan', 'name', 'displayname', 'nama lengkap']
  const hasHeader = first.some(v => nameKeys.includes(v))
  const nameIndex = hasHeader ? first.findIndex(v => nameKeys.includes(v)) : 0
  const phoneIndex = hasHeader ? first.findIndex(v => ['telepon', 'phone', 'no hp', 'whatsapp', 'kontak'].includes(v)) : 1
  const groupIndex = hasHeader ? first.findIndex(v => ['grup', 'group', 'kategori'].includes(v)) : 2
  const quotaIndex = hasHeader ? first.findIndex(v => ['kuota', 'quota'].includes(v)) : 3
  const rows = hasHeader ? records.slice(1) : records
  if (rows.length > 5000) throw new Error('Maksimum 5.000 baris per impor.')
  const seen = new Set<string>()
  return rows.map((columns, i) => {
    const errors: string[] = [], warnings: string[] = []; let displayName = columns[nameIndex] ?? ''
    try { displayName = normalizeDisplayName(displayName) } catch (error) { errors.push((error as Error).message) }
    if (seen.has(displayName)) warnings.push('Nama sama ditemukan; tetap dibuat sebagai tamu terpisah.')
    seen.add(displayName)
    const rawQuota = columns[quotaIndex]?.trim(); const quota = rawQuota ? Number(rawQuota) : 1
    if (!Number.isInteger(quota) || quota < 1 || quota > 20) errors.push('Kuota harus 1–20 orang.')
    return { row: i + (hasHeader ? 2 : 1), displayName, phone: columns[phoneIndex]?.trim(), group: columns[groupIndex]?.trim(), quota, errors, warnings }
  })
}

export function safeSpreadsheetCell(value: string): string {
  return /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

/**
 * Fitur yang membuka kontrol warna, font, dan urutan section.
 *
 * Aturannya hidup di sini, bukan dua kali, karena editor harus mematikan kontrolnya
 * sebelum pasangan menyentuhnya sementara API menolak simpanannya sesudahnya. Dua salinan
 * yang menyimpang berarti kontrol terlihat hidup lalu autosave gagal tanpa sebab yang jelas.
 */
export const designFeatureId = 'design'

export function canEditDesign(input: { isOperator?: boolean; features: readonly string[] }): boolean {
  return Boolean(input.isOperator) || input.features.includes(designFeatureId)
}
