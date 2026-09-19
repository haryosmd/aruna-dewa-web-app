import type { LayerSlot, OrnamentId } from './ornaments'
import { ornament, ornamentBank } from './ornaments'
import { fitOf } from './ornament-fit'
import { muatLayer, muatSlot, ornamenDisembunyikan, type OrnamentSlotKey } from './ornament-slots'
import { themeOrnaments } from './theme'
import { variantSlots, variantsFor, type VariantSlot } from './ornament-variants'

/**
 * Penyaringan, pengurutan, dan pencarian grid Studio Ornamen.
 *
 * Seluruhnya fungsi murni, dan itu disengaja: vitest di repo ini jalan di node tanpa DOM, jadi
 * logika yang hidup di dalam SFC tidak pernah bisa diuji. Komponen tinggal merender apa yang
 * dikembalikan berkas ini.
 */

/** Pack asal sebuah glyph, diturunkan dari awalan id — bukan field baru di bank. */
export const packIds = ['inti', 'melati', 'kayon', 'sekar', 'sunda', 'pusaka', 'referensi'] as const
export type PackId = (typeof packIds)[number]

export const packLabels: Record<PackId, string> = {
  inti: 'Bawaan',
  melati: 'Ronce Melati',
  kayon: 'Kayon',
  sekar: 'Sekar',
  sunda: 'Taman Pasundan',
  pusaka: 'Pusaka',
  referensi: 'Kiriman referensi',
}

export function packOf(glyph: OrnamentId): PackId {
  const awalan = String(glyph).split('-')[0] ?? ''
  if (awalan === 'ref') return 'referensi'
  return (packIds as readonly string[]).includes(awalan) ? (awalan as PackId) : 'inti'
}

/**
 * Normalisasi teks pencarian: huruf kecil, tanpa diakritik, tanpa tanda hubung.
 *
 * Tanpa pelucutan diakritik, mengetik "rangkaian" tidak menemukan glyph bernama "Rangkaian"
 * yang ditulis dengan é di pack mana pun, dan pasangan menyimpulkan glyph-nya tidak ada.
 */
export function normalkan(teks: string): string {
  return teks.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/-/g, ' ').trim()
}

export type StudioTab = 'disarankan' | 'semua'

export interface StudioQuery {
  /** Slot skalar, atau jangkar ladang saat `layer` terisi. */
  slot?: OrnamentSlotKey
  layer?: LayerSlot
  templateId: string
  tab: StudioTab
  query?: string
  pack?: PackId | 'semua'
}

/**
 * Semua id bank yang sah untuk slot/jangkar ini, tanpa penyaringan lain — kecuali
 * `ornamenDisembunyikan`, yang bukan penyaringan kecocokan melainkan keputusan kurasi pemilik
 * (fase 70). Ia dipotong di sini, satu-satunya pintu masuk grid, supaya tab "Semua", hitungan
 * chip pack, dan tab "Disarankan" tidak pernah berselisih.
 */
export function kandidat(q: Pick<StudioQuery, 'slot' | 'layer'>): OrnamentId[] {
  const ids = (Object.keys(ornamentBank) as OrnamentId[]).filter(id => !ornamenDisembunyikan.has(id))
  if (q.layer) return ids.filter(id => muatLayer(q.layer!, id))
  if (q.slot) return ids.filter(id => muatSlot(q.slot!, id))
  return []
}

/**
 * Kolam "Disarankan".
 *
 * Empat slot punya kolam terkurasi sungguhan di `themeVariants`, dijaga gerbang kohesi dan
 * `ornament-variants.spec.ts`; untuk keempatnya kolam itulah jawabannya, apa adanya dan
 * berurutan (bawaan tema di depan). Lima slot sisanya dan kelima jangkar ladang tidak pernah
 * punya kolam — untuk mereka "disarankan" berarti **yang lolos `fitOf()`**, yaitu ukuran yang
 * sama yang dipakai gerbang, hanya saja dihitung per keping alih-alih dikurasi tangan.
 */
export function disarankan(q: Pick<StudioQuery, 'slot' | 'layer' | 'templateId'>): OrnamentId[] {
  if (q.slot && (variantSlots as readonly string[]).includes(q.slot)) {
    return [...variantsFor(q.templateId, q.slot as VariantSlot)]
  }
  const bawaan = bawaanSlot(q)
  const sisa = kandidat(q).filter(id => id !== bawaan && fitOf(id, q.templateId).ok)
  return bawaan ? [bawaan, ...sisa] : sisa
}

/** Glyph bawaan tema untuk slot/jangkar ini. */
export function bawaanSlot(q: Pick<StudioQuery, 'slot' | 'layer' | 'templateId'>): OrnamentId | undefined {
  const set = themeOrnaments(q.templateId)
  if (q.layer) return set.layers.find(id => muatLayer(q.layer!, id))
  return q.slot ? set[q.slot] : undefined
}

/**
 * Grid yang dirender.
 *
 * Urutannya membawa kurasi yang dulu jadi larangan: bawaan tema, lalu kolam terkurasi, lalu
 * yang lolos `fitOf()`, lalu sisanya. Pasangan tetap bisa mencapai keping mana pun — ia hanya
 * tidak perlu menggulir melewati yang tidak seresep untuk menemukan yang seresep.
 */
export function cariOrnamen(q: StudioQuery): OrnamentId[] {
  const rekomen = disarankan(q)
  const dasar = q.tab === 'disarankan' ? rekomen : kandidat(q)
  const peringkat = new Map(rekomen.map((id, i) => [id, i]))

  const kata = normalkan(q.query ?? '')
  const disaring = dasar.filter(id => {
    if (q.pack && q.pack !== 'semua' && packOf(id) !== q.pack) return false
    if (!kata) return true
    return normalkan(`${ornament(id).name} ${id}`).includes(kata)
  })

  if (q.tab === 'disarankan') return disaring

  return disaring.sort((a, b) => {
    const ra = peringkat.get(a) ?? Infinity
    const rb = peringkat.get(b) ?? Infinity
    if (ra !== rb) return ra - rb
    const fa = fitOf(a, q.templateId).ok ? 0 : 1
    const fb = fitOf(b, q.templateId).ok ? 0 : 1
    if (fa !== fb) return fa - fb
    return a < b ? -1 : 1
  })
}

/** Berapa keping tersedia per pack untuk slot ini — dipakai label penyaring. */
export function hitungPack(q: Pick<StudioQuery, 'slot' | 'layer'>): Record<PackId, number> {
  const keluar = Object.fromEntries(packIds.map(p => [p, 0])) as Record<PackId, number>
  for (const id of kandidat(q)) keluar[packOf(id)] += 1
  return keluar
}
