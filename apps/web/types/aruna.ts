import type { InvitationDocument, InvitationSection } from '@aruna/contracts'
export type { InvitationDocument, InvitationSection as Section }

export type Invitation = { id: string; slug: string; title: string; status: string; document?: InvitationDocument; revision?: number; features?: string[]; publishedAt?: string | null }
export type Guest = { id: string; displayName: string; token: string; revision: number; phone?: string; group?: string; quota: number; rsvp?: { attendance: string; count?: number } | null }
export type ApiError = { code?: string; message: string; fieldErrors?: Record<string, string[]>; requestId?: string }

export type CatalogPackage = { id: string; name: string; price: number; features: string[] }
export type CatalogAddon = { id: string; name: string; price: number }
export type CatalogTemplate = { id: string; name: string; version: number; tagline?: string; accent?: string }
export type Catalog = { packages: CatalogPackage[]; addons: CatalogAddon[]; templates: CatalogTemplate[]; sandbox: boolean }

/**
 * Tamu yang membuka tautan personalnya. Dulu tipe ini hidup di dalam `Renderer.vue`;
 * dipindahkan ke sini saat renderer dipecah jadi satu komponen per section, supaya
 * section tidak perlu mengimpor dari induknya sendiri.
 */
export type GuestProfile = {
  displayName: string
  quota: number
  rsvp?: { attendance: 'yes' | 'no'; count?: number; message?: string } | null
}

export type Wish = {
  id: string
  /** Nama kolom milik Prisma. Sebelumnya klien menyebutnya `name`, jadi atribusi tidak pernah muncul. */
  authorName?: string | null
  message: string
  createdAt?: string
  /** Baris optimistik milik penulisnya sendiri; belum terlihat oleh tamu lain. */
  approved?: boolean
}

export type RsvpPayload = { attendance: 'yes' | 'no'; count: number; message: string }
