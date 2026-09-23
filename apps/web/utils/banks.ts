import { bankIds, type BankId } from '@aruna/contracts'

export interface BankPresentation {
  /** Nama yang ditampilkan di kartu. */
  name: string
  /** Warna merek, hanya untuk pita kepala kartu — tidak pernah jadi latar teks panjang. */
  brand: string
  /**
   * Warna teks di atas `brand`. Dipatok per bank karena tidak ada satu aturan yang lolos:
   * putih di atas Jenius hanya 2,71:1, sedangkan ink di atas Mandiri hanya 1,73:1.
   * Rasio terverifikasi `scripts/contrast-check.py`, 2026-09-12; bank baru dan warna tile 2026-09-23.
   */
  on: string
  /**
   * Tile lambang di `public/banks/` (99×71, latar merek sudah di dalamnya; sudut dan bayangan
   * digambar CSS kartu). Tidak pernah disimpan di dokumen undangan — dokumen hanya membawa
   * `bankId` — supaya `assertSafeUrls` tidak perlu dilonggarkan.
   */
  logo: string
}

const INK = '#17110D'
const PAPER = '#FFFFFF'

/** Rasio `on` di atas `brand`: tabel "Warna merek bank" di DESIGN.md, `scripts/contrast-check.py`. */
export const bankPresentation: Record<BankId, BankPresentation> = {
  bca: { name: 'BCA', brand: '#0060AF', on: PAPER, logo: '/banks/bca.png' },
  mandiri: { name: 'Mandiri', brand: '#003D79', on: PAPER, logo: '/banks/mandiri.png' },
  bri: { name: 'BRI', brand: '#00529C', on: PAPER, logo: '/banks/bri.png' },
  bni: { name: 'BNI', brand: '#005E6A', on: PAPER, logo: '/banks/bni.png' },
  bsi: { name: 'BSI', brand: '#00A39D', on: INK, logo: '/banks/bsi.svg' },
  cimb: { name: 'CIMB Niaga', brand: '#EE3124', on: INK, logo: '/banks/cimb.png' },
  danamon: { name: 'Danamon', brand: '#004B3A', on: PAPER, logo: '/banks/danamon.png' },
  hsbc: { name: 'HSBC', brand: '#DB0011', on: PAPER, logo: '/banks/hsbc.png' },
  digibank: { name: 'digibank by DBS', brand: '#FFC134', on: INK, logo: '/banks/digibank.png' },
  jago: { name: 'Jago', brand: '#FDAF27', on: INK, logo: '/banks/jago.png' },
  jenius: { name: 'Jenius SMBC', brand: '#05B0EE', on: INK, logo: '/banks/jenius.png' },
  seabank: { name: 'Seabank', brand: '#EE4D2D', on: INK, logo: '/banks/seabank.svg' },
  dana: { name: 'DANA', brand: '#108EE9', on: INK, logo: '/banks/dana.png' },
  gopay: { name: 'GoPay', brand: '#00AED6', on: INK, logo: '/banks/gopay.png' },
  ovo: { name: 'OVO', brand: '#4C3494', on: PAPER, logo: '/banks/ovo.png' },
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

