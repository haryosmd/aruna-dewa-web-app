import type { Entrance } from '~/utils/motion-score'

/**
 * Keadaan awal dan akhir gerak masuk per tata bahasa (fase 80).
 *
 * Sampai fase 79 tata bahasa hanya mengenai `[data-iv-photo]`, jadi di sembilan dari empat belas
 * bagian demo — yang tidak berfoto — memilih `iris` atau `rise` menghasilkan gerak yang sama
 * persis: judul naik 26px. Dan `iris` sendiri hanya pudar dengan skala 1,06; tidak ada bukaan
 * apa pun, padahal petunjuknya berbunyi "terbuka dari tengah seperti diafragma". Terukur headless
 * sebelum diubah: `clip-path` tidak pernah muncul di satu pun elemen, di kelima tema.
 *
 * Tabel ini dipisah dari `useArunaMotion` supaya perbedaannya bisa dijaga tes tanpa merender.
 * Keadaan akhirnya selalu terbaca penuh (DESIGN.md aturan 3): yang ditulis hanya titik awal,
 * dan `clip-path` akhirnya selalu lebih luas dari kotaknya.
 */
export type FotoMasuk = 'rise' | 'sweep-left' | 'sweep-right' | 'iris'

/**
 * `from` adalah titik awal `gsap.from` — keadaan akhirnya selalu gaya milik elemen itu sendiri,
 * jadi judul yang sengaja ber-`opacity: 0.9` tidak dipaksa jadi 1. `clip` terpisah karena
 * `clip-path: none` tidak bisa diinterpolasi: bukaan iris butuh ujung yang ditulis eksplisit.
 */
export interface GerakMasuk {
  from: Record<string, string | number>
  clip?: [awal: string, akhir: string]
  /**
   * Ujung `filter` untuk siluet (fase 81). Sama seperti `clip`: `filter: none` tidak bisa
   * diinterpolasi, jadi kedua ujungnya ditulis. Akhirnya fungsi netral yang sama bentuknya,
   * dan pemanggil membersihkannya (`clearProps`) supaya tidak meninggalkan konteks tumpuk.
   */
  filter?: [awal: string, akhir: string]
}

/** Bukaan iris untuk foto: lingkaran dari pusat. 75% jari-jari rujukan melewati sudut kotak (70,7%). */
const IRIS_FOTO: [string, string] = ['circle(0% at 50% 50%)', 'circle(75% at 50% 50%)']

/**
 * Bukaan iris untuk teks: celah tengah yang melebar ke samping. Tepinya negatif supaya ekor huruf
 * skrip yang keluar dari kotaknya tidak terpotong saat bukaannya sudah penuh.
 */
const IRIS_TEKS: [string, string] = ['inset(-25% 50% -25% 50%)', 'inset(-25% -12% -25% -12%)']

export function fotoMasuk(key: FotoMasuk): GerakMasuk {
  switch (key) {
    case 'rise': return { from: { y: 36, scale: 1.04, opacity: 0 } }
    case 'sweep-left': return { from: { x: -46, scale: 1.06, opacity: 0 } }
    case 'sweep-right': return { from: { x: 46, scale: 1.06, opacity: 0 } }
    case 'iris': return { from: { scale: 1.06, opacity: 0 }, clip: IRIS_FOTO }
  }
}

/**
 * Gerak masuk judul dan teks utama (`[data-iv-lead]`). Tanpa tata bahasa — partitur yang tidak
 * menentukan apa-apa — tetap naik 26px seperti sebelumnya.
 */
/**
 * Siluet teks dan ornamen (fase 81): gelap tanpa warna dulu, lalu warnanya menyusul — janji yang
 * ditulis petunjuk pilihannya. Sampai fase 80 teks siluet naik persis seperti `rise`, jadi di
 * sepuluh bagian tanpa foto memilih "Siluet" tidak mengubah satu piksel pun.
 */
export const SILUET: [string, string] = ['grayscale(1) brightness(0.3) blur(2px)', 'grayscale(0) brightness(1) blur(0px)']

export function judulMasuk(grammar: Entrance | undefined, index: number): GerakMasuk {
  if (grammar === 'sweep') return { from: { x: index % 2 === 0 ? -32 : 32, opacity: 0 } }
  if (grammar === 'iris') return { from: { opacity: 0 }, clip: IRIS_TEKS }
  if (grammar === 'silhouette') return { from: { y: 18, opacity: 0.2 }, filter: SILUET }
  return { from: { y: 26, opacity: 0 } }
}

/**
 * Gerak masuk SATU keping kanvas (fase 81): ornamen atau teks yang diberi gerak sendiri. Keping
 * ber-`data-iv-gerak` dikeluarkan dari koreografi bagiannya (`orchestrate`), jadi ia tidak pernah
 * bergerak dua kali dari dua sumber. `ease` dan durasi ikut preset, bukan pilihan bebas.
 */
export interface GerakKeping extends GerakMasuk {
  duration: number
  ease: string
}

export function gerakKeping(preset: string): GerakKeping | null {
  switch (preset) {
    case 'mekar': return { from: { scale: 0.5, opacity: 0, transformOrigin: '50% 100%' }, duration: 1.1, ease: 'expo.out' }
    case 'naik': return { from: { y: 26, opacity: 0 }, duration: 0.9, ease: 'power3.out' }
    case 'sapu': return { from: { x: -40, opacity: 0 }, duration: 0.9, ease: 'power3.out' }
    case 'iris': return { from: { opacity: 0 }, clip: IRIS_TEKS, duration: 1, ease: 'power2.inOut' }
    case 'jatuh': return { from: { y: -40, rotate: -4, opacity: 0, transformOrigin: '50% 0%' }, duration: 1.2, ease: 'power3.out' }
    case 'gambar': return { from: {}, clip: ['inset(0% 100% 100% 0%)', 'inset(0% 0% 0% 0%)'], duration: 1.4, ease: 'power1.out' }
    default: return null
  }
}
