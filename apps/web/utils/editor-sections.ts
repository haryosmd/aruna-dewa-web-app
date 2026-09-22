import { isRequiredSection, sectionMeta, type InvitationDocument, type SectionType } from '@aruna/contracts'

/**
 * Aturan murni rail struktur editor — tanpa DOM, supaya bisa diuji tanpa merender halaman.
 *
 * Tiga hal yang dulu hidup di dalam template `editor.vue` dan karena itu tidak pernah diuji:
 * penyaringan daftar bagian, hitungan yang tampil, dan mana bagian yang wajib.
 */

export type EditorSection = InvitationDocument['sections'][number]

/**
 * Bagian yang selalu ada dalam undangan; tombol sembunyikannya dimatikan di rail.
 * Dokumen v1: cover, mempelai, acara. Dokumen v2 (fase 72): `requiredSectionTypes` kontrak.
 */
export const wajib = new Set<EditorSection['type']>(['cover', 'couple', 'events'])

export type SectionRequirement = 'wajib' | 'opsional'

export function sectionRequirement(type: EditorSection['type']): SectionRequirement {
  return wajib.has(type) || isRequiredSection(type) ? 'wajib' : 'opsional'
}

/**
 * Label rail per tipe. Tipe v2 membaca `sectionMeta` kontrak (nama persis referensi); tipe v1
 * yang tidak punya padanan tetap punya nama lamanya supaya dokumen lama tetap terbaca di rail.
 */
export const sectionLabels: Readonly<Record<string, string>> = {
  cover: 'Cover pembuka', events: 'Acara', rsvp: 'RSVP', music: 'Musik',
  ...Object.fromEntries(Object.entries(sectionMeta).map(([type, meta]) => [type, meta.label])),
}

export const sectionDescription = (type: SectionType): string => (sectionMeta as Record<string, { description: string }>)[type]?.description ?? ''

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
 * Napas di atas bagian yang baru saja digulir ke tampak, dalam koordinat render (belum diperkecil).
 *
 * Dulu 96: wadah gulirnya adalah viewport panggung, dan pil pemilih perangkat mengambang di
 * atasnya (`pt-28` di `Stage.vue`), jadi bagian yang berhenti di 0 akan berdiri di balik pil itu.
 * Sejak fase 76 yang menggulung adalah LAYAR PONSEL, yang tidak punya apa pun mengambang di
 * atasnya — jadi yang tersisa cuma napas supaya judul bagian tidak menempel di tepi layar.
 */
export const stageScrollOffset = 8

/**
 * Posisi gulir layar ponsel supaya elemen bagian berdiri tepat di bawah tepi atasnya.
 *
 * Dihitung dari `getBoundingClientRect()` keduanya, bukan `offsetTop`: undangan dirender selebar
 * 390px lalu di-`scale()` (`PhoneFrame.vue`), dan `offsetTop` tidak tahu soal transform.
 *
 * **`scale` wajib sejak fase 76**, dan ini bukan kehati-hatian melainkan koreksi satuan. Wadah
 * gulirnya sekarang elemen yang di-`scale()` ITU SENDIRI: `getBoundingClientRect()` menjawab dalam
 * piksel layar (sudah diperkecil) sementara `scrollTop` hidup di koordinat render (belum). Selisih
 * rect karena itu harus dibagi skalanya dulu sebelum ditambahkan ke `scrollTop`; tanpa itu, pada
 * skala 0,62 tiap lompatan hanya sampai 62% jalan dan bagian yang dituju berhenti di atas layar.
 *
 * Tidak pernah negatif — bagian pertama menggulir ke 0, bukan ke atas 0.
 */
export function stageScrollTop(
  viewport: { top: number, scrollTop: number },
  target: { top: number },
  offset = stageScrollOffset,
  scale = 1,
): number {
  const jarak = (target.top - viewport.top) / (scale || 1)
  return Math.max(0, Math.round(viewport.scrollTop + jarak - offset))
}

/**
 * Urutan baru sebagai larik BARU berisi elemen apa adanya; `null` berarti tidak ada yang bergeser.
 *
 * Penjaga batas dan `from === to` tinggal di sini supaya pemanggilnya tinggal memeriksa
 * entitlement — dan supaya urutan yang paling mudah salah (indeks daftar tersaring ≠ indeks
 * dokumen) punya tes yang berjalan tanpa merender halaman.
 */
export function pindahkan<T>(list: readonly T[], from: number, to: number): T[] | null {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return null
  const salinan = list.slice()
  const [item] = salinan.splice(from, 1)
  salinan.splice(to, 0, item!)
  return salinan
}
