/**
 * Re-export, bukan definisi kedua.
 *
 * Berkas ini dulu mendefinisikan ulang bentuk yang sudah dikirim API, dan definisinya boleh
 * menyimpang tanpa ada yang menyadarinya — `Wish` sempat punya tiga versi yang saling berbeda,
 * dua di antaranya menyebut kolom (`name`, `guestName`) yang tidak pernah dikirim API, jadi
 * nama penulis ucapan dan nama tamu di daftar RSVP selalu jatuh ke teks cadangan.
 *
 * Sekarang semuanya berasal dari `@aruna/contracts`, yang juga dipakai API untuk memvalidasi
 * body dan menyusun jawabannya. Nama lokal yang sudah dipakai 27 berkas dipertahankan sebagai
 * alias supaya perpindahannya tidak menyentuh tiap komponen section.
 */

import type { InvitationDocument, InvitationSection } from '@aruna/contracts'

export type { InvitationDocument }
export type { InvitationSection as Section }

export type {
  ApiError,
  CatalogAddon,
  CatalogPackage,
  CatalogTemplate,
  Guest,
  GuestProfile,
  RsvpEntry,
  Wish,
} from '@aruna/contracts/api'

export type { CatalogResponse as Catalog } from '@aruna/contracts/api'

/**
 * Undangan seperti yang dilihat dasbor: ringkasan dari `GET /invitations` maupun detail dari
 * `GET /invitations/:id` masuk ke ref yang sama, jadi bagian detailnya opsional.
 */
export type { InvitationSummary } from '@aruna/contracts/api'
export type Invitation = import('@aruna/contracts/api').InvitationSummary & Partial<Omit<import('@aruna/contracts/api').InvitationDetail, keyof import('@aruna/contracts/api').InvitationSummary>>

/** Bentuk yang dikirim `Renderer.vue` ke atas saat tamu menekan kirim; bukan bentuk API. */
export type RsvpPayload = { attendance: 'yes' | 'no'; count: number; message: string }

/**
 * Form ucapan Elegance (fase 72): nama, kehadiran, dan pesan dalam satu kiriman. Ejaan
 * kehadirannya milik undangan (`hadir`), bukan enum RSVP — API yang menerjemahkannya.
 */
export type { WishAttendance } from '@aruna/contracts/api'
export type WishPayload = { name: string; attendance: import('@aruna/contracts/api').WishAttendance | ''; message: string }

/**
 * Cara renderer dipasang. `live` = halaman tamu; `compact` = pratinjau tanpa gerbang, pemutar,
 * dan dock; `stage` = panggung editor — gerbang, pemutar, dan dock ikut dirender tapi
 * terkurung di dalam `.iv-root` (bukan `fixed`), dan gerbang tidak mengunci `document.body`.
 */
export type RendererMode = 'live' | 'stage' | 'compact'
