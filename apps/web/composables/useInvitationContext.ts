import type { InjectionKey, Ref } from 'vue'
import { sectionMotions, type CopyKey, type SectionBackground, type SectionMotion } from '@aruna/contracts'
import type { GuestProfile, InvitationDocument, RendererMode, RsvpPayload, Section, Wish, WishPayload } from '~/types/aruna'
import type { OrnamentIntensity, ResolvedOrnamentSet } from '~/utils/ornaments'

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
  orn: Ref<ResolvedOrnamentSet>
  intensity: Ref<OrnamentIntensity>
  /** `mode === 'compact'`; dipertahankan karena tiga belas section v1 membacanya. */
  compact: Ref<boolean>
  /** Fase 72. Section v2 membedakan `live` (memanggil API) dari `stage`/`compact` (lokal saja). */
  mode: Ref<RendererMode>
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
  /** Foto panel kiri desktop (fase 77): galeri kalau ada, foto utama kalau tidak. */
  fotoSisi: Ref<string[]>
  headlineDate: Ref<string>
  sectionOf: (type: string) => Section | undefined
  submitRsvp: (payload: RsvpPayload) => void
  submitWish: (message: string) => void
  /** Form ucapan v2 (fase 72): nama + kehadiran + pesan sekaligus. */
  submitWishEntry: (payload: WishPayload) => void
  /**
   * Menjeda musik latar tanpa menandainya sebagai penolakan tamu.
   *
   * Ada di konteks, bukan di prop, karena yang membutuhkannya adalah section Video — tamu yang
   * menekan "Buka siaran" membuka tab lain, dan tab undangan yang tersembunyi tetap berbunyi
   * menimpa siarannya. Pemutarnya sendiri mengambang di luar daftar section, jadi tidak ada
   * jalan lain ke sana selain lewat sini.
   */
  pauseMusic: () => void
  /**
   * Opsi motion milik renderer, untuk section yang memanggil `useArunaMotion` sendiri (fase 79).
   *
   * Tiga section melakukannya — `Story`, `Gallery`, `Rsvp` — dan sampai fase ini ketiganya
   * memanggilnya **telanjang**. Akibatnya dua, dan keduanya cacat: di panggung editor mereka
   * membaca JENDELA sebagai penggulung padahal yang menggulung `[data-preview-stage]`, jadi
   * ScrollTrigger mereka memicu pada posisi yang tidak pernah benar; dan tombol Statis/Dinamis
   * (fase 78) tidak mematikan gerakan mereka, karena sakelarnya hanya sampai ke timeline yang
   * dibangun renderer.
   *
   * Fase 79 memecah bagian cerita jadi lima varian, dan tiap varian memanggil motion-nya
   * sendiri — tanpa kunci ini cacat yang sama berlipat dari tiga tempat jadi tujuh.
   */
  motionOptions: { scrollRoot: Ref<HTMLElement | null>; statis: Ref<boolean>; tahan?: Ref<boolean>; ulang?: Ref<unknown> }
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

/* ── Pembaca bagian v2 (fase 72) ──────────────────────────────────────────── */

/** `section.data.background`, hanya bila bentuknya objek. Validasi nilai ada di `InvitationSection`. */
export const latarBagian = (section: Section | undefined): SectionBackground | null => {
  const latar = section?.data.background
  return latar && typeof latar === 'object' && !Array.isArray(latar) ? (latar as SectionBackground) : null
}

/** `section.data.motion` bila salah satu preset yang dikenal; selain itu ikut tema. */
export const gerakBagian = (section: Section | undefined): SectionMotion | null => {
  const gerak = section?.data.motion
  return typeof gerak === 'string' && (sectionMotions as readonly string[]).includes(gerak) ? (gerak as SectionMotion) : null
}
