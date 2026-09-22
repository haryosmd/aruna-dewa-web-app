/**
 * Bentuk body tiap endpoint, sekali tulis untuk dua sisi.
 *
 * Sebelum berkas ini, 18 endpoint menerima body bertipe inline — anotasi TypeScript yang
 * terhapus saat compile dan tidak memeriksa apa pun saat berjalan. Akibatnya bukan sekadar
 * teoretis: `PUT /draft` tanpa kunci `revision` membuat Prisma membuang filter revisinya
 * (`where: { draftRevision: undefined }` bukan "cocokkan null", melainkan "jangan saring"),
 * jadi dua editor saling menimpa tanpa pernah bertemu cabang konflik.
 *
 * Skema ditaruh di `@aruna/contracts`, bukan di `apps/api`, supaya web memakai definisi yang
 * sama persis alih-alih tipe ad-hoc per halaman yang boleh menyimpang diam-diam.
 */

import type { MediaKind } from './index'
import { z } from 'zod'
import { guestChildMax, guestFieldMaxLength, guestNotesMaxLength, invitationDocumentSchema, structureIds, templateIds, type ImportRow, type InvitationDocument } from './index.js'

/** Angka revisi optimistik. Harus ada — ketiadaannya persis yang dulu menghilangkan data. */
const revision = z.number().int().nonnegative()

const email = z.string().trim().toLowerCase().min(3).max(320)
/** Password tidak pernah di-trim: spasi di ujung adalah bagian sah dari rahasia. */
const password = z.string().min(10).max(1024)
/** Token sekali pakai (verifikasi email, reset password) dan token tamu. */
const opaqueToken = z.string().min(1).max(500)

const slug = z.string().trim().toLowerCase().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Huruf kecil dan tanda hubung saja, tanpa spasi.')

/** Tanggal yang akhirnya masuk `new Date()`; `Invalid Date` di Prisma berujung 500. */
const optionalDateString = z.string().trim().max(40).refine(value => value === '' || !Number.isNaN(Date.parse(value)), 'Tanggal tidak valid.').optional()

// — Identitas ————————————————————————————————————————————————————————————————

export const registerBodySchema = z.object({
  email: email.regex(/^\S+@\S+\.\S+$/u, 'Email tidak valid.'),
  password,
  name: z.string().trim().min(1).max(120),
})
export type RegisterBody = z.infer<typeof registerBodySchema>

/**
 * Sengaja lebih longgar daripada pendaftaran: akun yang lahir sebelum aturan mana pun tetap
 * harus bisa masuk. Yang dijamin di sini cuma "dua string", yang sebelumnya tidak dijamin —
 * body `{}` berujung `TypeError` pada `emailInput.trim()`, yaitu 500 dari endpoint publik.
 */
export const loginBodySchema = z.object({
  email: z.string().max(320),
  password: z.string().max(1024),
})
export type LoginBody = z.infer<typeof loginBodySchema>

export const verifyEmailBodySchema = z.object({ token: opaqueToken })
export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>

export const forgotPasswordBodySchema = z.object({ email })
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>

export const resetPasswordBodySchema = z.object({ token: opaqueToken, password })
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>

export const updateProfileBodySchema = z.object({ name: z.string().trim().min(1).max(120) })
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>

/**
 * Kata sandi lama sengaja dipakaikan aturan `loginBodySchema`, bukan aturan `register`: yang
 * diminta di sini adalah rahasia yang **sudah** dimiliki orangnya, dan akun yang lahir sebelum
 * aturan panjang mana pun tetap harus bisa membuktikan dirinya. Yang baru tetap ketat.
 */
export const changePasswordBodySchema = z.object({
  currentPassword: z.string().max(1024),
  newPassword: password,
})
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>

// — Undangan ————————————————————————————————————————————————————————————————

export const createInvitationBodySchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug,
  partner1: z.string().trim().min(1).max(80),
  partner2: z.string().trim().min(1).max(80),
  date: optionalDateString,
  venue: z.string().trim().max(200).optional(),
  address: z.string().trim().max(300).optional(),
  // String kosong berarti "pakai bawaan"; itu yang dikirim wizard `/order` saat tema belum dipilih.
  templateId: z.union([z.literal(''), z.enum(templateIds)]).optional(),
  /*
   * Struktur undangan (fase 74.9). Bentuknya sengaja meniru `templateId` di atas — termasuk
   * string kosongnya — supaya wizard bisa mengirim keduanya dengan cara yang sama. Hari ini
   * hanya `elegance` yang hidup, jadi pemilihnya belum tampil; plumbingnya lebih dulu.
   */
  structureId: z.union([z.literal(''), z.enum(structureIds)]).optional(),
})
export type CreateInvitationBody = z.infer<typeof createInvitationBodySchema>

export const saveDraftBodySchema = z.object({ document: invitationDocumentSchema, revision })
export type SaveDraftBody = z.infer<typeof saveDraftBodySchema>

// — Tamu & impor ————————————————————————————————————————————————————————————

const guestFields = {
  // `normalizeDisplayName` menolak hal yang sama dengan `Error` mentah — yaitu 500. Aturannya
  // ditegakkan di sini supaya penolakannya sampai ke form sebagai 400 dengan `fieldErrors`.
  displayName: z.string().trim().min(1).max(200).refine(value => !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(value), 'Nama harus satu baris, tanpa karakter kontrol.'),
  phone: z.string().trim().max(40).optional(),
  group: z.string().trim().max(80).optional(),
  /** Fase 72.6: kategori tamu di halaman Generator ("Keluarga", "Teman CPP"). Sinonim `group` — API menyimpan keduanya ke satu kolom, `category` menang bila keduanya dikirim. */
  category: z.string().trim().max(80).optional(),
  quota: z.number().int().min(1).max(20).optional(),
  /**
   * Empat kolom lembar tamu (fase 75). Semuanya opsional, dan `childCount` sengaja **tanpa
   * minimum selain 1**: kolom anak murni pendataan, kosong sama sahnya dengan terisi, dan tidak
   * boleh pernah memblokir satu baris pun. Impor menormalkan nilainya lebih dulu, jadi yang
   * sampai ke sini sudah berbentuk; skema ini menjaga jalur form yang mengetik langsung.
   */
  guestFrom: z.string().trim().max(guestFieldMaxLength).optional(),
  childCount: z.number().int().min(1).max(guestChildMax).nullish(),
  invitationKind: z.string().trim().max(guestFieldMaxLength).optional(),
  notes: z.string().trim().max(guestNotesMaxLength).optional(),
}

export const createGuestBodySchema = z.object(guestFields)
export type CreateGuestBody = z.infer<typeof createGuestBodySchema>

export const updateGuestBodySchema = z.object({ ...guestFields, revision })
export type UpdateGuestBody = z.infer<typeof updateGuestBodySchema>

/** Filter daftar tamu di halaman Generator: status kirim WhatsApp dan kategori. */
export const guestListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['semua', 'belum', 'terkirim']).optional(),
  category: z.string().trim().max(80).optional(),
})
export type GuestListQuery = z.infer<typeof guestListQuerySchema>

// — Berbagi (fase 72.6) ——————————————————————————————————————————————————————

/** Lima gaya bahasa template WhatsApp di halaman Generator, urut seperti kartunya. */
export const sharePresets = ['formal', 'islami', 'nonmuslim', 'santai', 'bilingual'] as const
export type SharePreset = (typeof sharePresets)[number]

/**
 * `templates` hanya menyimpan gaya yang **pernah disunting**; gaya yang absen dirakit ulang dari
 * dokumen oleh web setiap kali dibuka, jadi perubahan tanggal acara otomatis ikut ke pesan yang
 * belum pernah disentuh pasangan.
 */
export const shareSettingsSchema = z.object({
  preset: z.enum(sharePresets),
  templates: z.object(Object.fromEntries(sharePresets.map(preset => [preset, z.string().max(4000).optional()])) as Record<SharePreset, z.ZodOptional<z.ZodString>>).strict(),
}).strict()
export type ShareSettings = z.infer<typeof shareSettingsSchema>
export const updateShareSettingsBodySchema = shareSettingsSchema
export type UpdateShareSettingsBody = ShareSettings

/** Sepadan dengan batas 10 MB pada unggahan berkas; teks tempel tidak boleh jadi jalan pintas. */
export const MAX_IMPORT_TEXT_LENGTH = 10 * 1024 * 1024

export const importPreviewBodySchema = z.object({
  text: z.string().max(MAX_IMPORT_TEXT_LENGTH),
  format: z.enum(['csv', 'tsv']),
})
export type ImportPreviewBody = z.infer<typeof importPreviewBodySchema>

export const importCommitBodySchema = z.object({ idempotencyKey: z.string().min(1).max(200) })
export type ImportCommitBody = z.infer<typeof importCommitBodySchema>

export const googleSheetsPreviewBodySchema = z.object({
  spreadsheetId: z.string().trim().min(1).max(200),
  range: z.string().trim().min(1).max(200),
  accessToken: z.string().min(1).max(4096),
})
export type GoogleSheetsPreviewBody = z.infer<typeof googleSheetsPreviewBodySchema>

// — Pesanan & pembayaran ————————————————————————————————————————————————————

export const createOrderBodySchema = z.object({
  packageId: z.string().trim().min(1).max(100),
  // Pesanan tanpa add-on adalah permintaan yang sah dan umum; kunci yang hilang berarti
  // daftar kosong, bukan 400. Sebelumnya berarti 500 pada `new Set(undefined)`.
  addonIds: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
})
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>

/**
 * `passthrough`, bukan strip: seluruh notifikasi disimpan apa adanya di `PaymentEvent.payload`
 * untuk forensik, jadi membuang field yang belum kita kenal berarti membuang bukti. Yang
 * dijamin hanya field yang benar-benar dibaca — dan semuanya string, karena `createHash()`
 * melempar `TypeError` pada apa pun yang bukan string, dari endpoint tanpa autentikasi.
 */
export const midtransWebhookBodySchema = z.object({
  order_id: z.string().max(200),
  status_code: z.string().max(20),
  gross_amount: z.string().max(40),
  signature_key: z.string().max(200),
  transaction_status: z.string().max(40),
  transaction_id: z.string().max(200).optional(),
  fraud_status: z.string().max(40).optional(),
}).passthrough()
export type MidtransWebhookBody = z.infer<typeof midtransWebhookBodySchema>

// — RSVP, ucapan, jalur publik ——————————————————————————————————————————————

export const moderateWishBodySchema = z.object({ approved: z.boolean() })
export type ModerateWishBody = z.infer<typeof moderateWishBodySchema>

export const markOpenedBodySchema = z.object({ token: opaqueToken })
export type MarkOpenedBody = z.infer<typeof markOpenedBodySchema>

export const publicRsvpBodySchema = z.object({
  token: opaqueToken,
  attendance: z.enum(['yes', 'no']),
  count: z.number().int().min(0).max(20).optional(),
  message: z.string().max(1000).optional(),
  eventId: z.string().min(1).max(100).optional(),
})
export type PublicRsvpBody = z.infer<typeof publicRsvpBodySchema>

/**
 * Pilihan kehadiran di form ucapan v2 (fase 72). Ejaannya milik undangan — `hadir`, bukan `yes` —
 * karena inilah yang ditulis pasangan di label formnya; API yang menerjemahkannya ke enum RSVP.
 */
export const wishAttendances = ['hadir', 'belum-pasti', 'berhalangan'] as const
export type WishAttendance = (typeof wishAttendances)[number]

/**
 * Label satu pilihan kehadiran, untuk dasbor. `null` berarti **jangan tampilkan lencana**.
 *
 * Dulu pemetaan ini hidup dua kali di `apps/web` dan keduanya menangani ejaan `yes`/`no`/`maybe`
 * di samping ejaan v2. Ejaan itu tidak pernah bisa lahir: kolom `Wish.attendance` dibuat
 * 2026-09-20 tanpa backfill, penulisnya cuma `public.service.ts`, dan yang ditulisnya sudah lolos
 * `z.enum(wishAttendances)` di atas. Cabang lamanya ditulis berjaga-jaga, bukan menanggapi baris
 * yang pernah ada (fase 75).
 *
 * Yang justru berbahaya bukan cabang mati itu melainkan penampung di ujungnya: keduanya
 * mengembalikan "Belum pasti" untuk nilai APA PUN yang tidak dikenal, jadi satu ejaan asing
 * tampil sebagai jawaban yang tamunya tidak pernah pilih. Peta eksplisit di bawah lebih memilih
 * diam — tidak ada lencana lebih jujur daripada lencana yang salah.
 *
 * `yes`/`no`/`maybe` **tetap** ejaan `RSVPAttendance`, dan itu tabel yang berbeda
 * (`apps/api/src/rsvp/attendance.ts`). Fungsi ini bukan untuk ia.
 */
export function wishAttendanceLabel(value: string | null | undefined): { label: string; tone: 'sage' | 'gold' | 'neutral' } | null {
  if (value === 'hadir') return { label: 'Hadir', tone: 'sage' }
  if (value === 'belum-pasti') return { label: 'Belum pasti', tone: 'gold' }
  if (value === 'berhalangan') return { label: 'Berhalangan', tone: 'neutral' }
  return null
}

/**
 * Ucapan v2 menggabungkan buku tamu dan kehadiran, dan formnya terbuka untuk tamu tanpa
 * tautan personal (seperti referensi): `token` opsional, dan tanpa token `name` wajib —
 * dijaga di service, bukan di skema, supaya pesannya menyebut kolomnya. Tamu bertoken tetap
 * tercatat lewat `guestId` seperti sebelumnya.
 */
export const publicWishBodySchema = z.object({
  token: opaqueToken.optional(),
  name: z.string().trim().max(80).optional(),
  attendance: z.enum(wishAttendances).optional(),
  message: z.string().trim().min(1).max(1000),
})
export type PublicWishBody = z.infer<typeof publicWishBodySchema>

// — Bentuk jawaban ——————————————————————————————————————————————————————————
//
// Body divalidasi skema di atas; jawaban tidak — memvalidasi ulang milik sendiri hanya
// menambah tempat untuk melenceng. Yang dibutuhkan web adalah **satu** definisi bentuknya.
// Sebelum bagian ini, 14 dari 41 pemanggilan HTTP di web tanpa tipe sama sekali dan 13
// memakai tipe ad-hoc lokal-halaman: `Wish` punya tiga definisi yang saling berbeda, dan
// dua di antaranya menyebut kolom yang tidak pernah dikirim API — jadi nama penulis ucapan
// dan nama tamu di daftar RSVP selalu jatuh ke teks cadangan "Tamu undangan".

export interface InvitationSummary {
  id: string
  slug: string
  title: string
  status: string
}

export interface InvitationDetail extends InvitationSummary {
  document: InvitationDocument
  revision: number
  features: string[]
  activeUntil?: string | null
  publishedAt?: string | null
  /** Fase 72.6: template WhatsApp; null sampai pasangan menyunting satu gaya. */
  shareSettings?: ShareSettings | null
  /**
   * Kuota foto galeri paket ini (fase 75). Dikirim server, bukan dihitung ulang editor: angka
   * yang dilihat pasangan dan angka yang ditolak API harus berasal dari satu jawaban yang sama.
   * `packageId` sendiri sengaja tidak ikut — editor tidak punya urusan dengan nama paketnya.
   */
  photoLimit: number
}

/**
 * Satu baris riwayat terbit (fase 75). **Tanpa `document`** — daftar 50 revisi berisi dokumen
 * penuh adalah muatan yang tidak punya pembaca; isinya baru diambil saat satu revisi dipulihkan.
 */
export interface RevisionSummary {
  revision: number
  /** ISO; waktu snapshot dibuat, yaitu waktu terbitnya. */
  publishedAt: string
  /** Revisi yang sedang dilihat tamu. */
  isActive: boolean
}

/**
 * `draftRevision` ikut supaya pemulihan tunduk pada penjaga konflik yang sama dengan
 * `PUT /draft`: memulihkan versi lama tidak boleh menimpa draft yang baru disunting di tab lain.
 */
export const restoreRevisionBodySchema = z.object({
  revision: z.number().int().min(1),
  draftRevision: z.number().int().min(0),
})
export type RestoreRevisionBody = z.infer<typeof restoreRevisionBodySchema>

export interface SavedDraft {
  document: InvitationDocument
  revision: number
}

export interface PublishedInvitation {
  slug: string
  publishedAt?: string | null
}

/** Ejaan yang dikirim API sejak jalur kehadiran disatukan; Prisma menyimpannya huruf besar. */
export type Attendance = 'yes' | 'no' | 'maybe'

export interface GuestRsvp {
  attendance: Attendance
  count?: number
  message?: string | null
}

export interface Guest {
  id: string
  displayName: string
  /** Hanya dikirim ke anggota yang boleh melihat tautan personal; VIEWER tidak menerimanya. */
  token?: string
  /**
   * Ada hanya kalau tokennya tersimpan tapi tidak bisa dibuka lagi — bukan sekadar tidak dikirim.
   *
   * Dipisah dari `token` yang absen karena keduanya berbeda arti: VIEWER memang tidak pernah
   * menerima token dan itu sehat, sedangkan baris ini kehilangan tautan personalnya untuk
   * selamanya. Tanpa pembedaan itu, UI tidak punya cara tahu kapan harus mematikan tombol salin.
   */
  tokenUnavailable?: true
  revision: number
  phone?: string
  group?: string
  /** Sama dengan `group`; ejaan halaman Generator. */
  category?: string
  quota: number
  rsvp?: GuestRsvp | null
  /** ISO; ada setelah "Kirim WA" ditekan untuk tamu ini. */
  sentAt?: string | null
  /**
   * Empat kolom lembar tamu (fase 75). Absen berarti tidak diisi, dan itu keadaan yang sah.
   * `Status` tidak ada di sini dengan sengaja: ia diturunkan dari `sentAt` dan `rsvp`.
   */
  guestFrom?: string
  childCount?: number
  invitationKind?: string
  notes?: string
}

export interface GuestPage {
  items: Guest[]
  total: number
  page: number
  pageSize: number
  /** Jumlah tamu yang sudah dikirimi WhatsApp, dihitung di seluruh undangan (bukan halaman ini saja). */
  sent: number
  /** Kategori yang dipakai tamu undangan ini, untuk dropdown filter. */
  categories: string[]
}

export interface ImportPreviewResult {
  id: string
  source?: 'csv' | 'tsv' | 'xlsx' | 'google-sheets'
  rows: ImportRow[]
  validCount: number
}

export interface ImportCommitResult {
  imported: number
}

export interface CatalogPackage {
  id: string
  name: string
  price: number
  features: string[]
}

export interface CatalogAddon {
  id: string
  name: string
  price: number
}

export interface CatalogTemplate {
  id: string
  name: string
  version: number
  tagline?: string
  accent?: string
}

export interface CatalogResponse {
  packages: CatalogPackage[]
  addons: CatalogAddon[]
  templates: CatalogTemplate[]
  sandbox: boolean
}

export interface Order {
  id: string
  total: number
  status: string
  /** Diambil dari snapshot harga pesanan, jadi ia tetap benar meski katalognya berubah. */
  packageName?: string
  snapUrl?: string | null
  createdAt?: string
  activatedAt?: string | null
}

/** Operator melunasi tanpa Midtrans, jadi jawabannya bisa `snapUrl` atau `paid`. */
export interface CheckoutResult {
  snapUrl?: string
  paid?: boolean
  alreadyActive?: boolean
}

export interface RsvpEntry {
  id: string
  attendance: Attendance
  count?: number
  message?: string | null
  createdAt?: string
  updatedAt?: string
  /** API mengirim relasinya, bukan `guestName` — yang disangka dua halaman selama ini. */
  guest?: { id: string; displayName: string; quota: number } | null
  event?: { id: string; name: string } | null
}

/**
 * Satu definisi, menggantikan tiga yang saling berbeda. Nama kolomnya `authorName` —
 * milik Prisma — dan bukan `name`, yang dipakai halaman moderasi dan karena itu tidak
 * pernah menampilkan nama siapa pun.
 */
export interface Wish {
  id: string
  authorName?: string | null
  message: string
  createdAt?: string
  /** Baris optimistik milik penulisnya sendiri; belum terlihat tamu lain. */
  approved?: boolean
  /** Kehadiran yang dipilih di form ucapan v2 (fase 72); ucapan lama tidak punya. */
  attendance?: WishAttendance | string | null
}

export interface PublicInvitation {
  document: InvitationDocument
  title: string
  slug: string
  publishedAt?: string | null
}

/** Tamu yang tautannya sah. Semua field di sini pasti ada — itulah gunanya menyempitkan dulu. */
export interface GuestProfile {
  displayName: string
  quota: number
  rsvp?: { attendance: 'yes' | 'no'; count?: number; message?: string } | null
  events?: { id: string; name: string; startsAt?: string; endsAt?: string; rsvpDeadline?: string | null }[]
}

/**
 * Jawaban `GET /public/:slug/guest`. Tautan tanpa token — atau dengan token yang tidak
 * dikenal — dijawab `{ personal: false }`, bukan 404: undangan tetap boleh dibuka siapa saja,
 * yang personal cuma bagian RSVP-nya. Union-nya memaksa pemanggil menyempitkan lebih dulu;
 * tipe lama mengaku `quota: number` selalu ada, jadi `Math.min(undefined, …)` diam-diam NaN.
 */
export type GuestLookup = { personal: false } | ({ personal: true } & GuestProfile)

export interface MediaUploadResult {
  id: string
  draftUrl: string
  publicUrl: string
  contentType: string
  /** `image` | `audio` | `ornament` (fase 69). */
  kind: MediaKind
  /** Piksel asli; diisi server untuk raster supaya `<img>` punya dimensi intrinsik. */
  width?: number | null
  height?: number | null
  originalName?: string
  bytes?: number
}

export interface SignedInUser {
  id: string
  email: string
  name: string
  role: string
  /** Halaman akun memakai ini untuk memutuskan lencana; `emailVerifiedAt` sendiri tidak pernah keluar. */
  emailVerified: boolean
  /**
   * Akun yang lahir dari Google murni tidak punya `passwordHash`. Tanpa bendera ini halaman
   * akun tidak bisa tahu kapan harus menampilkan form ganti kata sandi dan kapan tombol
   * "kirim tautan buat kata sandi" — dan menebaknya berarti separuh pemakai melihat form yang
   * menolak apa pun yang mereka isi.
   */
  hasPassword: boolean
}

/**
 * Satu baris riwayat sesi. Sengaja **riwayat**, bukan "perangkat aktif": login baru mencabut
 * semua sesi lama pemilik akun, jadi yang aktif selalu tepat satu. Yang punya nilai baca adalah
 * sebab berakhirnya — baris `REPLACED` yang tidak dikenali pemiliknya adalah satu-satunya
 * sinyal yang akan ia dapat bahwa kata sandinya bocor.
 */
export interface SessionHistoryEntry {
  id: string
  /** Sesi yang sedang dipakai untuk membaca daftar ini. */
  current: boolean
  device: string
  ip: string | null
  signedInAt: string
  lastActiveAt: string
  endedAt: string | null
  /** `SessionRevokeReason` dari basis data; `null` selama sesinya masih hidup. */
  endedReason: string | null
}

export interface CurrentAccount {
  user: SignedInUser
  invitations: InvitationSummary[]
}

/** Galat API, bentuk yang sama untuk semua endpoint. */
export interface ApiError {
  code?: string
  message: string
  fieldErrors?: Record<string, string[]>
  current?: unknown
  retryAfterSeconds?: number
  requestId?: string
}
