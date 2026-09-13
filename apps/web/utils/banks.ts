import { bankIds, type BankId } from '@aruna/contracts'

export interface BankPresentation {
  /** Nama yang ditampilkan di kartu. */
  name: string
  /** Warna merek, hanya untuk pita kepala kartu — tidak pernah jadi latar teks panjang. */
  brand: string
  /**
   * Warna teks di atas `brand`. Dipatok per bank karena tidak ada satu aturan yang lolos:
   * putih di atas Jenius hanya 2,71:1, sedangkan ink di atas Mandiri hanya 1,73:1.
   * Rasio terverifikasi `scripts/contrast-check.py`, 2026-09-12.
   */
  on: string
  /**
   * Berkas lambang di `public/banks/`. Tidak pernah disimpan di dokumen undangan —
   * dokumen hanya membawa `bankId` — supaya `assertSafeUrls` tidak perlu dilonggarkan.
   */
  logo: string
}

const INK = '#17110D'
const PAPER = '#FFFFFF'

export const bankPresentation: Record<BankId, BankPresentation> = {
  bca: { name: 'BCA', brand: '#0060AF', on: PAPER, logo: '/banks/bca.svg' },
  mandiri: { name: 'Mandiri', brand: '#003D79', on: PAPER, logo: '/banks/mandiri.svg' },
  bri: { name: 'BRI', brand: '#00529C', on: PAPER, logo: '/banks/bri.svg' },
  bsi: { name: 'BSI', brand: '#00A39D', on: INK, logo: '/banks/bsi.svg' },
  jago: { name: 'Jago', brand: '#F26F21', on: INK, logo: '/banks/jago.svg' },
  jenius: { name: 'Jenius SMBC', brand: '#00A9E0', on: INK, logo: '/banks/jenius.svg' },
  seabank: { name: 'Seabank', brand: '#EE4D2D', on: INK, logo: '/banks/seabank.svg' },
  other: { name: 'Bank lain', brand: '#5B4B41', on: PAPER, logo: '/banks/other.svg' },
}

export function bank(id: BankId): BankPresentation {
  return bankPresentation[id] ?? bankPresentation.other
}

/**
 * Nama yang benar-benar ditampilkan. `other` memakai apa pun yang diketik pasangan,
 * jadi bank di luar daftar tetap terbaca sebagai dirinya sendiri.
 */
export function bankName(id: BankId, label: string): string {
  if (id === 'other') return label.trim() || bankPresentation.other.name
  return bankPresentation[id].name
}

/** Pilihan untuk `<select>` di editor, urut sesuai daftar kontrak. */
export const bankOptions = bankIds.map(id => ({ id, label: bankPresentation[id].name }))

