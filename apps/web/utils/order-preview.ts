/**
 * Aturan murni pratinjau wizard `/order`: section mana yang dirender pada tiap langkah.
 *
 * Pratinjau yang menggulung seluruh undangan bawaan gagal pada tugas pertamanya — di langkah
 * "nama kalian", nama pasangan jatuh di bawah lipatan sementara yang terlihat justru galeri stok,
 * RSVP, dan hitung mundur tanpa tanggal. Jadi tiap langkah hanya merender section yang ia sentuh,
 * dan baru di langkah terakhir seluruh undangan ditampilkan sebagai "ini yang kalian dapat".
 */

export interface PreviewFocusOptions {
  /** Hitung mundur hanya berarti kalau tanggalnya sudah ada. */
  hasDate: boolean
}

/** Id section yang dirender di langkah `step`; `null` berarti seluruh dokumen. */
export function previewSectionIds(step: number, options: PreviewFocusOptions): ReadonlySet<string> | null {
  switch (step) {
    case 1: return new Set(['cover'])
    case 2: return new Set(options.hasDate ? ['events', 'countdown'] : ['events'])
    /*
     * Cover saja, bukan cover + mempelai: dengan batas tinggi bingkai, dua section sekaligus
     * diperkecil sampai 54% dan huruf temanya — justru yang sedang dipilih — tidak terbaca.
     * Cover sendiri sudah memuat palet, ornamen, foto tema, dan huruf skrip.
     */
    case 3: return new Set(['cover'])
    default: return null
  }
}

/** Kotak pratinjau baru boleh menggulung saat seluruh undangan yang ditampilkan. */
export function previewScrolls(step: number, options: PreviewFocusOptions): boolean {
  return previewSectionIds(step, options) === null
}

/**
 * Menyalin `sections` dengan `enabled` disetel ulang mengikuti langkah. Renderer sudah
 * menghormati `enabled`, jadi tidak perlu prop baru di sana. Di langkah terakhir daftarnya
 * dikembalikan apa adanya, termasuk section yang memang mati di dokumen bawaan.
 */
export function focusPreview<T extends { id: string; enabled: boolean }>(
  sections: readonly T[],
  step: number,
  options: PreviewFocusOptions,
): T[] {
  const ids = previewSectionIds(step, options)
  if (!ids) return sections.slice()
  return sections.map(section => ({ ...section, enabled: ids.has(section.id) }))
}

/**
 * Langkah wizard dari `?langkah=` (fase 69): nama langkah, bukan angka, supaya tautan dari
 * landing tetap bermakna kalau urutan langkahnya berubah. Nilai asing atau array → langkah 1.
 */
export const langkahWizard = ['pasangan', 'acara', 'tema', 'paket'] as const
export function langkahDariQuery(value: unknown): number {
  const posisi = typeof value === 'string' ? (langkahWizard as readonly string[]).indexOf(value) : -1
  return posisi === -1 ? 1 : posisi + 1
}
