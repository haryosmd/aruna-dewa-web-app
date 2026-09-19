import type { EntranceStyle } from '@aruna/contracts'
import { entranceStyles } from '@aruna/contracts'
import { layerSlots, muatLayer, muatSlot, ornamentSlots, type OrnamentOverrides } from './ornament-slots'
import { isOrnamentId, ornament, ornamentsByCategory, type OrnamentId } from './ornaments'
import { themeOrnaments } from './theme'

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
 * Penukaran ornamen yang dipilih pasangan, disaring terhadap bank.
 *
 * **Inilah titik penegakannya.** `section.data` adalah `z.record(z.unknown())` dan zod tidak
 * memeriksa apa pun di dalamnya, jadi dokumen yang disunting tangan bisa menuliskan apa saja —
 * id yang tidak ada, bingkai di slot segel, atau keping ladang di jangkar yang salah. Semuanya
 * dibuang di sini, dan hanya di sini.
 *
 * **Yang berubah pada fase 59, dan yang tidak.** Sampai fase 58 penyaringnya adalah kolam
 * terkurasi per tema, jadi sebuah keping harus "seresep" untuk bisa masuk. Pemilik meminta
 * seluruh bank dibuka, jadi syaratnya turun ke korektnes: id sah, kategori cocok dengan
 * slotnya, jangkar cocok dengan ladangnya. Kurasi tidak hilang — ia pindah jadi urutan dan
 * lencana di `ornament-search.ts`/`ornament-fit.ts`, yang memberi tahu alih-alih melarang.
 *
 * **Satu efek samping lama hilang bersamanya, dan itu perlu disebut.** Dulu mengganti tema
 * otomatis melepas penukaran yang tidak berlaku lagi, karena penyaringannya dihitung ulang
 * terhadap kolam tema baru. Dengan penyaring berbasis kategori, bingkai pilihan pasangan
 * **bertahan** melewati pergantian tema. Itu perilaku yang benar untuk pemilih bebas — orang
 * yang memilih sebuah bingkai tidak ingin kehilangannya saat mencoba tema lain — tapi ia
 * menuntut Studio menyediakan "Kembalikan ke bawaan tema", karena tanpa itu tidak ada jalan
 * keluar dari wajah campuran.
 *
 * **Aset referensi ditolak dari `layers`, dan itu batas berat, bukan batas selera.** Kelima
 * keping referensi berkategori `layer` berjumlah 6,43 MB, dan `OrnamentField` memasang keping
 * ladang 2–6 kali per section di sepuluh section. Slot lain memakai satu keping sekali, jadi
 * hanya kombinasi inilah yang bisa melahirkan undangan puluhan megabita di data seluler tamu.
 *
 * Nilai yang sama dengan bawaan tema dibuang: dokumen tidak perlu membawa penukaran yang tidak
 * menukar apa pun, dan pasangan yang kembali ke bawaan berhak ikut tema kalau temanya berubah.
 */
export function toOrnamentOverrides(value: unknown, templateId: string): OrnamentOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const masuk = value as Record<string, unknown>
  const set = themeOrnaments(templateId)
  const keluar: OrnamentOverrides = {}

  for (const slot of ornamentSlots) {
    const pilihan = masuk[slot]
    if (!isOrnamentId(pilihan) || !muatSlot(slot, pilihan)) continue
    if (pilihan === set[slot]) continue
    keluar[slot] = pilihan
  }

  const layers = masuk.layers
  if (layers && typeof layers === 'object' && !Array.isArray(layers)) {
    const masukLayer = layers as Record<string, unknown>
    const keluarLayer: NonNullable<OrnamentOverrides['layers']> = {}
    for (const jangkar of layerSlots) {
      const pilihan = masukLayer[jangkar]
      if (!isOrnamentId(pilihan) || !muatLayer(jangkar, pilihan)) continue
      if (ornament(pilihan).asset) continue
      if (set.layers.includes(pilihan)) continue
      keluarLayer[jangkar] = pilihan
    }
    if (Object.keys(keluarLayer).length) keluar.layers = keluarLayer
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

/* ── Gerak per undangan (fase 69) ───────────────────────────────────────────── */
export const selectableEntrances: { id: EntranceStyle | 'tema'; label: string; hint: string }[] = [
  { id: 'tema', label: 'Ikut tema', hint: 'Bawaan. Gaya masuk ditentukan partitur tema.' },
  { id: 'rise', label: 'Naik', hint: 'Unsur naik lembut dari bawah — paling tenang.' },
  { id: 'sweep', label: 'Sapuan', hint: 'Masuk dari samping seperti disapu.' },
  { id: 'iris', label: 'Iris', hint: 'Terbuka dari tengah seperti diafragma.' },
  { id: 'silhouette', label: 'Siluet', hint: 'Bayangan dulu, lalu warnanya menyusul.' },
]

export function toEntrance(value: unknown): EntranceStyle | undefined {
  return (entranceStyles as readonly string[]).includes(String(value)) ? (value as EntranceStyle) : undefined
}
