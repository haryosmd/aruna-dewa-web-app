import { readFileSync, readdirSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { bangkitkan } from '../../../scripts/ornament-forge/forge.mjs'
import { PENANDA, dir, rakitGlyph } from '../../../scripts/ornament-forge/emit.mjs'

/**
 * Penjaga batas antara glyph yang dibangkitkan dan glyph yang tidak.
 *
 * `emit.mjs` sudah menyatakan alasannya sejak fase 41: berkas `.vue` hasil forge di-commit,
 * jadi suntingan tangan padanya akan hilang diam-diam pada `pnpm ornament:forge` berikutnya —
 * dan yang hilang adalah perbaikan yang sudah lolos tinjauan. Komentar itu menyebut tes ini
 * sebagai hal yang sudah ada. **Tes itu tidak pernah dibuat.** `bangkitkan()` tidak punya satu
 * pun pemanggil di luar CLI-nya sendiri, jadi selama 150 glyph hidup di pohon kerja, tidak ada
 * apa pun yang memeriksa apakah mereka masih sama dengan resep yang mengaku menghasilkannya.
 *
 * Berkas ini menutup lubang itu, dan ia dipasang SEBELUM pack ornamen mulai menulis komponen
 * ke direktori yang sama. Tanpanya, glyph pack dan glyph forge berbagi satu folder tanpa satu
 * pun aturan yang memisahkan mereka.
 */

const glyphs = bangkitkan() as unknown as {
  file: string
  viewBox: string
  komentar: string
  bagian: string[]
  props?: string | null
  glyph: string
  kategori: string
}[]

const baca = (file: string) => readFileSync(`${dir}${file}.vue`, 'utf8')

describe('glyph forge sama dengan resepnya', () => {
  it('membangkitkan sedikitnya enam kategori', () => {
    expect(new Set(glyphs.map(g => g.kategori)).size).toBeGreaterThanOrEqual(6)
    expect(glyphs.length).toBeGreaterThanOrEqual(77)
  })

  it.each(glyphs.map(g => [g.glyph, g] as const))(
    '%s ter-commit persis seperti yang dirakit resepnya',
    (id, g) => {
      /*
       * Pesan gagalnya sengaja menyebut jalan keluarnya, karena kegagalan di sini punya dua
       * sebab yang berlawanan dan obatnya berkebalikan: kalau resepnya yang berubah, jalankan
       * `pnpm ornament:forge --tulis`; kalau berkasnya yang disunting tangan, suntingan itu
       * yang harus pindah ke resep sebelum hilang.
       */
      expect(baca(g.file), `${id} (${g.file}.vue) menyimpang dari resepnya — jalankan \`pnpm ornament:forge --tulis\`, atau pindahkan suntingan tangannya ke resep`).toBe(rakitGlyph(g))
    },
  )
})

describe('batas namespace forge', () => {
  const berpenanda = readdirSync(dir)
    .filter(nama => nama.endsWith('.vue') && nama !== 'Glyph.vue')
    .filter(nama => readFileSync(dir + nama, 'utf8').includes(PENANDA))
    .map(nama => nama.slice(0, -4))
    .sort()

  const dariForge = glyphs.map(g => g.file).sort()

  /*
   * Dua arah, dan keduanya perlu.
   *
   * Arah pertama menangkap glyph yatim: berkas yang mengaku dibangkitkan forge padahal
   * resepnya sudah dicabut — ia akan selamanya lolos gerbang idempotensi di atas karena tidak
   * pernah ikut diperiksa. Arah kedua adalah yang menjaga pack: sebuah glyph yang diimpor dari
   * `packs/` tidak boleh membawa penanda forge, karena penanda itulah yang memberi izin kepada
   * `--tulis` untuk menimpanya tanpa bertanya.
   */
  it('tiap berkas berpenanda forge punya resep yang masih hidup', () => {
    expect(berpenanda.filter(f => !dariForge.includes(f))).toEqual([])
  })

  it('tiap glyph yang dibangkitkan forge membawa penandanya', () => {
    expect(dariForge.filter(f => !berpenanda.includes(f))).toEqual([])
  })
})
