import { isVariantOf, variantSlots, type OrnamentOverrides } from './ornament-variants'
import { ornamentsByCategory, type OrnamentId } from './ornaments'

/**
 * Pilihan berbentuk enum yang hidup di `section.data`.
 *
 * Polanya meniru `fontChoices`/`selectableFonts` di kontrak: himpunan **validasi** dipisah
 * dari himpunan yang **ditawarkan**, sehingga nilai lama tetap terbaca meski sebuah pilihan
 * ditarik dari editor. Semuanya tinggal di lapisan web, bukan di `packages/contracts`:
 * `section.data` adalah `z.record(z.unknown())` dan memang tidak divalidasi zod.
 *
 * Wajib dipakai bersama `textFields` di editor — fallback itu merender input teks untuk
 * **setiap** key bernilai string, jadi key enum harus dikecualikan di sana dan diberi
 * `<UiSelect>` sendiri.
 */

/* ── Cover ──────────────────────────────────────────────────────────────────── */
export const coverLayouts = ['arch-potret', 'split-editorial', 'full-bleed', 'kayon-frame', 'kolase-prewed'] as const
export type CoverLayout = (typeof coverLayouts)[number]

export const selectableCoverLayouts: { id: CoverLayout; label: string; hint: string }[] = [
  { id: 'arch-potret', label: 'Potret berbingkai', hint: 'Foto dipotong lengkung, berdiri di atas warna tema.' },
  { id: 'full-bleed', label: 'Foto penuh layar', hint: 'Foto mengisi layar, nama ditulis di atasnya.' },
  { id: 'split-editorial', label: 'Foto dan teks bersisian', hint: 'Foto di satu sisi, nama di sisi lain.' },
  { id: 'kayon-frame', label: 'Dalam bingkai tema', hint: 'Foto duduk di dalam siluet bingkai milik tema.' },
  { id: 'kolase-prewed', label: 'Kolase prewedding', hint: 'Satu foto besar dan dua pendamping dari galeri.' },
]

export function toCoverLayout(value: unknown): CoverLayout {
  return (coverLayouts as readonly string[]).includes(String(value)) ? (value as CoverLayout) : 'arch-potret'
}

/* ── Galeri ─────────────────────────────────────────────────────────────────── */
export const galleryMotions = ['tema', 'kolase', 'satu-per-satu', 'rel'] as const
export type GalleryMotion = (typeof galleryMotions)[number]

export const selectableGalleryMotions: { id: GalleryMotion; label: string; hint: string }[] = [
  { id: 'tema', label: 'Ikut tema', hint: 'Bawaan. Tata letak ditentukan watak tema.' },
  { id: 'kolase', label: 'Kolase', hint: 'Semua foto tampil sekaligus, tinggi mengikuti aslinya.' },
  { id: 'satu-per-satu', label: 'Satu per satu', hint: 'Foto berganti mengikuti scroll — tamu melihatnya bergantian.' },
  { id: 'rel', label: 'Rel geser', hint: 'Strip mendatar yang digeser sendiri oleh tamu.' },
]

export function toGalleryMotion(value: unknown): GalleryMotion {
  return (galleryMotions as readonly string[]).includes(String(value)) ? (value as GalleryMotion) : 'tema'
}

/* ── Varian ornamen ─────────────────────────────────────────────────────────── */

/**
 * Penukaran ornamen yang dipilih pasangan, disaring terhadap kolam tema yang sedang dipakai.
 *
 * **Inilah titik penegakannya.** `section.data` adalah `z.record(z.unknown())` dan zod tidak
 * memeriksa apa pun di dalamnya, jadi dokumen yang disunting tangan bisa menuliskan glyph apa
 * saja — termasuk yang ketebalan garisnya tidak cocok, yang merusak kohesi undangan lewat
 * pintu yang tidak dijaga gerbang mana pun. Yang tidak ditawarkan tema ini dibuang di sini.
 *
 * Efek samping yang disengaja: mengganti tema otomatis melepas penukaran yang tidak berlaku
 * lagi, karena penyaringannya dihitung ulang terhadap tema yang baru. Pasangan tidak pernah
 * melihat bingkai tema lama menempel di tema barunya.
 */
export function toOrnamentOverrides(value: unknown, templateId: string): OrnamentOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const masuk = value as Record<string, unknown>
  const keluar: OrnamentOverrides = {}
  for (const slot of variantSlots) {
    const pilihan = masuk[slot]
    if (isVariantOf(templateId, slot, pilihan)) keluar[slot] = pilihan
  }
  return keluar
}

/* ── Ilustrasi gedung ───────────────────────────────────────────────────────── */
export const selectableVenues = ornamentsByCategory('venue').map(entry => ({ id: entry.id, label: entry.name }))

/** String kosong berarti "tanpa ilustrasi", dan itu pilihan yang sah. */
export function toVenueIllustration(value: unknown): OrnamentId | '' {
  const id = String(value ?? '')
  return selectableVenues.some(option => option.id === id) ? (id as OrnamentId) : ''
}

/* ── Dresscode ──────────────────────────────────────────────────────────────── */
export const selectableAttire = ornamentsByCategory('attire').map(entry => ({ id: entry.id, label: entry.name }))

export function toAttire(value: unknown): OrnamentId[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => String(item))
    .filter((id): id is OrnamentId => selectableAttire.some(option => option.id === id))
}

/** Satu bundaran warna dresscode. `name` wajib — warna saja bukan penanda yang bisa diakses. */
export interface DresscodeColor {
  hex: string
  name: string
}

export function toDresscodeColors(value: unknown): DresscodeColor[] {
  if (!Array.isArray(value)) return []
  const colors: DresscodeColor[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as Record<string, unknown>
    const hex = String(entry.hex ?? '').trim()
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) continue
    colors.push({ hex, name: String(entry.name ?? '').trim() || hex.toUpperCase() })
  }
  return colors
}

/* ── Cerita kami ────────────────────────────────────────────────────────────── */
export const storySides = ['kiri', 'kanan'] as const
export type StorySide = (typeof storySides)[number]

export interface StoryStep {
  id: string
  title: string
  text: string
  /** Dinamai `image` dengan sengaja — `assertSafeUrls` hanya memeriksa key berakhiran url/image. */
  image: string
  side: StorySide
}

export function toStorySteps(value: unknown): StoryStep[] {
  if (!Array.isArray(value)) return []
  const steps: StoryStep[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as Record<string, unknown>
    const title = String(entry.title ?? '').trim()
    const body = String(entry.text ?? '').trim()
    if (!title && !body) continue
    const side = String(entry.side ?? '')
    steps.push({
      id: String(entry.id ?? '') || `langkah-${steps.length + 1}`,
      title,
      text: body,
      image: String(entry.image ?? ''),
      // Selang-seling otomatis kalau pasangan tidak memilih sisi.
      side: (storySides as readonly string[]).includes(side)
        ? (side as StorySide)
        : (steps.length % 2 === 0 ? 'kiri' : 'kanan'),
    })
  }
  return steps
}
