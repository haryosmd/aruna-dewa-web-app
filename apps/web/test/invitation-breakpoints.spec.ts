import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const web = fileURLToPath(new URL('..', import.meta.url))
const baca = (rel: string) => readFileSync(web + rel, 'utf8')
const cari = (dir: string, cocok: (nama: string) => boolean) =>
  readdirSync(web + dir, { recursive: true, encoding: 'utf8' })
    .filter(nama => cocok(nama.replaceAll('\\', '/')))
    .map(nama => `${dir}/${nama.replaceAll('\\', '/')}`)
    .sort()

/** Komentar dibuang lebih dulu — template Vue punya `<!-- -->` juga, dan isinya menyebut `@media`. */
const tanpaKomentar = (source: string) =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')

/*
 * "Undangannya sendiri sepenuhnya container query — nol breakpoint viewport" (DESIGN.md).
 *
 * Aturan ini dipatuhi seratus persen hari ini dan sampai sekarang tidak ada yang menjaganya.
 * `md:grid-cols-2` SELALU terlihat benar di editor pada layar 1440, dan pratinjau "Ponsel" akan
 * menampilkan tata letak yang tidak akan pernah dilihat tamu — gejalanya nol, jadi ia akan kembali
 * diam-diam. Cacat terakhirnya terukur: aturan kartu 480px ber-`@media` membuat tinggi render 1280
 * berubah 7210 → 8148 hanya karena jendela editornya menyempit.
 *
 * Gerbang teks-sumber, meniru `motion-rules.spec.ts`: ia memeriksa apa yang DITULIS, karena
 * membuktikannya dengan merender berarti membangun bundel di banyak lebar sekaligus.
 */
describe('undangan tetap nol breakpoint viewport', () => {
  const komponen = [
    ...cari('components/invitation', n => n.endsWith('.vue')),
    ...cari('components/ornament', n => n.endsWith('.vue')),
  ]

  it('menemukan komponen undangannya, bukan daftar kosong', () => {
    expect(komponen.length).toBeGreaterThanOrEqual(30)
  })

  it('tidak ada yang bertanya pada lebar viewport lewat @media', () => {
    // Yang dilarang HANYA `@media` berlebar. `@container (min-width: 40rem)` justru bentuk yang
    // benar dan hidup di sembilan berkas; `prefers-reduced-motion` dan `print` bukan lebar layar.
    const pelanggar = komponen.flatMap(rel =>
      [...tanpaKomentar(baca(rel)).matchAll(/@media[^{]*\{/g)]
        .map(m => m[0].trim())
        .filter(q => /(?:min|max)-(?:width|device-width)/.test(q))
        .map(q => `${rel}: ${q}`))
    expect(pelanggar, 'pakai @container pada pembungkusnya, bukan @media').toEqual([])
  })

  it('tidak ada yang memakai varian breakpoint Tailwind', () => {
    // Lookbehind `(?<![\w@[-])` melepaskan varian container (`@sm:`, `@min-[48rem]:`) dan potongan
    // kata; `2xl` didahulukan supaya `xl` tidak menyambar bagian tengahnya.
    const pelanggar = komponen.flatMap(rel =>
      [...tanpaKomentar(baca(rel)).matchAll(/(?<![\w@[-])(?:2xl|sm|md|lg|xl):(?=[a-z[])/g)]
        .map(m => `${rel}: ${m[0]}`))
    expect(pelanggar, 'pakai @min-[40rem]: / @min-[48rem]:, yang mengukur lebar undangan').toEqual([])
  })
})
