import type { InjectionKey, Ref } from 'vue'
import type { CopyKey } from '@aruna/contracts'
import type { GuestProfile, InvitationDocument, RsvpPayload, Section, Wish } from '~/types/aruna'
import type { OrnamentIntensity, OrnamentSet } from '~/utils/ornaments'

/**
 * Konteks bersama seluruh section undangan.
 *
 * Renderer dipecah jadi satu komponen per section supaya urutannya bisa mengikuti
 * `document.sections` — sebelumnya urutan dipaku di template, sehingga tombol naik/turun
 * di editor tidak berpengaruh sama sekali. Memakai provide/inject, bukan prop, karena
 * tiap section butuh potongan konteks yang berbeda dan `v-bind` satu-satu akan berubah
 * jadi tiga belas daftar prop yang harus dijaga sinkron.
 */
export interface InvitationContext {
  document: Ref<InvitationDocument>
  orn: Ref<OrnamentSet>
  intensity: Ref<OrnamentIntensity>
  compact: Ref<boolean>
  /**
   * Kata-kata yang berlaku untuk kunci di `copyKeys` (fase 69): milik pasangan bila ia menulis
   * ulang, bawaan tema bila tidak. Fungsi, bukan objek, supaya section tidak perlu tahu di mana
   * bawaannya disimpan — dan supaya pemanggilnya tetap reaktif lewat `document`.
   */
  t: (key: CopyKey) => string
  coupleNames: Ref<string>
  initials: Ref<string>
  greeting: Ref<string>
  guest: Ref<GuestProfile | null>
  guestError: Ref<string>
  hasToken: Ref<boolean>
  wishes: Ref<Wish[]>
  rsvpPending: Ref<boolean>
  wishPending: Ref<boolean>
  /** Foto galeri, dipakai section lain sebagai cadangan saat tidak punya foto sendiri. */
  galleryImages: Ref<string[]>
  headlineDate: Ref<string>
  sectionOf: (type: string) => Section | undefined
  submitRsvp: (payload: RsvpPayload) => void
  submitWish: (message: string) => void
  /**
   * Menjeda musik latar tanpa menandainya sebagai penolakan tamu.
   *
   * Ada di konteks, bukan di prop, karena yang membutuhkannya adalah section Video — tamu yang
   * menekan "Buka siaran" membuka tab lain, dan tab undangan yang tersembunyi tetap berbunyi
   * menimpa siarannya. Pemutarnya sendiri mengambang di luar daftar section, jadi tidak ada
   * jalan lain ke sana selain lewat sini.
   */
  pauseMusic: () => void
}

export const invitationKey = Symbol('aruna-invitation') as InjectionKey<InvitationContext>

export function provideInvitation(context: InvitationContext) {
  provide(invitationKey, context)
}

/**
 * Selalu dipanggil dari dalam `InvitationRenderer`. Melempar kalau tidak, karena section
 * yang dirender di luar renderer adalah bug, bukan keadaan yang perlu ditangani diam-diam.
 */
export function useInvitation(): InvitationContext {
  const context = inject(invitationKey)
  if (!context) throw new Error('Section undangan dirender di luar InvitationRenderer.')
  return context
}

/* ── Pembaca `section.data` ──────────────────────────────────────────────────
 * `section.data` adalah `z.record(z.unknown())` — zod tidak memvalidasi isinya sama
 * sekali, jadi setiap pembacaan harus menyempit sendiri. Tiga helper ini yang dipakai
 * seluruh section, bukan cast yang ditulis ulang di tiap berkas.
 */
export const text = (section: Section | undefined, key: string, fallback = '') =>
  String(section?.data[key] ?? fallback)

export const list = (section: Section | undefined, key: string): string[] =>
  Array.isArray(section?.data[key]) ? (section.data[key] as string[]) : []

export const rows = (section: Section | undefined, key: string): Record<string, unknown>[] =>
  Array.isArray(section?.data[key]) ? (section.data[key] as Record<string, unknown>[]) : []
