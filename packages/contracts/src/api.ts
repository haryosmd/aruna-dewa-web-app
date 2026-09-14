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

import { z } from 'zod'
import { invitationDocumentSchema, templateIds, type ImportRow, type InvitationDocument } from './index.js'

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
  quota: z.number().int().min(1).max(20).optional(),
}

export const createGuestBodySchema = z.object(guestFields)
export type CreateGuestBody = z.infer<typeof createGuestBodySchema>

export const updateGuestBodySchema = z.object({ ...guestFields, revision })
export type UpdateGuestBody = z.infer<typeof updateGuestBodySchema>

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

export const publicWishBodySchema = z.object({
  token: opaqueToken,
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
}

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
  revision: number
  phone?: string
  group?: string
  quota: number
  rsvp?: GuestRsvp | null
}

export interface GuestPage {
  items: Guest[]
  total: number
  page: number
  pageSize: number
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
}

export interface SignedInUser {
  id: string
  email: string
  name: string
  role: string
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
