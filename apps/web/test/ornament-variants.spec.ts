import { liveTemplateIds } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { jalankan } from '../../../scripts/ornament-forge/verify.mjs'
import { isOrnamentId, ornament } from '../utils/ornaments'
import { semuaVarian, themeVariants, variantSlots, variantsFor } from '../utils/ornament-variants'
import { themeOrnaments } from '../utils/theme'

/**
 * Kolam varian, diukur — bukan dipercaya karena daftarnya terlihat masuk akal.
 *
 * Fitur ini bisa gagal dengan cara yang tidak terlihat dari kodenya: sebuah kandidat yang
 * ketebalan garisnya beda 0,5 akan tampak baik-baik saja di daftar, lolos typecheck, dan baru
 * terbaca salah saat seorang tamu melihat bingkai tipis di sebelah pemisah tebal. `ukur()`
 * adalah mesin yang sama yang dipakai `gerbangKohesi`, jadi kolam diukur dengan penggaris
 * yang sama dengan temanya.
 */
type Ukuran = { strokes: number[], punyaDraw: boolean, kategori: string }
const hasil = jalankan() as unknown as { ukuran: Record<string, Ukuran | undefined> }

/** Ketebalan garis yang dipakai sebelas keping bawaan sebuah tema. */
function strokeTema(tema: string): number[] {
  const set = themeOrnaments(tema)
  const dari = [set.frame, set.divider, set.corner, set.motif, set.symbol, set.seal]
  return [...new Set(dari.flatMap(glyph => hasil.ukuran[glyph]?.strokes ?? []))].sort()
}

describe('kolam varian ornamen', () => {
  it('menyediakan kolam untuk tiap tema hidup, tidak kurang satu slot pun', () => {
    expect(Object.keys(themeVariants).sort()).toEqual([...liveTemplateIds].sort())
    for (const tema of liveTemplateIds) {
      for (const slot of variantSlots) expect(variantsFor(tema, slot).length, `${tema}.${slot}`).toBeGreaterThan(1)
    }
  })

  it('menaruh bawaan tema di urutan pertama tiap kolam', () => {
    // Kalau keduanya boleh menyimpang, editor akan menandai "bawaan" pada glyph yang bukan.
    for (const tema of liveTemplateIds) {
      const set = themeOrnaments(tema)
      for (const slot of variantSlots) expect(variantsFor(tema, slot)[0], `${tema}.${slot}`).toBe(set[slot])
    }
  })

  it('tidak menawarkan glyph yang tidak terdaftar di bank', () => {
    for (const { tema, slot, glyph } of semuaVarian()) expect(isOrnamentId(glyph), `${tema}.${slot}=${glyph}`).toBe(true)
  })

  it('menawarkan glyph dari kategori slotnya sendiri', () => {
    for (const { tema, slot, glyph } of semuaVarian()) expect(ornament(glyph).category, `${tema}.${slot}=${glyph}`).toBe(slot)
  })

  it('tidak pernah menawarkan glyph yang sama dua kali dalam satu slot', () => {
    for (const tema of liveTemplateIds) {
      for (const slot of variantSlots) {
        const kolam = variantsFor(tema, slot)
        expect(new Set(kolam).size, `${tema}.${slot}`).toBe(kolam.length)
      }
    }
  })

  it('tidak pernah menawarkan glyph yang sama pada dua tema hidup', () => {
    /*
     * Gerbang keunikan forge menjaga glyph BAWAAN antar tema. Ia tidak pernah melihat kolam
     * varian — jadi tanpa tes ini dua tema hidup bisa menawarkan bingkai yang sama, dan dua
     * undangan bertema berbeda berakhir identik pada slot itu begitu pasangan memilihnya.
     * Aturan "tidak pernah berulang antar tema" runtuh lewat pintu yang tidak dijaga.
     */
    const pemilik = new Map<string, string>()
    for (const { tema, slot, glyph } of semuaVarian()) {
      const kunci = `${slot}:${glyph}`
      const sebelumnya = pemilik.get(kunci)
      expect(sebelumnya ?? tema, `${glyph} ditawarkan ${sebelumnya} dan ${tema}`).toBe(tema)
      pemilik.set(kunci, tema)
    }
  })

  it('hanya menawarkan glyph yang ketebalan garisnya sama dengan temanya', () => {
    /*
     * Gerbang yang sebenarnya. `gerbangKohesi` mengukur kesebelas keping BAWAAN sebuah tema;
     * ia tidak pernah melihat kolam varian, jadi tanpa tes ini fitur "pilih ornamen" bisa
     * mengembalikan persis ketidakcocokan yang dibangun forge untuk dihapus — lewat pintu
     * yang gerbangnya tidak menjaga.
     */
    for (const tema of liveTemplateIds) {
      const tebalTema = strokeTema(tema)
      expect(tebalTema.length, `${tema} sendiri tidak seragam`).toBe(1)
      for (const slot of variantSlots) {
        for (const glyph of variantsFor(tema, slot)) {
          // `strokes` mencatat tiap lapisan garis, jadi satu glyph bisa melaporkan [3, 3].
          // Yang dibandingkan nilainya, bukan berapa kali ia muncul.
          const tebal = [...new Set(hasil.ukuran[glyph]?.strokes ?? [])].sort()
          expect(tebal, `${tema}.${slot}=${glyph}`).toEqual(tebalTema)
        }
      }
    }
  })

  it('hanya menawarkan glyph yang punya lapisan garis', () => {
    // Syarat kedua `gerbangKohesi`: glyph tanpa `data-draw` tidak bisa ikut koreografi
    // DrawSVG dan terbaca sebagai bidang mati di antara tetangganya yang bergerak.
    for (const { tema, slot, glyph } of semuaVarian()) {
      expect(hasil.ukuran[glyph]?.punyaDraw, `${tema}.${slot}=${glyph}`).toBe(true)
    }
  })
})
