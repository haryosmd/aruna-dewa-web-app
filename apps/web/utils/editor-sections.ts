import type { InvitationDocument } from '@aruna/contracts'

/**
 * Aturan murni rail struktur editor — tanpa DOM, supaya bisa diuji tanpa merender halaman.
 *
 * Tiga hal yang dulu hidup di dalam template `editor.vue` dan karena itu tidak pernah diuji:
 * penyaringan daftar bagian, hitungan yang tampil, dan mana bagian yang wajib.
 */

export type EditorSection = InvitationDocument['sections'][number]

/** Bagian yang selalu ada dalam undangan; sakelarnya dimatikan di rail. */
export const wajib = new Set<EditorSection['type']>(['cover', 'couple', 'events'])

export type SectionRequirement = 'wajib' | 'opsional'

export function sectionRequirement(type: EditorSection['type']): SectionRequirement {
  return wajib.has(type) ? 'wajib' : 'opsional'
}

/** Berapa bagian yang akan dilihat tamu. */
export function visibleCount(sections: readonly EditorSection[]): number {
  return sections.filter(section => section.enabled).length
}

/**
 * Bentuk normal untuk pencocokan: huruf kecil, tanpa diakritik, spasi dirapikan.
 * "Résépsi" dan "resepsi" harus cocok — pasangan mengetik seadanya.
 */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SectionEntry {
  section: EditorSection
  /** Indeks di `document.sections` — bukan di daftar tersaring. `move()` bergantung padanya. */
  index: number
}

/**
 * Menyaring daftar bagian berdasarkan kueri, mencocokkan label Indonesia maupun `type`.
 * Kueri kosong mengembalikan semuanya; indeks yang dikembalikan selalu indeks asli.
 */
export function filterSections(
  sections: readonly EditorSection[],
  query: string,
  labels: Readonly<Record<string, string>>,
): SectionEntry[] {
  const needle = normalize(query)
  const entries = sections.map((section, index) => ({ section, index }))
  if (!needle) return entries
  return entries.filter(({ section }) => {
    const label = normalize(labels[section.type] ?? section.type)
    return label.includes(needle) || normalize(section.type).includes(needle)
  })
}

/** Id elemen section di undangan yang dirender: tiap `sections/*.vue` memasang `id="iv-<type>"`. */
export function sectionDomId(type: EditorSection['type']): string {
  return `iv-${type}`
}

/**
 * Tinggi pemilih perangkat yang mengambang di atas viewport panggung (`pt-28` di `Stage.vue`),
 * ditambah napas supaya judul bagian tidak menempel di bawah pilnya.
 */
export const stageScrollOffset = 96

/**
 * Posisi gulir viewport supaya elemen bagian berdiri tepat di bawah pemilih perangkat.
 *
 * Dihitung dari `getBoundingClientRect()` keduanya, bukan `offsetTop`: undangan dirender
 * selebar 390px lalu di-`scale()` (`PhoneFrame.vue`), dan rect sudah pasca-transform sedangkan
 * `offsetTop` belum. Tidak pernah negatif — bagian pertama menggulir ke 0, bukan ke atas 0.
 */
export function stageScrollTop(
  viewport: { top: number, scrollTop: number },
  target: { top: number },
  offset = stageScrollOffset,
): number {
  return Math.max(0, Math.round(viewport.scrollTop + target.top - viewport.top - offset))
}
