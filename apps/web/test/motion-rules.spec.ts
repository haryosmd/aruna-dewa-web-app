import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const web = fileURLToPath(new URL('..', import.meta.url))
const baca = (rel: string) => readFileSync(web + rel, 'utf8')

/** Menelusuri satu direktori dan memilih berkas yang cocok — tanpa menambah dependensi. */
const cari = (dir: string, cocok: (nama: string) => boolean) =>
  readdirSync(web + dir, { recursive: true, encoding: 'utf8' })
    .filter(nama => cocok(nama.replaceAll('\\', '/')))
    .map(nama => `${dir}/${nama.replaceAll('\\', '/')}`)
    .sort()

/** Membuang komentar blok dan baris supaya pemindai tidak menangkap penjelasannya sendiri. */
const tanpaKomentar = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

/** Isi tiap blok `<style>` sebuah SFC, dengan `@keyframes` dibuang. */
function gayaIstirahat(source: string): string {
  const blok = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1] ?? '').join('\n')
  // `@keyframes … from { opacity: 0 }` adalah keadaan AWAL animasi, bukan keadaan istirahat
  // elemennya — animasinya berakhir terlihat. Yang dilarang adalah elemen yang diam-diam
  // bening sampai JavaScript datang menyelamatkannya.
  return blok.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
}

describe('aturan motion yang pernah menimbulkan bug produksi', () => {
  const berkasMotion = [
    'composables/useArunaMotion.ts',
    ...cari('utils', n => n.startsWith('motion-') && n.endsWith('.ts')),
  ]

  it('menemukan berkas motion yang dijaga', () => {
    expect(berkasMotion.length).toBeGreaterThanOrEqual(3)
  })

  /*
   * `once: true` membuat ScrollTrigger membunuh dirinya sendiri begitu menyala. Elemen yang
   * sudah di viewport saat mount menghapus diri dari daftar trigger global tepat ketika
   * trigger berikutnya sedang menyusuri daftar itu, `ScrollTrigger.init()` membaca
   * `_triggers[i].end` tanpa penjaga null, dan SELURUH motion halaman itu gagal dipasang.
   * Gejalanya hanya muncul pada navigasi klien, dan pernah lolos dari tes.
   *
   * `segue` dan `silhouette` sama-sama terbaca "sekali jalan", jadi godaannya nyata.
   */
  it.each(berkasMotion)('%s tidak memakai once: pada ScrollTrigger', (rel) => {
    expect(tanpaKomentar(baca(rel))).not.toMatch(/\bonce\s*:/)
  })

  /*
   * Markup undangan ditulis pada keadaan AKHIR; gerakannya murni `gsap.from`. Itu yang
   * membuat undangan tetap terbaca penuh tanpa JavaScript, dan yang membuat penjatuhan
   * trigger saat anggaran habis aman. Pita transisi yang "tak terlihat sampai disapu"
   * adalah cara paling wajar menulisnya, dan langsung melanggar aturan ini.
   */
  const komponenUndangan = cari('components/invitation', n => n.endsWith('.vue'))

  it('menemukan komponen undangan yang dijaga', () => {
    expect(komponenUndangan.length).toBeGreaterThanOrEqual(8)
  })

  it.each(komponenUndangan)('%s tidak menyembunyikan apa pun lewat CSS', (rel) => {
    const gaya = gayaIstirahat(baca(rel))
    expect(gaya).not.toMatch(/opacity\s*:\s*0\s*(?:;|\}|!)/)
    expect(gaya).not.toMatch(/visibility\s*:\s*hidden/)
  })
})
