import { extendTailwindMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'

/**
 * Ukuran huruf kustom kita, didaftarkan ke `tailwind-merge` (fase 77).
 *
 * Tanpa daftar ini `tailwind-merge` menggolongkan `text-ui` sebagai utilitas WARNA — ia tidak tahu
 * token mana yang ukuran dan mana yang warna, dan keduanya berejaan `text-…`. Akibatnya ia
 * menganggap `text-white` dan `text-ui` bertabrakan lalu membuang yang pertama, dan tombol primary
 * dasbor berganti jadi tinta gelap di atas terakota: kontras 3,45:1, tertangkap axe di e2e.
 *
 * Cacatnya **laten sejak token kustom pertama** — `text-caption text-ink-muted` lewat `cn()` sudah
 * kehilangan ukurannya sejak dulu. Yang membuatnya baru terlihat sekarang adalah arah kerugiannya:
 * ukuran yang hilang cuma terbaca sebagai huruf yang agak besar, warna yang hilang terbaca sebagai
 * kontras yang gagal. Daftar ini memperbaiki keduanya sekaligus.
 */
const ukuranHuruf = [
  'display-1', 'display-2', 'h1', 'h2', 'h3',
  'body-lg', 'body', 'ui-lg', 'ui', 'ui-label', 'caption', 'stat',
]

const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ukuranHuruf }] } },
})

/** Merge conditional classes and let later Tailwind utilities win over earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
